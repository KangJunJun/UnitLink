const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const client = new ftp.Client();
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
  client.ftp.verbose = true;

  try {
    runProgressbar();
    await client.access(ftpConfig);

    const playList = await getVideoFileList();
    const downloadList = await makeDownloadList(playList);

    // Set a new callback function which also resets the overall counter
    client.trackProgress(info => {
      console.log(info.bytesOverall);
      if (downloadList.totalSize > 0)
        progressBar.value = Math.floor((info.bytesOverall / downloadList.totalSize) * 100);
    });

    deleteDontPlayFile(playList);

    for (const downloadFile of downloadList.pathList) {
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

async function ensureLocalDirectory(path) {
  try {
    await fsStat(path);
  } catch (err) {
    await fsMkDir(path, { recursive: true });
  }
}

async function makeDownloadList(playList) {
  const advSet = new Set(playList.map(m => m.AdvertiserId.toString()));
  const uniqeuAdv = [...advSet]; //중복 제거
  const downloadList = {
    pathList: [],
    totalSize: 0,
  };
  //let downloadList = [];
  //let totalSize = 0;

  for (const adv of uniqeuAdv) {
    const localDirPath = path.join(localVideoPath, adv);
    await ensureLocalDirectory(localDirPath);
    const localFiles = fs.readdirSync(localDirPath);

    let files = await client.list(path.join(adv, '/'));
    files = files.filter(el => playList.map(m => m.Name).includes(el.name));

    files = files.filter(el => !localFiles.includes(el.name));
    downloadList.totalSize = files.reduce((sum, a) => sum + a.size, 0);
    downloadList.pathList.push(...files.map(m => path.join(adv, m.name)));
  }

  return downloadList;
}

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
