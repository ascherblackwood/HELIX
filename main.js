const { app, BrowserWindow } = require('electron');
const path = require('path');

// Import all handler modules
const { registerAuthHandlers } = require(path.join(__dirname, 'handlers', 'auth'));
const { registerUserHandlers } = require(path.join(__dirname, 'handlers', 'users'));
const { registerComputerHandlers } = require(path.join(__dirname, 'handlers', 'computers'));
const { registerGroupHandlers } = require(path.join(__dirname, 'handlers', 'groups'));
const { registerSystemHandlers } = require(path.join(__dirname, 'handlers', 'system'));
const { registerLdapHandlers } = require(path.join(__dirname, 'handlers', 'ldap'));

// More reliable isDev detection for packaged apps
const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'ActV',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'src/assets/actv.ico'),
    titleBarStyle: 'default',
    show: false
  });

  const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './build/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register all IPC handlers
function registerAllHandlers() {
  console.log('Registering IPC handlers...');

  registerAuthHandlers();
  registerUserHandlers();
  registerComputerHandlers();
  registerGroupHandlers();
  registerSystemHandlers();
  registerLdapHandlers();

  console.log('All IPC handlers registered successfully');
}

app.whenReady().then(() => {
  createWindow();
  registerAllHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});