const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const ftpConfig = require(path.join(__dirname, '../config/ftp-config.json'));
//const ftpConfig = require('../config/ftp-config.json');
const { getVideoFileList } = require('./db');
const ProgressBar = require('electron-progressbar');
const util = require('util');
const fsMkDir = util.promisify(fs.mkdir);
const fsStat = util.promisify(fs.stat);
const localVideoPath = path.join(__dirname, '../video/');
const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.file.file = __dirname + 'log.log';

let progressBar;
function runProgressbar() {
  progressBar = new ProgressBar({
    title: 'Download',
    text: 'Video Downloading...',
    detail: 'Wait...',
    indeterminate: false,
    browserWindow: {
      width: 500,
      icon: path.join(__dirname, '../unitlink.ico'),
    },
  });

  progressBar
    .on('completed', function () {
      console.info(`completed...`);
      progressBar.detail = 'Task completed. Exiting...';
    })
    .on('progress', function (value) {
      progressBar.detail = ` ${value} %`;
    })
    .on('aborted', function () {
      console.info(`aborted...`);
    });
}

async function downloadFile() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    runProgressbar();
    await client.access(ftpConfig);

    const playList = await getVideoFileList();
    const advSet = new Set(playList.map(m => m.AdvertiserId.toString()));
    const uniqeuAdv = [...advSet]; //중복 제거
    let downloadList = [];
    let totalSize = 0;

    for (const adv of uniqeuAdv) {
      const localDirPath = path.join(localVideoPath, adv);
      await ensureLocalDirectory(localDirPath);
      const localFiles = fs.readdirSync(localDirPath);

      let files = await client.list(path.join(adv, '/'));
      files = files.filter(el => playList.map(m => m.Name).includes(el.name));

      files = files.filter(el => !localFiles.includes(el.name));
      totalSize = files.reduce((sum, a) => sum + a.size, 0);
      downloadList.push(...files.map(m => path.join(adv, m.name)));
    }

    // Set a new callback function which also resets the overall counter
    client.trackProgress(info => {
      console.log(info.bytesOverall);
      if (totalSize > 0) progressBar.value = Math.floor((info.bytesOverall / totalSize) * 100);
    });

    deleteDontPlayFile(playList);

    for (const downloadFile of downloadList) {
      await client.downloadTo(path.join(localVideoPath, downloadFile), downloadFile);
    }

    // Stop logging
    client.trackProgress();
  } catch (err) {
    console.log(err);
    log.info('vedio download error');
  }
  client.close();
  progressBar.setCompleted();
}

// async function downloadToDir(localDirPath, remoteDirPath, client) {
//   return exitAtCurrentDirectory(async () => {
//     if (remoteDirPath) {
//       await client.cd(remoteDirPath);
//     }
//     return await downloadFromWorkingDir(localDirPath, client);
//   }, client);
// }

// async function downloadFromWorkingDir(localDirPath, client) {
//   await ensureLocalDirectory(localDirPath);
//   for (const file of await client.list()) {
//     const localPath = path.join(localDirPath, file.name);
//     if (file.isDirectory) {
//       await client.cd(file.name);
//       await downloadFromWorkingDir(localPath, client);
//       await client.cdup();
//     } else if (file.isFile && !fs.existsSync(localPath)) {
//       await client.downloadTo(localPath, file.name);
//     }
//   }
// }
async function ensureLocalDirectory(path) {
  try {
    await fsStat(path);
  } catch (err) {
    await fsMkDir(path, { recursive: true });
  }
}

// async function exitAtCurrentDirectory(func, client) {
//   const userDir = await client.pwd();
//   try {
//     return await func();
//   } finally {
//     if (!client.closed) {
//       await client.cd(userDir);
//     }
//   }
// }

async function deleteDontPlayFile(playList) {
  const dontPlayList = [];
  for (const file of fs.readdirSync(localVideoPath)) {
    const filePath = path.join(localVideoPath, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      const localFiles = fs.readdirSync(filePath);
      const selectedPlayList = playList.filter(x => x.AdvertiserId == file).map(m => m.Name);
      const dontPlayFiles = localFiles
        .filter(fileName => !selectedPlayList.includes(fileName))
        .map(m => path.join(filePath, m));

      dontPlayList.push(...dontPlayFiles);
    }
  }
  dontPlayList.forEach(filePath => fs.unlinkSync(filePath));
}

module.exports = {
  downloadFile,
};
