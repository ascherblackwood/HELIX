import React, { useEffect, useState } from 'react';
import { useLDAP } from '../contexts/LDAPContext';
import {
  XMarkIcon,
  ComputerDesktopIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  WifiIcon,
  ArrowPathIcon,
  PencilIcon,
  ComputerDesktopIcon as RemoteIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';

const ComputerDetailModal = ({ computer, isOpen, onClose }) => {
  const { isConnected, connectionConfig } = useLDAP();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState(computer?.description || '');
  const [inv, setInv] = useState(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [invError, setInvError] = useState('');
  const [invFetchedAt, setInvFetchedAt] = useState('');
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printerInstallStatus, setPrinterInstallStatus] = useState('');
  const [printerSearchTerm, setPrinterSearchTerm] = useState('');
  
  // User Profiles state
  const [showUserProfilesModal, setShowUserProfilesModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [profilesError, setProfilesError] = useState('');
  const [deletingProfiles, setDeletingProfiles] = useState(false);
  
  // Disk space state
  const [diskSpace, setDiskSpace] = useState([]);
  const [loadingDiskSpace, setLoadingDiskSpace] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchInv = async (manual = false) => {
      if (!isOpen || !computer?.computerName) return;
      setLoadingInv(true);
      setInvError('');
      try {
        const res = await window.electronAPI?.getComputerInventory?.(computer.computerName);
        if (!mounted) return;
        if (res?.success) {
          setInv(res.data);
          setInvFetchedAt(new Date().toLocaleString());
        } else if (manual) {
          setInvError(res?.error || 'Failed to fetch inventory');
        }
      } catch (e) {
        if (mounted) setInvError(e.message);
      } finally {
        if (mounted) setLoadingInv(false);
      }
    };
    fetchInv(false);
    // store refresh on function prop for reuse
    (ComputerDetailModal.__refreshInv = fetchInv);
    return () => { mounted = false; };
  }, [isOpen, computer?.computerName]);

  const handleRefreshInventory = async () => {
    if (typeof ComputerDetailModal.__refreshInv === 'function') {
      await ComputerDetailModal.__refreshInv(true);
    }
  };

  if (!isOpen || !computer) return null;

  const getStatusIcon = (status) => {
    return status === 'Active' ? (
      <CheckCircleIcon className="w-5 h-5 status-online" />
    ) : (
      <XCircleIcon className="w-5 h-5 status-offline" />
    );
  };

  const getComputerIcon = () => {
    if (computer.os?.toLowerCase().includes('server')) {
      return <ServerIcon className="w-8 h-8 text-blue-600" />;
    }
    return <ComputerDesktopIcon className="w-8 h-8 text-blue-600" />;
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'Never' || dateString === 'N/A') return dateString;
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const [updatingDesc, setUpdatingDesc] = useState(false);
  const [actionStatus, setActionStatus] = useState('');
  const handleUpdateDescription = async () => {
    if (!isEditingDescription) {
      setIsEditingDescription(true);
      return;
    }
    // Save description to AD
    if (!isConnected || !connectionConfig) {
      setIsEditingDescription(false);
      return;
    }
    try {
      setUpdatingDesc(true);
      const res = await window.electronAPI.updateADComputer(connectionConfig, {
        computerName: computer.computerName,
        field: 'description',
        value: tempDescription || ''
      });
      if (res?.success) {
        setActionStatus('Description saved to Active Directory');
        setIsEditingDescription(false);
      } else {
        setActionStatus(`Failed to save description: ${res?.error || 'Unknown error'}`);
      }
    } catch (e) {
      setActionStatus(`Failed to save description: ${e.message}`);
    } finally {
      setUpdatingDesc(false);
      setTimeout(() => setActionStatus(''), 6000);
    }
  };

  const handleRestartComputer = async () => {
    const confirmed = window.confirm(`Are you sure you want to restart ${computer.computerName}? This will force a reboot and may interrupt any running processes.`);
    if (!confirmed) return;
    
    try {
      setActionStatus('Sending reboot command...');
      const result = await window.electronAPI?.rebootComputer?.(computer.computerName);
      if (result?.success) {
        setActionStatus(`Reboot command sent to ${computer.computerName}`);
      } else {
        setActionStatus(`Failed to reboot: ${result?.error || 'Unknown error'}`);
      }
    } catch (e) {
      setActionStatus(`Error rebooting computer: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 6000);
    }
  };

  const handleEnableWinRM = async () => {
    try {
      setActionStatus('Checking WinRM connectivity...');
      const test = await window.electronAPI?.testWinRM?.(computer.computerName);
      if (test?.success) {
        setActionStatus('WinRM is already enabled and reachable.');
        setTimeout(() => setActionStatus(''), 4000);
        return;
      }
      setActionStatus('Attempting to enable WinRM remotely...');
      const enable = await window.electronAPI?.enableWinRM?.(computer.computerName);
      if (enable?.success) {
        setActionStatus('WinRM enabled. Re-testing connectivity...');
        const test2 = await window.electronAPI?.testWinRM?.(computer.computerName);
        if (test2?.success) {
          setActionStatus('WinRM is enabled and reachable.');
        } else {
          setActionStatus('WinRM enabled, but connection test still failed. Ensure firewall allows WinRM.');
        }
      } else {
        setActionStatus(`Failed to enable WinRM: ${enable?.error || 'Unknown error'}`);
      }
    } catch (e) {
      setActionStatus(`Error enabling WinRM: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 6000);
    }
  };

  const handleRemoteIn = async () => {
    try {
      setActionStatus('Initiating RDP connection...');
      const result = await window.electronAPI?.connectRDP?.(computer.computerName);
      if (result?.success) {
        setActionStatus(`RDP connection initiated to ${computer.computerName}`);
      } else {
        setActionStatus(`Failed to connect via RDP: ${result?.error || 'Unknown error'}`);
      }
    } catch (e) {
      setActionStatus(`Error connecting via RDP: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 4000);
    }
  };

  const handleDeleteComputer = async () => {
    console.log('=== FRONTEND DELETE BUTTON CLICKED ===');
    console.log('Computer:', computer?.computerName);
    console.log('Connection status:', isConnected);

    // First confirmation dialog
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to delete computer "${computer.computerName}" from Active Directory?\n\n` +
      `This action will:\n` +
      `• Permanently remove the computer object from AD\n` +
      `• Remove all group memberships\n` +
      `• Cannot be undone\n\n` +
      `Click OK to proceed with deletion.`
    );

    if (!confirmed) {
      console.log('User cancelled deletion at first prompt');
      return;
    }

    // Second confirmation - require typing computer name
    const confirmName = window.prompt(
      `To confirm deletion, please type the computer name exactly as shown:\n\n${computer.computerName}`
    );

    if (confirmName !== computer.computerName) {
      setActionStatus('❌ Deletion cancelled - computer name did not match');
      setTimeout(() => setActionStatus(''), 4000);
      return;
    }

    // Check connection status
    if (!isConnected || !connectionConfig) {
      setActionStatus('❌ Error: Not connected to Active Directory');
      setTimeout(() => setActionStatus(''), 4000);
      return;
    }

    try {
      setActionStatus('🔄 Deleting computer from Active Directory...');
      console.log('Starting delete operation with config:', {
        server: connectionConfig?.server,
        hasUsername: !!connectionConfig?.username
      });

      const result = await window.electronAPI?.deleteADComputer?.(connectionConfig, {
        computerName: computer.computerName
      });

      console.log('Delete operation result:', result);

      if (result?.success) {
        setActionStatus(`✅ Computer ${computer.computerName} successfully deleted from Active Directory`);
        // Close modal and refresh after successful deletion
        setTimeout(() => {
          onClose();
          if (window.location.pathname === '/computers') {
            window.location.reload();
          }
        }, 2000);
      } else {
        const errorMsg = result?.error || 'Unknown error occurred';
        console.error('Delete operation failed:', errorMsg);
        setActionStatus(`❌ Failed to delete computer: ${errorMsg}`);
      }
    } catch (e) {
      console.error('Frontend exception during delete:', e);
      setActionStatus(`❌ Error deleting computer: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 10000);
    }
  };

  const handleOpenCDrive = async () => {
    try {
      setActionStatus('Attempting C$ access with multiple authentication methods...');
      const result = await window.electronAPI?.openComputerCDrive?.(computer.computerName);
      if (result?.success) {
        setActionStatus(`✓ ${result.message}`);
      } else {
        const errorMsg = result?.error || 'Unknown error';
        if (errorMsg.includes('administrative privileges')) {
          setActionStatus(`⚠ Access Denied: ${errorMsg}. Solutions: 1) Run ActV as Administrator, 2) Ensure your account has admin rights on ${computer.computerName}, 3) Check if administrative shares are enabled on the target computer.`);
        } else {
          setActionStatus(`⚠ Failed to access C$: ${errorMsg}`);
        }
      }
    } catch (e) {
      setActionStatus(`⚠ Error accessing C$: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 12000); // Longer timeout for detailed error messages
    }
  };

  // Available printers from inventory (simulating 300+ printers)
  const generatePrinters = () => {
    const printers = [];
    const brands = ['HP', 'Canon', 'Epson', 'Brother', 'Xerox', 'Ricoh', 'Lexmark', 'Dell'];
    const models = [
      'LaserJet Pro 404dn', 'LaserJet Pro M15w', 'Color LaserJet Pro M454dn', 'OfficeJet Pro 9015e',
      'ImageRunner 2625i', 'ImageRunner ADVANCE C3530i', 'PIXMA TR8620', 'imageCLASS MF445dw',
      'WorkForce Pro WF-4740', 'EcoTank ET-4760', 'Expression Premium XP-7100', 'WorkForce WF-7710',
      'HL-L2350DW', 'MFC-L8900CDW', 'HL-L3270CDW', 'DCP-L2550DW',
      'VersaLink C405', 'WorkCentre 6515', 'Phaser 6510', 'ColorQube 8900',
      'Aficio MP C3003', 'Pro C5300s', 'SP 330DN', 'MP C2011SP',
      'MS415dn', 'CX417de', 'MB2236adw', 'CS421dn',
      '2330dn', 'E515dw', 'H815dw', 'S2830dn'
    ];
    const buildings = ['A', 'B', 'C', 'D', 'E', 'F'];
    const departments = ['IT', 'HR', 'Marketing', 'Finance', 'Engineering', 'Reception', 'Legal', 'Operations', 'Sales', 'Support'];
    const floors = [1, 2, 3, 4, 5];

    for (let i = 1; i <= 320; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const building = buildings[Math.floor(Math.random() * buildings.length)];
      const floor = floors[Math.floor(Math.random() * floors.length)];
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const room = Math.floor(Math.random() * 50) + 100;
      
      printers.push({
        id: `PR-${brand.substring(0,2).toUpperCase()}-${i.toString().padStart(3, '0')}`,
        name: `${brand} ${model}`,
        ip: `192.168.${Math.floor(i / 254) + 1}.${(i % 254) + 1}`,
        location: `Building ${building} - Floor ${floor} - ${dept} (Room ${room})`,
        department: dept,
        building: building,
        floor: floor,
        brand: brand
      });
    }

    return printers.sort((a, b) => a.name.localeCompare(b.name));
  };

  const allPrinters = generatePrinters();
  
  // Filter printers based on search term
  const filteredPrinters = allPrinters.filter(printer => {
    if (!printerSearchTerm.trim()) return true;
    
    const searchLower = printerSearchTerm.toLowerCase();
    return (
      printer.name.toLowerCase().includes(searchLower) ||
      printer.ip.includes(searchLower) ||
      printer.location.toLowerCase().includes(searchLower) ||
      printer.department.toLowerCase().includes(searchLower) ||
      printer.building.toLowerCase().includes(searchLower) ||
      printer.brand.toLowerCase().includes(searchLower) ||
      printer.id.toLowerCase().includes(searchLower)
    );
  });

  const handleInstallPrinter = () => {
    setShowPrinterModal(true);
  };
  
  // User Profiles Functions
  const handleShowUserProfiles = async () => {
    setShowUserProfilesModal(true);
    setLoadingProfiles(true);
    setProfilesError('');
    
    try {
      // First check WinRM connectivity for remote computers
      const isLocal = computer.computerName?.toLowerCase() === window.location.hostname?.toLowerCase() ||
                     computer.computerName?.toLowerCase() === 'localhost' ||
                     computer.computerName === '127.0.0.1';
      
      if (!isLocal) {
        setActionStatus('Checking WinRM connectivity...');
        const winrmTest = await window.electronAPI?.testWinRM?.(computer.computerName);
        if (!winrmTest?.success) {
          setProfilesError(`WinRM connection failed: ${winrmTest?.error || 'Cannot access remote computer'}. WinRM must be enabled on the target computer for remote profile management.`);
          setLoadingProfiles(false);
          return;
        }
      }
      
      const result = await window.electronAPI?.getUserProfiles?.(computer.computerName);
      if (result?.success) {
        setUserProfiles(result.data || []);
      } else {
        setProfilesError(result?.error || 'Failed to load user profiles');
      }
    } catch (e) {
      setProfilesError(e.message);
    } finally {
      setLoadingProfiles(false);
      setActionStatus('');
    }
  };
  
  const handleDeleteSelectedProfiles = async () => {
    if (selectedProfiles.length === 0) {
      alert('Please select profiles to delete.');
      return;
    }
    
    const profileNames = selectedProfiles.map(p => p.Username).join(', ');
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProfiles.length} user profile(s):\n\n${profileNames}\n\nThis action cannot be undone and will remove all user data from these profiles.`
    );
    if (!confirmed) return;
    
    setDeletingProfiles(true);
    try {
      const result = await window.electronAPI?.deleteUserProfiles?.(computer.computerName, selectedProfiles);
      if (result?.success) {
        alert(`Profiles deleted successfully: ${result.message}`);
        // Refresh the profiles list
        handleShowUserProfiles();
        setSelectedProfiles([]);
      } else {
        alert(`Failed to delete profiles: ${result?.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Error deleting profiles: ${e.message}`);
    } finally {
      setDeletingProfiles(false);
    }
  };
  
  const handleProfileSelection = (profile, isChecked) => {
    if (isChecked) {
      setSelectedProfiles([...selectedProfiles, profile]);
    } else {
      setSelectedProfiles(selectedProfiles.filter(p => p.SID !== profile.SID));
    }
  };
  
  // Disk Space Functions
  const fetchDiskSpace = async () => {
    setLoadingDiskSpace(true);
    try {
      const result = await window.electronAPI?.getDiskSpace?.(computer.computerName);
      if (result?.success) {
        setDiskSpace(result.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch disk space:', e);
    } finally {
      setLoadingDiskSpace(false);
    }
  };
  
  // Fetch disk space when modal opens
  useEffect(() => {
    if (isOpen && computer?.computerName) {
      fetchDiskSpace();
    }
  }, [isOpen, computer?.computerName]);
  
  // Helper function to enable WinRM on remote computer
  const handleEnableWinRMForProfiles = async () => {
    setLoadingProfiles(true);
    setProfilesError('');
    
    try {
      setActionStatus('Attempting to enable WinRM remotely...');
      const result = await window.electronAPI?.enableWinRM?.(computer.computerName);
      if (result?.success) {
        setActionStatus('WinRM enabled. Retrying profile access...');
        // Wait a moment then retry getting profiles
        setTimeout(async () => {
          try {
            const profileResult = await window.electronAPI?.getUserProfiles?.(computer.computerName);
            if (profileResult?.success) {
              setUserProfiles(profileResult.data || []);
              setActionStatus('Successfully loaded user profiles.');
            } else {
              setProfilesError(profileResult?.error || 'Failed to load user profiles after enabling WinRM');
            }
          } catch (e) {
            setProfilesError(e.message);
          } finally {
            setLoadingProfiles(false);
            setTimeout(() => setActionStatus(''), 3000);
          }
        }, 2000);
      } else {
        setProfilesError(`Failed to enable WinRM: ${result?.error || 'Unknown error'}`);
        setLoadingProfiles(false);
        setActionStatus('');
      }
    } catch (e) {
      setProfilesError(`Error enabling WinRM: ${e.message}`);
      setLoadingProfiles(false);
      setActionStatus('');
    }
  };

  const handlePrinterInstallConfirm = async () => {
    if (!selectedPrinter) {
      alert('Please select a printer to install.');
      return;
    }

    const printer = allPrinters.find(p => p.id === selectedPrinter);
    setPrinterInstallStatus(`Installing ${printer.name} on ${computer.computerName}...`);
    
    try {
      // Check WinRM connectivity first
      const winrmTest = await window.electronAPI?.testWinRM?.(computer.computerName);
      
      if (!winrmTest?.success) {
        // Try to enable WinRM remotely
        setPrinterInstallStatus('WinRM not enabled. Attempting to enable remotely...');
        const enableResult = await window.electronAPI?.enableWinRM?.(computer.computerName);
        
        if (!enableResult?.success) {
          throw new Error('Failed to enable WinRM. Manual intervention may be required.');
        }
      }
      
      // Install the printer
      const installResult = await window.electronAPI?.installPrinter?.(
        computer.computerName,
        printer.ip,
        printer.name
      );
      
      if (installResult?.success) {
        setPrinterInstallStatus(`Successfully installed ${printer.name}`);
        setTimeout(() => {
          setShowPrinterModal(false);
          setSelectedPrinter('');
          setPrinterInstallStatus('');
        }, 2000);
      } else {
        throw new Error(installResult?.error || 'Installation failed');
      }
    } catch (error) {
      console.error('Printer installation failed:', error);
      setPrinterInstallStatus(`Installation failed: ${error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getComputerIcon()}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{computer.computerName}</h2>
              <p className="text-gray-600">{computer.description || 'Computer Details'}</p>
              {inv ? (
                <p className="text-xs text-gray-500">Live inventory fetched: {invFetchedAt}</p>
              ) : invError ? (
                <p className="text-xs text-red-600">{invError}</p>
              ) : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Computer Information Layout */}
          <div className="flex items-center justify-end mb-3">
            <button onClick={handleRefreshInventory} disabled={loadingInv} className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50">
              {loadingInv ? 'Refreshing...' : 'Refresh Inventory'}
            </button>
          </div>
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Computer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Computer Name:</label>
                  <input
                    type="text"
                    value={computer.computerName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Restarted:</label>
                  <input
                    type="text"
                    value={formatDateTime(inv?.lastBootTime || computer.lastBootTime) || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current User:</label>
                  <input
                    type="text"
                    value={inv?.currentUser || computer.currentUser || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
                  {isEditingDescription ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter description..."
                      />
                      <button
                        onClick={handleUpdateDescription}
                        disabled={updatingDesc}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {updatingDesc ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingDescription(false);
                          setTempDescription(computer.description || '');
                        }}
                        className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={computer.description || 'N/A'}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                      <button
                        onClick={handleUpdateDescription}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>
                {actionStatus && (
                  <div className="p-2 mt-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">{actionStatus}</div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PC Make:</label>
                  <input
                    type="text"
                    value={inv?.manufacturer || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PC Model:</label>
                  <input
                    type="text"
                    value={inv?.model || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number:</label>
                  <input
                    type="text"
                    value={inv?.serialNumber || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installed Memory:</label>
                  <input
                    type="text"
                    value={inv?.memory || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address:</label>
                  <input
                    type="text"
                    value={inv?.ipAddress || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUpdateDescription}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Update AD Description</span>
              </button>
              
              <button
                onClick={handleRestartComputer}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Restart Computer</span>
              </button>
              
              <button
                onClick={handleRemoteIn}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ComputerDesktopIcon className="w-4 h-4" />
                <span>Remote In (RDP/Dameware)</span>
              </button>

              <button
                onClick={handleEnableWinRM}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <span>Enable WinRM</span>
              </button>
              
              <button
                onClick={handleInstallPrinter}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Install Printer</span>
              </button>
              
              <button
                onClick={handleShowUserProfiles}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <UserGroupIcon className="w-4 h-4" />
                <span>User Profiles</span>
              </button>
              
              <button
                onClick={handleOpenCDrive}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <FolderOpenIcon className="w-4 h-4" />
                <span>Open C$ Share</span>
              </button>

              <button
                onClick={handleDeleteComputer}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete from AD</span>
              </button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network Information */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <WifiIcon className="w-5 h-5 mr-2" />
                Network & System Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Operating System:</span>
                  <span className="font-medium">{computer.os}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Domain:</span>
                  <span className="font-medium">{inv?.domain || computer.domain || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(computer.status)}
                    <span className={`font-medium ${
                      computer.status === 'Active' ? 'status-online' : 'status-offline'
                    }`}>
                      {computer.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MAC Address:</span>
                  <span className="font-medium font-mono text-sm">{inv?.macAddress || computer.macAddress || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Logon:</span>
                  <span className="font-medium text-sm">{formatDateTime(computer.lastLogon)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-medium">{computer.uptime || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Location & Department */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2" />
                Location & Department
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-right max-w-xs">{computer.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{computer.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processor:</span>
                  <span className="font-medium text-right max-w-xs text-sm">{inv?.processor || computer.processor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Organizational Unit:</span>
                  <span className="font-medium text-right max-w-xs text-xs">{computer.organizationalUnit || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Disk Space Information */}
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ChartPieIcon className="w-5 h-5 mr-2" />
              Disk Space Information
              {loadingDiskSpace && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
            </h3>
            {diskSpace.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diskSpace.map((disk, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{disk.Drive}</span>
                      <span className="text-sm text-gray-600">{disk.FreePercent} free</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Size:</span>
                        <span className="font-medium">{disk.TotalSize}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Free Space:</span>
                        <span className="font-medium text-green-600">{disk.FreeSpace}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Used Space:</span>
                        <span className="font-medium text-blue-600">{disk.UsedSpace}</span>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${100 - parseFloat(disk.FreePercent)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                {loadingDiskSpace ? 'Loading disk information...' : 'Disk information not available'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Printer Installation Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <PrinterIcon className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Install Printer to {computer.computerName}</h3>
              </div>
              <button
                onClick={() => {
                  setShowPrinterModal(false);
                  setSelectedPrinter('');
                  setPrinterInstallStatus('');
                  setPrinterSearchTerm('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Printer to Install:
                </label>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search printers by name, location, department, IP address..."
                    value={printerSearchTerm}
                    onChange={(e) => setPrinterSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* Results Count */}
                <div className="text-sm text-gray-600 mb-3">
                  {filteredPrinters.length === allPrinters.length ? 
                    `Showing all ${allPrinters.length} printers` : 
                    `Found ${filteredPrinters.length} of ${allPrinters.length} printers`
                  }
                </div>
                
                {/* Printer List - Scrollable */}
                <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {filteredPrinters.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <PrinterIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No printers found matching your search</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </div>
                  ) : (
                    filteredPrinters.map((printer) => (
                    <div
                      key={printer.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedPrinter === printer.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPrinter(printer.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="printer"
                          value={printer.id}
                          checked={selectedPrinter === printer.id}
                          onChange={() => setSelectedPrinter(printer.id)}
                          className="text-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <PrinterIcon className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{printer.name}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-mono">{printer.ip}</span> • {printer.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>

              {printerInstallStatus && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700">{printerInstallStatus}</span>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Installation Process:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Checks WinRM connectivity to target computer</li>
                  <li>• Enables WinRM remotely if needed</li>
                  <li>• Installs printer drivers and configures network printer</li>
                  <li>• Sets up printer queue on the target computer</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowPrinterModal(false);
                  setSelectedPrinter('');
                  setPrinterInstallStatus('');
                  setPrinterSearchTerm('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={printerInstallStatus.includes('Installing')}
              >
                Cancel
              </button>
              <button
                onClick={handlePrinterInstallConfirm}
                disabled={!selectedPrinter || printerInstallStatus.includes('Installing')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
              >
                Install Printer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Profiles Modal */}
      {showUserProfilesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="w-6 h-6 text-cyan-600" />
                <h3 className="text-xl font-bold text-gray-900">User Profiles on {computer.computerName}</h3>
              </div>
              <button
                onClick={() => {
                  setShowUserProfilesModal(false);
                  setSelectedProfiles([]);
                  setProfilesError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {loadingProfiles ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading user profiles...</p>
                </div>
              ) : profilesError ? (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-4">{profilesError}</p>
                  {profilesError.includes('WinRM') && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <h4 className="font-medium mb-2">Solutions:</h4>
                        <ul className="text-left space-y-1">
                          <li>• Try enabling WinRM remotely using the button below</li>
                          <li>• Ensure the target computer is powered on and accessible</li>
                          <li>• Check firewall settings allow WinRM traffic (port 5985/5986)</li>
                          <li>• Verify you have administrative privileges on the target computer</li>
                        </ul>
                      </div>
                      <button
                        onClick={handleEnableWinRMForProfiles}
                        disabled={loadingProfiles}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                        {loadingProfiles ? 'Enabling WinRM...' : 'Try Enable WinRM'}
                      </button>
                    </div>
                  )}
                </div>
              ) : userProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">No user profiles found</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Found {userProfiles.length} deletable user profile(s). System and protected accounts are automatically filtered out.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Protected Accounts (Hidden)</h4>
                      <p className="text-xs text-blue-700">
                        Administrator, Guest, System accounts, and service accounts are automatically hidden for safety.
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                          <p className="text-sm text-yellow-700">
                            Deleting user profiles will permanently remove all user data, settings, and registry entries. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {userProfiles.map((profile, index) => (
                      <div
                        key={profile.SID}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedProfiles.some(p => p.SID === profile.SID)}
                            onChange={(e) => handleProfileSelection(profile, e.target.checked)}
                            className="text-cyan-600 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <UserGroupIcon className="w-5 h-5 text-gray-400" />
                              <span className="font-medium text-gray-900">{profile.Username}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>Path: <span className="font-mono text-xs">{profile.ProfilePath}</span></div>
                              <div>SID: <span className="font-mono text-xs">{profile.SID}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedProfiles.length > 0 && `${selectedProfiles.length} profile(s) selected`}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUserProfilesModal(false);
                    setSelectedProfiles([]);
                    setProfilesError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deletingProfiles}
                >
                  Close
                </button>
                <button
                  onClick={handleDeleteSelectedProfiles}
                  disabled={selectedProfiles.length === 0 || deletingProfiles}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors flex items-center space-x-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>{deletingProfiles ? 'Deleting...' : 'Delete Selected'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputerDetailModal;
