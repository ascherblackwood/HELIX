const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // LDAP Operations
  connectToLDAP: (config) => {
    // If Kerberos requested or kerberosOnly enforced, use dedicated Kerberos route
    if (config?.useKerberos || config?.kerberosOnly) {
      return ipcRenderer.invoke('ldap-connect-kerberos', config);
    }
    return ipcRenderer.invoke('ldap-connect', config);
  },
  searchLDAP: (config, searchOptions) => ipcRenderer.invoke('ldap-search', config, searchOptions),
  
  // System Operations
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getADCounts: (config) => ipcRenderer.invoke('get-ad-counts', config),
  getOUTree: (config) => ipcRenderer.invoke('get-ou-tree', config),
  
  // User Management Operations
  createADUser: (config, userData) => ipcRenderer.invoke('create-ad-user', config, userData),
  createADGroup: (config, groupData) => ipcRenderer.invoke('create-ad-group', config, groupData),
  updateADUser: (config, userData) => ipcRenderer.invoke('update-ad-user', config, userData),
  resetADPassword: (config, userData) => ipcRenderer.invoke('reset-ad-password', config, userData),
  toggleADUserAccount: (config, userData) => ipcRenderer.invoke('toggle-ad-user-account', config, userData),
  addUserToGroup: (config, userData) => ipcRenderer.invoke('add-user-to-group', config, userData),
  removeUserFromGroup: (config, userData) => ipcRenderer.invoke('remove-user-from-group', config, userData),
  
  // Computer Management Operations
  createADComputer: (config, computerData) => ipcRenderer.invoke('create-ad-computer', config, computerData),
  updateADComputer: (config, computerData) => ipcRenderer.invoke('update-ad-computer', config, computerData),
  deleteADComputer: (config, computerData) => ipcRenderer.invoke('delete-ad-computer', config, computerData),
  
  // Remote Management Operations
  testWinRM: (computerName) => ipcRenderer.invoke('test-winrm', computerName),
  enableWinRM: (computerName) => ipcRenderer.invoke('enable-winrm', computerName),
  installPrinter: (computerName, printerIP, printerName) => ipcRenderer.invoke('install-printer', computerName, printerIP, printerName),
  checkPsExec: () => ipcRenderer.invoke('check-psexec'),
  // Inventory
  getComputerInventory: (computerName) => ipcRenderer.invoke('get-computer-inventory', computerName),
  
  // User Profile Management
  getUserProfiles: (computerName) => ipcRenderer.invoke('get-user-profiles', computerName),
  deleteUserProfiles: (computerName, selectedProfiles) => ipcRenderer.invoke('delete-user-profiles', computerName, selectedProfiles),
  rebootComputer: (computerName) => ipcRenderer.invoke('reboot-computer', computerName),
  getDiskSpace: (computerName) => ipcRenderer.invoke('get-disk-space', computerName),
  
  // Printer Server Management
  testPrinterServer: (serverPath) => ipcRenderer.invoke('test-printer-server', serverPath),
  openPrinterServer: (serverPath) => ipcRenderer.invoke('open-printer-server', serverPath),
  getPrinters: (serverName, searchQuery) => ipcRenderer.invoke('get-printers', serverName, searchQuery),
  installPrinter: (printerPath) => ipcRenderer.invoke('install-printer', printerPath),
  
  // File System Access
  openComputerCDrive: (computerName) => ipcRenderer.invoke('open-computer-c-drive', computerName),

  // Remote Desktop Connection
  connectRDP: (computerName) => ipcRenderer.invoke('connect-rdp', computerName),
  
  // Admin Utilities
  launchADUC: (config) => ipcRenderer.invoke('launch-aduc', config),
  launchPowerShellx86: (config) => ipcRenderer.invoke('launch-powershell-x86', config),

  // Remote session utilities
  logoffUserSession: (computerName, username) => ipcRenderer.invoke('logoff-user-session', computerName, username),
  
  // Window Operations
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close')
});
