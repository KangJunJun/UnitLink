const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const ftpConfig = require('../config/ftp-config.json');
const ProgressBar = require('electron-progressbar');
const util = require('util');
const fsMkDir = util.promisify(fs.mkdir);
const fsStat = util.promisify(fs.stat);
const localVideoPath = path.join(__dirname, '../video/');
const { createIntroWindow } = require('./mainModule');
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
    let downList;
    let totalSize = 0;
    let dirList = await client.list();
    log.info('vedio download list');
    for (const dir of dirList) {
      let files = await client.list(path.join(dir.name, '/'));
      const localDirPath = path.join(localVideoPath, dir.name);
      await ensureLocalDirectory(localDirPath);
      const localFiles = fs.readdirSync(localDirPath);
      files = files.filter(el => !localFiles.includes(el.name));
      totalSize = files.reduce((sum, a) => sum + a.size, 0);
      files.forEach(x => log.info(x.name));
    }

    // Set a new callback function which also resets the overall counter
    client.trackProgress(info => {
      console.log(info.bytesOverall);
      if (totalSize > 0) progressBar.value = Math.floor((info.bytesOverall / totalSize) * 100);
    });

    await downloadToDir(localVideoPath, './', client);

    // Stop logging
    client.trackProgress();
  } catch (err) {
    console.log(err);
    log.info('vedio download error');
  }
  client.close();
  progressBar.setCompleted();
}

async function downloadToDir(localDirPath, remoteDirPath, client) {
  return exitAtCurrentDirectory(async () => {
    if (remoteDirPath) {
      await client.cd(remoteDirPath);
    }
    return await downloadFromWorkingDir(localDirPath, client);
  }, client);
}

async function downloadFromWorkingDir(localDirPath, client) {
  await ensureLocalDirectory(localDirPath);
  for (const file of await client.list()) {
    const localPath = path.join(localDirPath, file.name);
    if (file.isDirectory) {
      await client.cd(file.name);
      await downloadFromWorkingDir(localPath, client);
      await client.cdup();
    } else if (file.isFile && !fs.existsSync(localPath)) {
      await client.downloadTo(localPath, file.name);
    }
  }
}
async function ensureLocalDirectory(path) {
  try {
    await fsStat(path);
  } catch (err) {
    await fsMkDir(path, { recursive: true });
  }
}

async function exitAtCurrentDirectory(func, client) {
  const userDir = await client.pwd();
  try {
    return await func();
  } finally {
    if (!client.closed) {
      await client.cd(userDir);
    }
  }
}

module.exports = {
  downloadFile,
};
