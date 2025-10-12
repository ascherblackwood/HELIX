import React, { useState, useEffect } from 'react';
import { 
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  PrinterIcon,
  PlusIcon,
  TrashIcon,
  FolderOpenIcon,
  EyeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';
import { useTheme, themes } from '../contexts/ThemeContext';

const SettingsPage = () => {
  const { connect, disconnect, isConnected, connectionConfig, loading, error } = useLDAP();
  const { currentTheme, changeTheme } = useTheme();
  const [config, setConfig] = useState({
    server: 'dc1.domain.local',
    port: 636,  // Default to LDAPS (secure)
    username: 'admin@domain.local',
    password: '',
    parentOU: '',
    useKerberos: false,
    useSSL: true  // Enable SSL/TLS by default
  });
  const [appSettings, setAppSettings] = useState({
    autoSync: true,
    showSystemAccounts: false,
    detailedLogging: true,
    syncInterval: 15
  });
  const [printerServers, setPrinterServers] = useState([
    { id: 1, name: 'PRINTSERVER01', path: '\\\\PRINTSERVER01', status: 'connected', printers: 45 },
    { id: 2, name: 'PRINTSERVER02', path: '\\\\PRINTSERVER02', status: 'disconnected', printers: 23 }
  ]);
  const [newServerPath, setNewServerPath] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [showOUBrowser, setShowOUBrowser] = useState(false);
  const [ouTree, setOuTree] = useState([]);
  const [expandedOUs, setExpandedOUs] = useState(new Set());

  useEffect(() => {
    if (connectionConfig.server) {
      setConfig(connectionConfig);
    }
  }, [connectionConfig]);

  useEffect(() => {
    const getSystemInfo = async () => {
      try {
        const info = await window.electronAPI.getSystemInfo();
        setSystemInfo(info);
      } catch (error) {
        console.error('Failed to get system info:', error);
      }
    };

    getSystemInfo();
  }, []);

  const handleConfigChange = (field, value) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [field]: value
      };
      
      // Enable Kerberos authentication when parent OU is selected
      if (field === 'parentOU') {
        newConfig.useKerberos = value.trim() !== '';
      }
      
      return newConfig;
    });
    setTestResult(null);
  };

  const handleAppSettingChange = (setting, value) => {
    setAppSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await connect(config);
    setTestResult(result);
    
    if (!result.success) {
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const [saveResult, setSaveResult] = useState(null);

  const handleSaveSettings = () => {
    try {
      // Save app settings to localStorage
      localStorage.setItem('ctrl-app-settings', JSON.stringify(appSettings));
      
      // Create settings backup file
      const settingsData = {
        timestamp: new Date().toISOString(),
        appSettings,
        connectionConfig: {
          server: config.server,
          username: config.username,
          useSSL: true,
          port: 636 // LDAPS enforced
        },
        version: '3.4.2'
      };

      const settingsJson = JSON.stringify(settingsData, null, 2);
      const settingsBlob = new Blob([settingsJson], { type: 'application/json' });
      const settingsUrl = URL.createObjectURL(settingsBlob);
      
      const link = document.createElement('a');
      link.href = settingsUrl;
      link.download = `ActV-Settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(settingsUrl);

      setSaveResult({
        success: true,
        message: 'Settings saved successfully and exported as backup file'
      });
      
      setTimeout(() => setSaveResult(null), 5000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveResult({
        success: false,
        message: 'Failed to save settings: ' + error.message
      });
      setTimeout(() => setSaveResult(null), 5000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setTestResult(null);
  };

  const handleClearSavedSettings = () => {
    localStorage.removeItem('ctrl-connection-config');
    // Reset to secure default values
    setConfig({
      server: 'dc1.domain.local',
      port: 636,  // LDAPS (secure) by default
      username: 'admin@domain.local',
      password: '',
      parentOU: '',
      useKerberos: false,
      useSSL: true  // Enable SSL/TLS by default
    });
    setTestResult({ success: true, message: 'Saved settings cleared. Connection settings reset to defaults.' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleAddPrinterServer = async () => {
    if (!newServerPath.trim()) return;
    
    const serverPath = newServerPath.trim();
    const serverName = serverPath.replace(/\\\\/g, '').toUpperCase();
    
    // Test connection to printer server
    try {
      const testConnection = await window.electronAPI?.testPrinterServer?.(serverPath);
      
      const newServer = {
        id: Date.now(),
        name: serverName,
        path: serverPath,
        status: testConnection?.success ? 'connected' : 'disconnected',
        printers: testConnection?.printers || 0
      };
      
      setPrinterServers(prev => [...prev, newServer]);
      setNewServerPath('');
    } catch (error) {
      console.error('Failed to add printer server:', error);
      const newServer = {
        id: Date.now(),
        name: serverName,
        path: serverPath,
        status: 'error',
        printers: 0
      };
      setPrinterServers(prev => [...prev, newServer]);
      setNewServerPath('');
    }
  };

  const handleRemovePrinterServer = (serverId) => {
    setPrinterServers(prev => prev.filter(server => server.id !== serverId));
  };

  const handleTestPrinterServer = async (server) => {
    setPrinterServers(prev => 
      prev.map(s => 
        s.id === server.id 
          ? { ...s, status: 'testing' }
          : s
      )
    );
    
    try {
      const result = await window.electronAPI?.testPrinterServer?.(server.path);
      
      setPrinterServers(prev => 
        prev.map(s => 
          s.id === server.id 
            ? { 
                ...s, 
                status: result?.success ? 'connected' : 'disconnected',
                printers: result?.printers || s.printers
              }
            : s
        )
      );
    } catch (error) {
      setPrinterServers(prev => 
        prev.map(s => 
          s.id === server.id 
            ? { ...s, status: 'error' }
            : s
        )
      );
    }
  };

  const handleBrowsePrinterServer = async (server) => {
    try {
      await window.electronAPI?.openPrinterServer?.(server.path);
    } catch (error) {
      console.error('Failed to open printer server:', error);
    }
  };

  const handleBrowseOUs = async () => {
    if (!isConnected) {
      setTestResult({ success: false, error: 'Not connected to Active Directory' });
      return;
    }

    try {
      setShowOUBrowser(true);
      setOuTree([]); // Clear existing tree
      
      // Query real OU tree from the connected domain controller
      const result = await window.electronAPI.getOUTree(connectionConfig);
      
      if (result.success) {
        setOuTree(result.data);
        // Auto-expand the root domain
        if (result.data.length > 0) {
          setExpandedOUs(new Set([result.data[0].dn]));
        }
      } else {
        setTestResult({ success: false, error: result.error || 'Failed to load organizational units' });
        setShowOUBrowser(false);
      }
    } catch (error) {
      console.error('Failed to load OU tree:', error);
      setTestResult({ success: false, error: 'Failed to load organizational units from domain controller' });
      setShowOUBrowser(false);
    }
  };

  const toggleOUExpanded = (dn) => {
    const newExpanded = new Set(expandedOUs);
    if (newExpanded.has(dn)) {
      newExpanded.delete(dn);
    } else {
      newExpanded.add(dn);
    }
    setExpandedOUs(newExpanded);
  };

  const selectOU = (dn) => {
    handleConfigChange('parentOU', dn);
    setShowOUBrowser(false);
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure Active Directory connection and application preferences</p>
      </div>

      <div className="space-y-6">
        {/* Active Directory Connection */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ServerIcon className="w-6 h-6 text-gray-500" />
              <h2 className="text-xl font-semibold text-gray-900">Active Directory Connection</h2>
            </div>
            {isConnected && connectionConfig?.server && (
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 status-online" />
                <span className="text-sm font-medium status-online">Connected to {connectionConfig.server}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain Controller
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) => handleConfigChange('server', e.target.value)}
                placeholder="dc1.domain.local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secure Connection
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-green-50 flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">🔒 LDAPS (Port 636) - Secure Connection Enforced</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                All connections use secure LDAPS (SSL/TLS) encryption on port 636.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                placeholder="admin@domain.local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => handleConfigChange('password', e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                🔒 Username and connection settings are automatically saved after successful connection. Password is never stored.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent OU (Organizational Unit)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={config.parentOU}
                  onChange={(e) => handleConfigChange('parentOU', e.target.value)}
                  placeholder="OU=Users,DC=domain,DC=local (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleBrowseOUs}
                  disabled={!isConnected}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  title="Browse Organizational Units"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Browse</span>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When specified, Kerberos authentication will be automatically enabled for enhanced security. Click Browse to select from available OUs.
              </p>
            </div>
          </div>

          {/* Kerberos Authentication Indicator */}
          {config.useKerberos && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800">
                  Kerberos Authentication Enabled
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Using secure Kerberos authentication for parent OU: <code className="bg-blue-100 px-1 rounded">{config.parentOU}</code>
              </p>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <XCircleIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {testResult.success ? 'Connection successful!' : `Connection failed: ${testResult.error}`}
              </span>
            </div>
          )}

          {error && !testResult && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 flex items-center space-x-2">
              <XCircleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Error: {error}</span>
            </div>
          )}

          {/* Save Result */}
          {saveResult && (
            <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
              saveResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {saveResult.success ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <XCircleIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{saveResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <ServerIcon className="w-5 h-5" />
              <span>{loading ? 'Testing...' : 'Test Connection'}</span>
            </button>
            
            <button
              onClick={handleSaveSettings}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              <span>Save</span>
            </button>

            <button
              onClick={handleClearSavedSettings}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              title="Clear saved username and connection settings"
            >
              <TrashIcon className="w-5 h-5" />
              <span>Clear Saved</span>
            </button>

            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <XCircleIcon className="w-5 h-5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* Application Settings */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Cog6ToothIcon className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable automatic synchronization</h3>
                <p className="text-sm text-gray-500">Automatically sync with AD at regular intervals</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appSettings.autoSync}
                  onChange={(e) => handleAppSettingChange('autoSync', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Show system accounts</h3>
                <p className="text-sm text-gray-500">Display built-in system accounts in user lists</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appSettings.showSystemAccounts}
                  onChange={(e) => handleAppSettingChange('showSystemAccounts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable detailed logging</h3>
                <p className="text-sm text-gray-500">Log detailed information for troubleshooting</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appSettings.detailedLogging}
                  onChange={(e) => handleAppSettingChange('detailedLogging', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Sync interval (minutes)</h3>
                <p className="text-sm text-gray-500">How often to automatically sync with AD</p>
              </div>
              <input
                type="number"
                min="1"
                max="1440"
                value={appSettings.syncInterval}
                onChange={(e) => handleAppSettingChange('syncInterval', parseInt(e.target.value))}
                className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Printer Servers */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <PrinterIcon className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">Printer Servers</h2>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Add printer servers to browse and install network printers. Use UNC paths like \\servername\ to connect.
            </p>
            
            {/* Add New Server */}
            <div className="flex space-x-3">
              <input
                type="text"
                value={newServerPath}
                onChange={(e) => setNewServerPath(e.target.value)}
                placeholder="\\\\PRINTSERVER01 or \\\\192.168.1.100"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPrinterServer()}
              />
              <button
                onClick={handleAddPrinterServer}
                disabled={!newServerPath.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Server</span>
              </button>
            </div>
          </div>

          {/* Server List */}
          <div className="space-y-4">
            {printerServers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <ServerIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{server.path}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        {server.status === 'connected' && (
                          <CheckCircleIcon className="w-4 h-4 status-online" />
                        )}
                        {server.status === 'disconnected' && (
                          <XCircleIcon className="w-4 h-4 status-offline" />
                        )}
                        {server.status === 'testing' && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {server.status === 'error' && (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          server.status === 'connected' ? 'status-online' :
                          server.status === 'disconnected' ? 'status-offline' :
                          server.status === 'testing' ? 'text-blue-600' :
                          'text-red-500'
                        }`}>
                          {server.status === 'testing' ? 'Testing...' : 
                           server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                        </span>
                      </div>
                      {server.status === 'connected' && (
                        <span className="text-sm text-gray-600">
                          {server.printers} printer{server.printers !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBrowsePrinterServer(server)}
                    disabled={server.status !== 'connected'}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
                  >
                    <FolderOpenIcon className="w-4 h-4" />
                    <span>Browse</span>
                  </button>
                  
                  <button
                    onClick={() => handleTestPrinterServer(server)}
                    disabled={server.status === 'testing'}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
                  >
                    <ServerIcon className="w-4 h-4" />
                    <span>Test</span>
                  </button>
                  
                  <button
                    onClick={() => handleRemovePrinterServer(server.id)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}

            {printerServers.length === 0 && (
              <div className="text-center py-8">
                <PrinterIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Printer Servers</h3>
                <p className="text-gray-600">Add a printer server to browse and install network printers</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Printer Server Access</h4>
                <p className="text-sm text-yellow-600 mt-1">
                  • Use UNC paths like \\servername\ or \\IP-address\<br/>
                  • Ensure you have permissions to access the print server<br/>
                  • Browse will open the server in Windows File Explorer<br/>
                  • Connected servers will show available printer count
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Elemental Themes */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <PaintBrushIcon className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">Elemental Themes</h2>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">Choose an elemental theme to personalize your experience</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(themes).map(([themeKey, theme]) => (
              <div
                key={themeKey}
                onClick={() => changeTheme(themeKey)}
                className={`relative cursor-pointer rounded-lg p-4 border-2 transition-all duration-200 hover:scale-105 ${
                  currentTheme === themeKey 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`,
                  borderColor: currentTheme === themeKey ? theme.colors.primary[500] : undefined
                }}
              >
                {currentTheme === themeKey && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-3xl mb-2">{theme.icon}</div>
                  <h3 
                    className="font-semibold text-lg mb-1"
                    style={{ color: theme.colors.text.primary }}
                  >
                    {theme.name}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: theme.colors.text.muted }}
                  >
                    {theme.description}
                  </p>
                </div>

                {/* Color Palette Preview */}
                <div className="flex justify-center space-x-1 mt-3">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-200" 
                    style={{ backgroundColor: theme.colors.primary[500] }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-200" 
                    style={{ backgroundColor: theme.colors.secondary[500] }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-200" 
                    style={{ backgroundColor: theme.colors.accent[500] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Theme Preview</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Your selected theme will be applied throughout the application. The theme preference is automatically saved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {systemInfo && (
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <InformationCircleIcon className="w-6 h-6 text-gray-500" />
              <h2 className="text-xl font-semibold text-gray-900">About</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-medium">{systemInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build:</span>
                  <span className="font-medium">2024.01.001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform:</span>
                  <span className="font-medium capitalize">{systemInfo.platform}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Electron:</span>
                  <span className="font-medium">v{systemInfo.electronVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Node.js:</span>
                  <span className="font-medium">v{systemInfo.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hostname:</span>
                  <span className="font-medium">{systemInfo.hostname}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OU Browser Modal */}
      {showOUBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Browse Organizational Units</h3>
              <button
                onClick={() => setShowOUBrowser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select an Organizational Unit from your Active Directory structure:
              </p>

              <div className="space-y-1">
                {ouTree.map(ou => (
                  <OUTreeNode
                    key={ou.dn}
                    ou={ou}
                    level={0}
                    expanded={expandedOUs}
                    onToggle={toggleOUExpanded}
                    onSelect={selectOU}
                  />
                ))}
              </div>

              {ouTree.length === 0 && (
                <div className="text-center py-8">
                  <FolderIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Loading organizational units...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowOUBrowser(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleConfigChange('parentOU', '');
                  setShowOUBrowser(false);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// OU Tree Node Component
const OUTreeNode = ({ ou, level, expanded, onToggle, onSelect }) => {
  const hasChildren = ou.children && ou.children.length > 0;
  const isExpanded = expanded.has(ou.dn);
  const indent = level * 24;

  const getIcon = () => {
    if (ou.type === 'domain') return '🌐';
    if (ou.type === 'ou') return '📁';
    if (ou.type === 'container') return '📂';
    return '📄';
  };

  return (
    <div>
      <div 
        className="flex items-center space-x-2 py-2 px-2 hover:bg-gray-50 rounded cursor-pointer"
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(ou.dn)} className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}
        
        <span className="text-lg">{getIcon()}</span>
        
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onSelect(ou.dn)}
            className="text-left w-full"
          >
            <div className="font-medium text-gray-900 truncate">{ou.name}</div>
            <div className="text-xs text-gray-500 truncate font-mono">{ou.dn}</div>
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {ou.children.map(child => (
            <OUTreeNode
              key={child.dn}
              ou={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
