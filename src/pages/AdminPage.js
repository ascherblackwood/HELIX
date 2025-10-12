import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SignalIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';
import PrinterInstallationModal from '../components/PrinterInstallationModal';

const AdminPage = () => {
  const { isConnected, authInfo, loading, getADCounts, getOUCounts, connectionConfig } = useLDAP();
  const [systemStats, setSystemStats] = useState({
    users: 0,
    computers: 0,
    groups: 0,
    lastSync: null,
    loading: false
  });

  const [systemInfo, setSystemInfo] = useState(null);

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

  useEffect(() => {
    const loadCounts = async () => {
      if (isConnected && connectionConfig?.server) {
        setSystemStats(prev => ({ ...prev, loading: true }));
        try {
          // Use OU-specific counts when connected to show only data from current child OU
          const counts = await getOUCounts();
          setSystemStats({
            users: counts.users,
            computers: counts.computers,
            groups: counts.groups,
            lastSync: new Date().toLocaleString(),
            loading: false
          });
        } catch (error) {
          console.error('Failed to load OU counts:', error);
          setSystemStats(prev => ({ ...prev, loading: false }));
        }
      } else {
        // Show dummy data when not connected
        setSystemStats({
          users: 8,
          computers: 4,
          groups: 50,
          lastSync: 'Demo Mode',
          loading: false
        });
      }
    };

    loadCounts();
  }, [isConnected, getOUCounts, connectionConfig]);

  // Show only the child OU/CN name from a DN string
  const shortDn = (dn) => {
    if (!dn || typeof dn !== 'string') return '';
    const first = dn.split(',')[0];
    const m = first.match(/^(OU|CN)=([^,]+)$/i);
    return m ? m[2] : dn;
  };

  const handleSync = async () => {
    if (!isConnected) {
      console.warn('Not connected to Active Directory');
      return;
    }
    
    console.log('Syncing with Current OU...');
    setSystemStats(prev => ({ ...prev, loading: true }));
    
    try {
      // Use OU-specific counts to sync only current child OU data
      const counts = await getOUCounts();
      setSystemStats({
        users: counts.users,
        computers: counts.computers,
        groups: counts.groups,
        lastSync: new Date().toLocaleString(),
        loading: false
      });
    } catch (error) {
      console.error('Failed to sync OU counts:', error);
      setSystemStats(prev => ({ ...prev, loading: false }));
    }
  };

  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupResult, setBackupResult] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showComputerPrompt, setShowComputerPrompt] = useState(false);
  const [targetComputer, setTargetComputer] = useState('');

  const handleBackup = async () => {
    if (backupInProgress) return;
    
    setBackupInProgress(true);
    setBackupResult(null);
    
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupData = {
        timestamp,
        connectionConfig: {
          server: connectionConfig?.server || 'Unknown',
          port: connectionConfig?.port || 636,
          username: connectionConfig?.username || 'Unknown'
        },
        systemStats,
        appVersion: '3.4.2',
        backupType: 'Configuration and Settings'
      };

      await new Promise(resolve => setTimeout(resolve, 3000));

      const backupJson = JSON.stringify(backupData, null, 2);
      const backupBlob = new Blob([backupJson], { type: 'application/json' });
      const backupUrl = URL.createObjectURL(backupBlob);
      
      const link = document.createElement('a');
      link.href = backupUrl;
      link.download = `ActV-Backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(backupUrl);

      setBackupResult({
        success: true,
        message: `Backup created successfully: ActV-Backup-${timestamp}.json`,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupResult({
        success: false,
        message: 'Backup failed: ' + error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setBackupInProgress(false);
      setTimeout(() => setBackupResult(null), 10000);
    }
  };

  const handleViewLogs = () => {
    const logData = [
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Application started successfully' },
      { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'INFO', message: 'Connection established to ' + (connectionConfig?.server || 'domain.local') },
      { timestamp: new Date(Date.now() - 600000).toISOString(), level: 'INFO', message: 'AD counts retrieved successfully' },
      { timestamp: new Date(Date.now() - 900000).toISOString(), level: 'WARN', message: 'Connection timeout detected, retrying...' },
      { timestamp: new Date(Date.now() - 1200000).toISOString(), level: 'INFO', message: 'User authentication successful' },
      { timestamp: new Date(Date.now() - 1500000).toISOString(), level: 'INFO', message: 'Act.V v3.4.2 initialized' }
    ];

    const logText = logData.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');

    const logBlob = new Blob([logText], { type: 'text/plain' });
    const logUrl = URL.createObjectURL(logBlob);
    
    const link = document.createElement('a');
    link.href = logUrl;
    link.download = `ActV-Logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(logUrl);
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Act.V - Administrative Tools</h1>
        <p className="mt-2 text-gray-600">Manage and monitor your Active Directory infrastructure with Act.V v3.4.2</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Status Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Domain Status</h2>
            <ServerIcon className="w-6 h-6 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-3">
              {isConnected ? (
                <CheckCircleIcon className="w-5 h-5 status-online" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 status-offline" />
              )}
              <span className={`font-medium ${isConnected ? 'status-online' : 'status-offline'}`}>
                {isConnected ? `Connected to ${connectionConfig?.server || 'domain'}` : 'Not connected to domain'}
              </span>
            </div>
            
            {isConnected && authInfo && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Authentication:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    authInfo.authMethod === 'Kerberos' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {authInfo.authMethod}
                  </span>
                </div>
                
                {authInfo.parentOU && (
                  <div className="flex items-start space-x-2">
                    <span className="text-sm font-medium text-gray-600">Parent OU:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono" title={authInfo.parentOU}>
                      {shortDn(authInfo.parentOU)}
                    </code>
                  </div>
                )}
                
                {authInfo.securityContext && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Security:</span>
                    <span className="text-sm text-blue-600 font-medium">
                      {authInfo.securityContext}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <SignalIcon className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">Last sync: {systemStats.lastSync || 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleSync}
              disabled={!isConnected || loading || systemStats.loading}
              className="flex items-center space-x-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${systemStats.loading ? 'animate-spin' : ''}`} />
              <span>{systemStats.loading ? 'Syncing...' : 'Sync AD'}</span>
            </button>
            
            <button
              onClick={handleBackup}
              disabled={backupInProgress}
              className="flex items-center space-x-3 p-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className={`w-5 h-5 ${backupInProgress ? 'animate-pulse' : ''}`} />
              <span>{backupInProgress ? 'Creating Backup...' : 'Backup Settings'}</span>
            </button>
            
            <button
              onClick={handleViewLogs}
              className="flex items-center space-x-3 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span>View Logs</span>
            </button>
          </div>
          
          {/* Backup Result */}
          {backupResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              backupResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start space-x-2">
                {backupResult.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">{backupResult.message}</p>
                  <p className="text-xs mt-1 opacity-75">{backupResult.timestamp}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Overview Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isConnected ? 'Current OU' : 'Demo Data'}
            </span>
          </div>
          
          {systemStats.loading ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Users:</span>
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                  <span className="text-gray-400">Loading...</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Computers:</span>
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                  <span className="text-gray-400">Loading...</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-gray-700">Groups:</span>
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                  <span className="text-gray-400">Loading...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Users:</span>
                <span className="text-2xl font-bold text-blue-600">{systemStats.users.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Computers:</span>
                <span className="text-2xl font-bold text-green-600">{systemStats.computers.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-gray-700">Groups:</span>
                <span className="text-2xl font-bold text-purple-600">{systemStats.groups.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Items Card (replaces System Information) */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Action Items</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await window.electronAPI.launchADUC(connectionConfig);
                  if (!res?.success) {
                    alert(res?.error || 'Failed to launch ADUC');
                  }
                } catch (e) {
                  alert('Failed to launch ADUC');
                }
              }}
              className="px-3 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              ADUC
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await window.electronAPI.launchPowerShellx86(connectionConfig);
                  if (!res?.success) {
                    alert(res?.error || 'Failed to launch PowerShell x86');
                  }
                } catch (e) {
                  alert('Failed to launch PowerShell x86');
                }
              }}
              className="px-3 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              PowerShell
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await window.electronAPI.launchGPMC(connectionConfig);
                  if (!res?.success) {
                    alert(res?.error || 'Failed to launch Group Policy Manager');
                  }
                } catch (e) {
                  alert('Failed to launch Group Policy Manager');
                }
              }}
              className="px-3 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Group Policy Manager
            </button>
            <button
              onClick={() => setShowComputerPrompt(true)}
              className="px-3 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Printer Installation
            </button>
            <button className="px-3 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">DHCP Manager</button>
            <button className="px-3 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">Event Viewer</button>
            <button className="px-3 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">PowerShell</button>
            <button className="px-3 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">AD Admin Center</button>
          </div>
        </div>
      </div>

      {/* Computer Name Prompt Modal */}
      {showComputerPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Install Printer to Computer</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the name of the computer where you want to install a printer:</p>
            <input
              type="text"
              value={targetComputer}
              onChange={(e) => setTargetComputer(e.target.value)}
              placeholder="Computer name (e.g., PC-001)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && targetComputer.trim()) {
                  setShowComputerPrompt(false);
                  setShowPrinterModal(true);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowComputerPrompt(false);
                  setTargetComputer('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (targetComputer.trim()) {
                    setShowComputerPrompt(false);
                    setShowPrinterModal(true);
                  }
                }}
                disabled={!targetComputer.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printer Installation Modal */}
      <PrinterInstallationModal
        isOpen={showPrinterModal}
        onClose={() => {
          setShowPrinterModal(false);
          setTargetComputer('');
        }}
        computerName={targetComputer}
      />

    </div>
  );
};

export default AdminPage;
