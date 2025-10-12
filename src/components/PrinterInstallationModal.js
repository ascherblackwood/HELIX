import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PrinterIcon,
  ServerIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const PrinterInstallationModal = ({ isOpen, onClose, computerName }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    colors: {
      primary: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb' },
      background: '#ffffff',
      border: '#e5e7eb',
      text: { primary: '#111827', secondary: '#6b7280', muted: '#9ca3af' },
      gray: { 200: '#e5e7eb' }
    }
  };
  const [printServers, setPrintServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Default system printers to filter out
  const systemPrinters = [
    'Microsoft Print to PDF',
    'Microsoft XPS Document Writer',
    'Adobe PDF',
    'Fax',
    'OneNote',
    'Send To OneNote'
  ];

  useEffect(() => {
    if (isOpen) {
      loadPrintServers();
    }
  }, [isOpen]);

  const loadPrintServers = async () => {
    try {
      // Load saved print servers from localStorage (saved by Settings page)
      const saved = localStorage.getItem('actv_print_servers');
      if (saved) {
        const servers = JSON.parse(saved);
        // Extract just the server names from the Settings page format
        const serverNames = servers.map(s => s.name || s);
        setPrintServers(serverNames);
      } else {
        setPrintServers([]);
      }
    } catch (error) {
      console.error('Failed to load print servers:', error);
      setPrintServers([]);
    }
  };


  const handleServerSelect = async (serverName) => {
    setSelectedServer(serverName);
    setLoading(true);
    setPrinters([]);
    setStatusMessage(null);

    try {
      const result = await window.electronAPI.getPrintersFromServer(serverName);

      if (result.success && result.printers) {
        // Filter out system printers
        const filteredPrinters = result.printers.filter(printer => {
          const printerName = printer.name || printer;
          return !systemPrinters.some(sysPrinter =>
            printerName.toLowerCase().includes(sysPrinter.toLowerCase())
          );
        });

        setPrinters(filteredPrinters);

        if (filteredPrinters.length === 0) {
          setStatusMessage({
            type: 'info',
            text: 'No network printers found on this server'
          });
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to retrieve printers from server'
        });
      }
    } catch (error) {
      console.error('Failed to get printers:', error);
      setStatusMessage({
        type: 'error',
        text: 'Failed to connect to print server'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPrinter = async (printer) => {
    const printerName = printer.name || printer;
    const printerPath = `\\\\${selectedServer}\\${printerName}`;

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await window.electronAPI.installPrinter(computerName, printerPath);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `Printer "${printerName}" installed successfully on ${computerName}`
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to install printer'
        });
      }
    } catch (error) {
      console.error('Failed to install printer:', error);
      setStatusMessage({
        type: 'error',
        text: 'Failed to install printer'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPrinters = printers.filter(printer => {
    const printerName = (printer.name || printer).toLowerCase();
    return printerName.includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[100] }}
            >
              <PrinterIcon
                className="w-6 h-6"
                style={{ color: theme.colors.primary[600] }}
              />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: theme.colors.text.primary }}
              >
                Install Network Printer
              </h2>
              <p
                className="text-sm"
                style={{ color: theme.colors.text.muted }}
              >
                Install printer on {computerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" style={{ color: theme.colors.text.muted }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Left Panel - Print Servers */}
          <div
            className="w-80 border-r p-4 overflow-y-auto"
            style={{ borderColor: theme.colors.border }}
          >
            <div className="mb-4">
              <h3
                className="font-semibold"
                style={{ color: theme.colors.text.primary }}
              >
                Print Servers
              </h3>
              <p className="text-xs mt-1" style={{ color: theme.colors.text.muted }}>
                Manage servers in Settings page
              </p>
            </div>

            {/* Server List */}
            <div className="space-y-2">
              {printServers.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: theme.colors.text.muted }}>
                  No print servers configured.<br />Add servers in Settings page.
                </p>
              ) : (
                printServers.map((server) => (
                  <div
                    key={server}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedServer === server ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedServer === server
                        ? theme.colors.primary[50]
                        : 'transparent',
                      ringColor: selectedServer === server ? theme.colors.primary[500] : 'transparent'
                    }}
                    onClick={() => handleServerSelect(server)}
                  >
                    <div className="flex items-center space-x-2">
                      <ServerIcon
                        className="w-5 h-5"
                        style={{ color: theme.colors.primary[600] }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: theme.colors.text.primary }}
                      >
                        {server}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Printers */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!selectedServer ? (
              <div className="flex flex-col items-center justify-center h-full">
                <ServerIcon
                  className="w-16 h-16 mb-4"
                  style={{ color: theme.colors.text.muted }}
                />
                <p
                  className="text-lg font-medium"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Select a print server
                </p>
                <p
                  className="text-sm"
                  style={{ color: theme.colors.text.muted }}
                >
                  Choose a print server to browse available printers
                </p>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                      style={{ color: theme.colors.text.muted }}
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search printers..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background
                      }}
                    />
                  </div>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div
                    className={`mb-4 p-3 rounded-lg flex items-start space-x-2 ${
                      statusMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
                      statusMessage.type === 'error' ? 'bg-red-50 border border-red-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ExclamationCircleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        statusMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    )}
                    <p
                      className={`text-sm ${
                        statusMessage.type === 'success' ? 'text-green-800' :
                        statusMessage.type === 'error' ? 'text-red-800' :
                        'text-blue-800'
                      }`}
                    >
                      {statusMessage.text}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {loading && printers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ArrowPathIcon
                      className="w-12 h-12 animate-spin mb-4"
                      style={{ color: theme.colors.primary[600] }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: theme.colors.text.muted }}
                    >
                      Loading printers from {selectedServer}...
                    </p>
                  </div>
                ) : filteredPrinters.length === 0 && !statusMessage ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <PrinterIcon
                      className="w-16 h-16 mb-4"
                      style={{ color: theme.colors.text.muted }}
                    />
                    <p
                      className="text-lg font-medium"
                      style={{ color: theme.colors.text.secondary }}
                    >
                      No printers found
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: theme.colors.text.muted }}
                    >
                      {searchTerm ? 'Try adjusting your search' : 'No network printers available on this server'}
                    </p>
                  </div>
                ) : (
                  /* Printer List */
                  <div className="space-y-2">
                    {filteredPrinters.map((printer, index) => {
                      const printerName = printer.name || printer;
                      return (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:shadow-md transition-all group"
                          style={{ borderColor: theme.colors.border }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <PrinterIcon
                                className="w-6 h-6"
                                style={{ color: theme.colors.primary[600] }}
                              />
                              <div>
                                <p
                                  className="font-medium"
                                  style={{ color: theme.colors.text.primary }}
                                >
                                  {printerName}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: theme.colors.text.muted }}
                                >
                                  \\{selectedServer}\{printerName}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleInstallPrinter(printer)}
                              disabled={loading}
                              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              style={{ backgroundColor: theme.colors.primary[600] }}
                            >
                              {loading ? 'Installing...' : 'Install'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterInstallationModal;
