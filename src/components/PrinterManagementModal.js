import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, PrinterIcon, PlusIcon } from '@heroicons/react/24/outline';

const PrinterManagementModal = ({ isOpen, onClose }) => {
  const [servers, setServers] = useState([
    { institutionName: 'Pelican Bay', serverName: '\\\\pbp01pacfp01' }
  ]);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newInstitutionName, setNewInstitutionName] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (selectedServerIndex === -1) {
      alert('Please select a valid server.');
      return;
    }

    const selectedServer = servers[selectedServerIndex];
    setLoading(true);
    setPrinters([]);

    try {
      const result = await window.electronAPI.getPrinters(
        selectedServer.serverName,
        searchQuery
      );

      if (result.success) {
        setPrinters(result.printers || []);
      } else {
        setPrinters([]);
        alert(`Error: ${result.error || 'Failed to load printers'}`);
      }
    } catch (error) {
      setPrinters([]);
      alert('Failed to fetch printers');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!selectedPrinter || selectedPrinter === 'No printers found' || selectedPrinter === 'Loading...') {
      alert('Please select a valid printer to install.');
      return;
    }

    const selectedServer = servers[selectedServerIndex];
    const printerPath = `${selectedServer.serverName}\\${selectedPrinter}`;

    try {
      const result = await window.electronAPI.installPrinter(printerPath);
      if (result.success) {
        alert(`Printer "${selectedPrinter}" installed successfully!`);
      } else {
        alert(`Failed to install printer: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to install printer');
    }
  };

  const handleAddServer = () => {
    if (!newInstitutionName.trim() || !newServerName.trim()) {
      alert('Both fields are required!');
      return;
    }

    let serverName = newServerName.trim();
    if (!serverName.startsWith('\\\\')) {
      serverName = `\\\\${serverName}`;
    }

    setServers([...servers, { institutionName: newInstitutionName, serverName }]);
    setNewInstitutionName('');
    setNewServerName('');
    setShowAddServer(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-100 to-teal-700 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-700 hover:text-gray-900"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <PrinterIcon className="w-7 h-7" />
            Printer Management
          </h2>
        </div>

        {/* Add Server Modal */}
        {showAddServer && (
          <div className="mb-4 p-4 bg-white rounded-lg border-2 border-teal-600">
            <h3 className="font-bold text-gray-900 mb-3">Add New Server</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Institution Name:
                </label>
                <input
                  type="text"
                  value={newInstitutionName}
                  onChange={(e) => setNewInstitutionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Pelican Bay"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Server Name:
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., \\pbp01pacfp01"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddServer}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddServer(false)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!showAddServer && (
          <div className="space-y-4">
            {/* Print Server Selection */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Select a Print Server:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedServerIndex}
                  onChange={(e) => setSelectedServerIndex(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  {servers.map((server, index) => (
                    <option key={index} value={index}>
                      {server.institutionName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddServer(true)}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  title="Add New Server"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Search Printer:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Search for a printer..."
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  Search
                </button>
              </div>
            </div>

            {/* Printers List */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Available Printers:
              </label>
              <div className="bg-white rounded-lg border border-gray-300 h-64 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Loading...
                  </div>
                ) : printers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No printers found. Click Search to load printers.
                  </div>
                ) : (
                  <div className="divide-y">
                    {printers.map((printer, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedPrinter(printer)}
                        className={`px-4 py-3 cursor-pointer hover:bg-teal-50 ${
                          selectedPrinter === printer ? 'bg-teal-100 font-semibold' : ''
                        }`}
                      >
                        {printer}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleInstall}
                disabled={!selectedPrinter || loading}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Install Selected Printer
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterManagementModal;
