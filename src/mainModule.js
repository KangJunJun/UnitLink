const { BrowserWindow, powerMonitor, powerSaveBlocker, Menu, app, screen } = require('electron');
const { queryDatabase } = require('./db');
const { getFilePathList } = require('./fileService');
const path = require('path');
const screenSaver = 'screenSaver';

let powerSaveBlockId = 0;
let timerStartFlag = false;
let timer;
let mainWindow;
function createMainWindow() {
  // Create the browser window.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(__dirname, '../unitlink.ico'),
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

    //mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, './view/optionForm.html'));
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else mainWindow.show();
}
async function test() {
  //ConnectionPool();
  const bb = await queryDatabase();
  mainWindow.webContents.send('DataSend', bb);
}
function createVideoWindow(fileList, bounds) {
  let videoWindow = new BrowserWindow({
    title: screenSaver,
    width: 1000,
    height: 600,
    fullscreen: true,
    show: false,
    icon: path.join(__dirname, '../unitlink.ico'),
    x: bounds?.x ?? 0 + 50,
    y: bounds?.y ?? 0 + 50,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  //videoWindow.webContents.openDevTools();
  videoWindow.setMenu(null);
  videoWindow.loadFile(path.join(__dirname, './view/video.html'));
  videoWindow.setAlwaysOnTop(true, 'screen-saver');
  videoWindow.setVisibleOnAllWorkspaces(true);
  videoWindow.on('closed', () => (videoWindow = null));

  videoWindow.once('ready-to-show', () => {
    videoWindow.show();
    videoWindow.webContents.send('setFileList', fileList);
  });
}

async function setScreeSaver(settingTime) {
  const idleTime = powerMonitor.getSystemIdleTime();
  const screenSaverWins = BrowserWindow.getAllWindows().filter(win => win.title == screenSaver);
  console.log(idleTime);
  if (idleTime >= settingTime && screenSaverWins.length === 0) {
    powerSaveBlockId = powerSaveBlocker.start('prevent-display-sleep'); // 절전모드 차단
    let fileList = await getFilePathList(path.join(__dirname, '../video'));
    shuffle(fileList);
    // 듀얼이상 모니터 사용을 위함
    for (const display of screen.getAllDisplays()) {
      createVideoWindow(fileList, display.bounds);
    }
  } else if (idleTime === 0 && screenSaverWins.length > 0) {
    powerSaveBlocker.isStarted(powerSaveBlockId) && powerSaveBlocker.stop(powerSaveBlockId); // 절전모드 차단 해제
    for (const win of screenSaverWins) {
      win.title == screenSaver && win.close();
    }
  }
}

function shuffle(array) {
  let tmp,
    current,
    top = array.length;
  if (top)
    while (--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
  return array;
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
    click: () => timerStart(3), // 추후 변수로 변경
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

module.exports = {
  timerStart,
  timerStop,
  contextMenu,
  mainWindow,
  createMainWindow,
  test,
};
