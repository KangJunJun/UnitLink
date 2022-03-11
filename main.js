// Modules to control application life and create native browser window
const {
  app,
  screen,
  BrowserWindow,
  ipcMain,
  Tray,
  dialog,
} = require('electron');
// 기존에 작성된 require() 구문 생략...
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { ConnectionPool } = require('./db');
const fs = require('fs');
const path = require('path');
const {
  timerStop,
  timerStart,
  contextMenu,
  mainWindow,
  readDirectory,
  createMainWindow,
  test,
} = require('./mainModule');
let tray;
let settingTime = 3; // 추후 DB나 레지스트리 등으로 초기값 셋팅
let folderPath = path.join(__dirname, './video');

/* Updater ======================================================*/

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});
autoUpdater.on('update-available', info => {
  log.info('Update available.');
});
autoUpdater.on('update-not-available', info => {
  log.info('latest version.');
});
autoUpdater.on('error', err => {
  log.info('error in auto-updater. error : ' + err);
});
autoUpdater.on('download-progress', progressObj => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message =
    log_message +
    ' (' +
    progressObj.transferred +
    '/' +
    progressObj.total +
    ')';
  log.info(log_message);
});
autoUpdater.on('update-downloaded', info => {
  log.info('Update downloaded.');
});
/* Updater ======================================================*/

ipcMain.on('exit-app', (event, arg) => {
  app.quit();
});

ipcMain.on('test-app', (event, arg) => {
  test();
});

ipcMain.on('timerStart', (event, arg) => {
  timerStart(settingTime);
});

ipcMain.on('timerStop', (event, arg) => {
  timerStop();
});

ipcMain.on('save', (event, arg) => {
  settingTime = arg;
});

ipcMain.on('select-dirs', async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    // filters: [{ name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] }],
  });

  console.log('directories selected', result.filePaths);
  folderPath = path.join(__dirname, result.filePaths);
});

ipcMain.on('getFileList', (event, arg) => {
  readDirectory(folderPath);
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.whenReady().then(() => {
  // 자동 업데이트 등록
  autoUpdater.checkForUpdates();

  const displays = screen.getAllDisplays();
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  ConnectionPool();
  tray = new Tray(path.join(__dirname, 'unitlink.ico'));
  tray.setToolTip('Unit Link');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createMainWindow());
  timerStart(settingTime);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
