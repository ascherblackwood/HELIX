const { app, BrowserWindow } = require('electron');
const path = require('path');

// Import all handler modules
const { registerAuthHandlers } = require('./handlers/auth');
const { registerUserHandlers } = require('./handlers/users');
const { registerComputerHandlers } = require('./handlers/computers');
const { registerGroupHandlers } = require('./handlers/groups');
const { registerSystemHandlers } = require('./handlers/system');
const { registerLdapHandlers } = require('./handlers/ldap');

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

  console.log('Registering auth handlers...');
  registerAuthHandlers();

  console.log('Registering user handlers...');
  registerUserHandlers();

  console.log('Registering computer handlers...');
  registerComputerHandlers();

  console.log('Registering group handlers...');
  registerGroupHandlers();

  console.log('Registering system handlers...');
  registerSystemHandlers();

  console.log('Registering LDAP handlers...');
  registerLdapHandlers();

  console.log('All IPC handlers registered successfully');
}

app.whenReady().then(() => {
  registerAllHandlers();
  createWindow();
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