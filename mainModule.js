const { BrowserWindow, powerMonitor, Menu, app } = require('electron');
const { queryDatabase } = require('./db');
const fs = require('fs');
const path = require('path');
let timerStartFlag = false;
let videoWindow;
let timer;
let mainWindow;

function createMainWindow() {
  // Create the browser window.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        // preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    mainWindow.once('ready-to-show', () => {
      queryDatabase().then(data => {
        mainWindow.webContents.send('DataSend', data);
      });
    });

    // and load the index.html of the app.
    //mainWindow.setMenu(null);
    // mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.loadFile('./view/optionForm.html');
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else mainWindow.show();
}
async function test() {
  //ConnectionPool();
  const bb = await queryDatabase();
  mainWindow.webContents.send('DataSend', bb);
}
function createVideoWindow() {
  videoWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    fullscreen: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  //videoWindow.webContents.openDevTools();
  videoWindow.setMenu(null);
  videoWindow.loadFile('./view/video.html');
  videoWindow.on('closed', () => {
    videoWindow = null;
  });
  videoWindow.once('ready-to-show', () => {
    videoWindow.show();
  });
}

function setScreeSaver(settingTime) {
  const idleTime = powerMonitor.getSystemIdleTime();
  console.log(idleTime);
  if (idleTime >= settingTime && videoWindow == null) {
    createVideoWindow();
  } else if (idleTime === 0 && videoWindow != null) {
    videoWindow.close();
  }
}

function flagOnOff(action) {
  if (timerStartFlag !== action) {
    timerStartFlag = action;
    contextMenu.items[2].checked = timerStartFlag;
    contextMenu.items[3].checked = !timerStartFlag;
    return true;
  }
  return false;
}

function timerStart(settingTime) {
  if (flagOnOff(true)) {
    clearInterval(timer);
    timer = setInterval(() => {
      setScreeSaver(settingTime);
    }, 1000);
  }
}
function timerStop() {
  if (flagOnOff(false)) {
    clearInterval(timer);
  }
}

const contextMenu = Menu.buildFromTemplate([
  { label: '환경설정', type: 'normal', click: () => createMainWindow() },
  { type: 'separator' },
  {
    label: '시작',
    type: 'checkbox',
    checked: true,
    click: () => timerStart(),
  },
  {
    label: '정지',
    type: 'checkbox',
    checked: false,
    click: () => timerStop(),
  },
  { type: 'separator' },
  { label: '닫기', type: 'normal', click: () => app.quit() },
]);

// read all files in "mp4" directory
function readDirectory(dir) {
  fs.readdir(dir, (e, files) => {
    // On error, show and return error
    filesList = files.filter(function (e) {
      return path.extname(e).toLowerCase() === '.mp4';
    });

    videoWindow.webContents.send('setFileList', filesList);
    //mainWindow.webContents.send('setFileList', filesList);
  });
}

module.exports = {
  timerStart,
  timerStop,
  contextMenu,
  mainWindow,
  readDirectory,
  createMainWindow,
  test,
};
