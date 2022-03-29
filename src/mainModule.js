const { BrowserWindow, powerMonitor, powerSaveBlocker, Menu, app, screen } = require('electron');
const { queryDatabase } = require('./db');
const { getFilePathList } = require('./fileService');
const path = require('path');
const screenSaver = 'screenSaver';
const optionWindowTitle = 'UnitLink Option Form';

let powerSaveBlockId = 0;
let timerStartFlag = false;
let timer;
let optionWindow;
function createOptionWindow() {
  // Create the browser window.
  if (BrowserWindow.getAllWindows().filter(win => win.title == optionWindowTitle).length === 0) {
    optionWindow = new BrowserWindow({
      title: optionWindowTitle,
      width: 800,
      height: 600,
      icon: path.join(__dirname, '../unitlink.ico'),
      webPreferences: {
        // preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    optionWindow.once('ready-to-show', () => {
      queryDatabase().then(data => {
        optionWindow.webContents.send('DataSend', data);
      });
    });

    //optionWindow.setMenu(null);
    optionWindow.loadFile(path.join(__dirname, './view/optionForm.html'));
    // Open the DevTools.
    optionWindow.webContents.openDevTools();
  } else optionWindow.show();
}

function createIntroWindow() {
  // Create the browser window.
  //if (BrowserWindow.getAllWindows().length === 0) {
  const introWindow = new BrowserWindow({
    width: 600,
    height: 200,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    titleBarStyle: 'hidden',
    hasShadow: true,
    icon: path.join(__dirname, '../unitlink.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  introWindow.webContents.on('did-finish-load', () => {
    introWindow.show();
    fadeWindowOut(introWindow, 0.02, 10, 3);
  });

  //optionWindow.setMenu(null);
  introWindow.loadFile(path.join(__dirname, './view/intro.html'));
  // Open the DevTools.
  //introWindow.webContents.openDevTools();
  //}
}
async function test() {
  //ConnectionPool();
  const bb = await queryDatabase();
  optionWindow.webContents.send('DataSend', bb);
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
    //videoWindow.webContents.send('setFileList', path.join(__dirname));
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
  { label: '환경설정', type: 'normal', click: () => createOptionWindow() },
  { type: 'separator' },
  {
    label: '시작',
    type: 'checkbox',
    checked: true,
    click: () => timerStart(global.settingTime), // 추후 변수로 변경
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

const fadeWindowOut = (browserWindow, step = 0.1, fadeEveryXSeconds = 2, initKeep = 1) => {
  let opacity = browserWindow.getOpacity();
  let keep = initKeep;
  // fadeEveryXSeconds 를 주기로 step에 맞게 단계를 나눠 fade 시킨다.
  const interval = setInterval(() => {
    // 투명도가 0이 되면 종료
    if (opacity <= 0) {
      clearInterval(interval);
      browserWindow.close();
      return interval;
    }
    browserWindow.setOpacity(opacity);
    // keep 만큼 시간이 지난 후 Fade를 진행한다.
    if (keep <= 0) opacity -= step;
    else keep -= step;
  }, fadeEveryXSeconds);

  return interval;
};

module.exports = {
  timerStart,
  timerStop,
  contextMenu,
  optionWindow,
  createOptionWindow,
  createIntroWindow,
  test,
};
