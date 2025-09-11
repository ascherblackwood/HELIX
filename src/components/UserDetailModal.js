import React, { useState } from 'react';
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  KeyIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useLDAP } from '../contexts/LDAPContext';

const UserDetailModal = ({ user, isOpen, onClose, connectionConfig, onUserUpdated }) => {
  const { theme } = useTheme();
  const { searchGroups, isConnected } = useLDAP();
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState(user?.description || '');
  const [actionStatus, setActionStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserStatus, setCurrentUserStatus] = useState(user?.status || 'Active');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [userGroups, setUserGroups] = useState(user?.memberOf || []);
  const [forceChangeNextLogon, setForceChangeNextLogon] = useState(true);

  // Helper: display only CN from a DN string
  const displayCN = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const m = value.match(/CN=([^,]+)/i);
      return m ? m[1] : value;
    }
    if (value && typeof value === 'object' && value.name) return value.name;
    return String(value);
  };

  // Update status when user prop changes
  React.useEffect(() => {
    if (user) {
      const status = user.userAccountControl && (user.userAccountControl & 2) ? 'Disabled' : 'Active';
      setCurrentUserStatus(status);
      setUserGroups(user.memberOf || []);
    }
  }, [user]);

  // Sample available groups for demonstration
  const sampleGroups = [
    'Domain Admins', 'IT Support', 'VPN Users', 'Marketing Team', 'Sales Team',
    'HR Team', 'Finance Team', 'Engineering Team', 'Design Team', 'Management',
    'All Employees', 'Contractors', 'Remote Workers', 'Project Managers',
    'Database Admins', 'Network Admins', 'Security Team', 'Help Desk'
  ];

  if (!isOpen || !user) return null;

  // Action handlers
  const handleEmailCustomer = () => {
    const emailSubject = `Account Information for ${user.displayName}`;
    const emailBody = `Hello ${user.displayName},\n\nThis is regarding your account: ${user.username}\n\nBest regards,\nIT Support`;
    const mailtoUrl = `mailto:${user.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl);
    setActionStatus('Email client opened');
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleLogoffUser = async () => {
    try {
      const defaultComputer = '';
      const target = window.prompt('Enter computer name to log off this user from:', defaultComputer);
      if (!target) return;
      setActionStatus(`Logging off ${user.username || user.sAMAccountName} on ${target}...`);
      const res = await window.electronAPI?.logoffUserSession?.(target, user.username || user.sAMAccountName);
      if (res?.success) {
        setActionStatus(`Logged off ${res.count} session(s) for ${user.username || user.sAMAccountName} on ${target}`);
      } else {
        setActionStatus(res?.error || 'Failed to log off user');
      }
    } catch (e) {
      setActionStatus(`Failed to log off user: ${e.message}`);
    } finally {
      setTimeout(() => setActionStatus(''), 6000);
    }
  };

  const handleToggleAccountLock = async () => {
    console.log('handleToggleAccountLock - connectionConfig:', connectionConfig);
    console.log('handleToggleAccountLock - currentUserStatus:', currentUserStatus);
    console.log('handleToggleAccountLock - user:', user.sAMAccountName || user.username);
    
    if (!connectionConfig || !connectionConfig.server) {
      console.warn('No connection config available for account toggle');
      setActionStatus('No Active Directory connection available. Please connect to your domain first.');
      setTimeout(() => setActionStatus(''), 5000);
      return;
    }

    const isCurrentlyDisabled = currentUserStatus === 'Disabled';
    const action = isCurrentlyDisabled ? 'enable' : 'disable';
    const enable = isCurrentlyDisabled;
    
    setIsLoading(true);
    
    try {
      const result = await window.electronAPI.toggleADUserAccount(connectionConfig, {
        username: user.username || user.sAMAccountName,
        enable: enable
      });

      if (result.success) {
        setCurrentUserStatus(result.newStatus);
        setActionStatus(`Account ${action}d successfully`);
        setTimeout(() => setActionStatus(''), 3000);
        
        // Refresh the users list if callback provided
        if (onUserUpdated) {
          onUserUpdated();
        }
      } else {
        setActionStatus(result.error || `Failed to ${action} account`);
        setTimeout(() => setActionStatus(''), 5000);
      }
    } catch (error) {
      console.error('Toggle account error:', error);
      setActionStatus(`Failed to ${action} account. Please try again.`);
      setTimeout(() => setActionStatus(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!connectionConfig) {
      setActionStatus('No Active Directory connection available');
      setTimeout(() => setActionStatus(''), 3000);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await window.electronAPI.resetADPassword(connectionConfig, {
        username: user.username || user.sAMAccountName,
        forceChange: !!forceChangeNextLogon,
        autoClearPNE: true
      });

      if (result.success) {
        setActionStatus(`Password reset successfully. Temp password: ${result.tempPassword}`);
        setTimeout(() => setActionStatus(''), 10000); // Show temp password longer
      } else {
        setActionStatus(result.error || 'Failed to reset password');
        setTimeout(() => setActionStatus(''), 5000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setActionStatus('Failed to reset password. Please try again.');
      setTimeout(() => setActionStatus(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (isUpdatingDescription) {
      console.log('handleUpdateDescription - connectionConfig:', connectionConfig);
      console.log('handleUpdateDescription - user:', user.sAMAccountName || user.username);
      
      if (!connectionConfig || !connectionConfig.server) {
        console.warn('No connection config available');
        setActionStatus('No Active Directory connection available. Please connect to your domain first.');
        setTimeout(() => setActionStatus(''), 5000);
        return;
      }

      setIsLoading(true);
      
      try {
        const result = await window.electronAPI.updateADUser(connectionConfig, {
          username: user.username || user.sAMAccountName,
          field: 'Description',
          value: newDescription
        });

        if (result.success) {
          setActionStatus('Description updated successfully');
          setIsUpdatingDescription(false);
          setTimeout(() => setActionStatus(''), 3000);
          
          // Refresh the users list if callback provided
          if (onUserUpdated) {
            onUserUpdated();
          }
        } else {
          setActionStatus(result.error || 'Failed to update description');
          setTimeout(() => setActionStatus(''), 5000);
        }
      } catch (error) {
        console.error('Update description error:', error);
        setActionStatus('Failed to update description. Please try again.');
        setTimeout(() => setActionStatus(''), 5000);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Start editing only the Description field
      setIsUpdatingDescription(true);
      setNewDescription(user.description || '');
    }
  };

  const cancelUpdateDescription = () => {
    setIsUpdatingDescription(false);
    setNewDescription(user.description || '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleManageGroups = async () => {
    setShowGroupModal(true);
    setGroupSearchTerm('');
    setNewGroupName('');
    
    // Load available groups from LDAP
    if (isConnected) {
      try {
        const groups = await searchGroups();
        setAvailableGroups(groups.map(group => group.groupName || group.cn));
        setActionStatus('Groups loaded from Active Directory');
        setTimeout(() => setActionStatus(''), 3000);
      } catch (error) {
        console.error('Failed to load groups:', error);
        setAvailableGroups(sampleGroups);
        setActionStatus('Using sample groups - failed to load from AD');
        setTimeout(() => setActionStatus(''), 5000);
      }
    } else {
      // Fallback to sample groups when not connected
      setAvailableGroups(sampleGroups);
      setActionStatus('Using sample groups - not connected to AD');
      setTimeout(() => setActionStatus(''), 3000);
    }
  };

  const handleAddGroup = async (groupName) => {
    if (!userGroups.includes(groupName)) {
      if (isConnected && connectionConfig) {
        setIsLoading(true);
        try {
          const result = await window.electronAPI.addUserToGroup(connectionConfig, {
            username: user.username || user.sAMAccountName,
            groupName: groupName
          });

          if (result.success) {
            setUserGroups([...userGroups, groupName]);
            setActionStatus(`Successfully added to group: ${groupName}`);
            
            // Refresh the users list if callback provided
            if (onUserUpdated) {
              onUserUpdated();
            }
          } else {
            setActionStatus(`Failed to add to group: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Add to group error:', error);
          setActionStatus(`Failed to add to group: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Demo mode - just update local state
        setUserGroups([...userGroups, groupName]);
        setActionStatus(`Added to group: ${groupName} (Demo Mode)`);
      }
      setTimeout(() => setActionStatus(''), 5000);
    }
  };

  const handleRemoveGroup = async (groupName) => {
    if (isConnected && connectionConfig) {
      setIsLoading(true);
      try {
        const result = await window.electronAPI.removeUserFromGroup(connectionConfig, {
          username: user.username || user.sAMAccountName,
          groupName: groupName
        });

        if (result.success) {
          setUserGroups(userGroups.filter(group => group !== groupName));
          setActionStatus(`Successfully removed from group: ${groupName}`);
          
          // Refresh the users list if callback provided
          if (onUserUpdated) {
            onUserUpdated();
          }
        } else {
          setActionStatus(`Failed to remove from group: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Remove from group error:', error);
        setActionStatus(`Failed to remove from group: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Demo mode - just update local state
      setUserGroups(userGroups.filter(group => group !== groupName));
      setActionStatus(`Removed from group: ${groupName} (Demo Mode)`);
    }
    setTimeout(() => setActionStatus(''), 5000);
  };

  const handleAddNewGroup = async () => {
    if (newGroupName.trim() && !userGroups.includes(newGroupName.trim())) {
      await handleAddGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  const filteredGroups = availableGroups.filter(group =>
    group.toLowerCase().includes(groupSearchTerm.toLowerCase()) &&
    !userGroups.includes(group)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="themed-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[100] }}
            >
              <UserIcon 
                className="w-8 h-8" 
                style={{ color: theme.colors.primary[600] }}
              />
            </div>
            <div>
              <h2 
                className="text-2xl font-bold"
                style={{ color: theme.colors.text.primary }}
              >
                {user.displayName || user.name}
              </h2>
              <p 
                className="text-sm"
                style={{ color: theme.colors.text.muted }}
              >
                {user.title} • {user.department}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: theme.colors.text.muted }}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <UserIcon className="w-5 h-5" />
              <span>Personal Information</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>First Name:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.givenName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Last Name:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.surname || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Display Name:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.displayName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Username:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.username}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Employee ID:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.employeeId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Employee Type:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.employeeType || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <EnvelopeIcon className="w-5 h-5" />
              <span>Contact Information</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Email:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Phone:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Mobile:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.mobile || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Fax:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.fax || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <BuildingOfficeIcon className="w-5 h-5" />
              <span>Organization</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Title:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Department:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Company:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.company || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Manager:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.manager || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Office:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.office || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <MapPinIcon className="w-5 h-5" />
              <span>Location</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Street Address:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.streetAddress || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>City:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>State:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.state || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Postal Code:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.postalCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Country:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.country || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <ShieldCheckIcon className="w-5 h-5" />
              <span>Account Information</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Status:</span>
                <span 
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentUserStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {currentUserStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Account Expires:</span>
                <span style={{ color: theme.colors.text.primary }}>{formatDate(user.accountExpires)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Password Last Set:</span>
                <span style={{ color: theme.colors.text.primary }}>{formatDate(user.passwordLastSet)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Last Logon:</span>
                <span style={{ color: theme.colors.text.primary }} title={user.lastLogon ? new Date(user.lastLogon).toLocaleString() : 'Never'}>
                  {user.lastLogonAgo || formatDate(user.lastLogon)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.text.secondary }}>Logon Count:</span>
                <span style={{ color: theme.colors.text.primary }}>{user.logonCount || '0'}</span>
              </div>
            </div>
          </div>

        {/* Groups & Permissions */}
        <div className="space-y-4">
          {/* Password reset options */}
          <div className="p-3 rounded-md border" style={{ borderColor: theme.colors.border }}>
            <label className="inline-flex items-center space-x-2 text-sm" style={{ color: theme.colors.text.primary }}>
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={forceChangeNextLogon}
                onChange={(e) => setForceChangeNextLogon(e.target.checked)}
              />
              <span>Force password change at next logon (temporarily clear “Password never expires” if set)</span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <h3 
              className="text-lg font-semibold flex items-center space-x-2"
              style={{ color: theme.colors.text.primary }}
            >
              <KeyIcon className="w-5 h-5" />
              <span>Groups & Permissions</span>
            </h3>
            <button
              onClick={handleManageGroups}
              className="flex items-center space-x-1 px-3 py-1 text-sm rounded-lg border transition-colors"
              style={{ 
                borderColor: theme.colors.primary[300],
                color: theme.colors.primary[600],
                backgroundColor: theme.colors.primary[50]
              }}
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>Manage</span>
            </button>
          </div>
            
            <div className="space-y-2">
              {userGroups && userGroups.length > 0 ? (
                userGroups.slice(0, 5).map((group, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between px-3 py-1 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: theme.colors.primary[50],
                      color: theme.colors.primary[700]
                    }}
                  >
                    <span>{displayCN(group)}</span>
                    <button
                      onClick={() => handleRemoveGroup(group)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 ml-2 disabled:opacity-50"
                      title="Remove from group"
                    >
                      {isLoading ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <XMarkIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <span style={{ color: theme.colors.text.muted }}>No group memberships</span>
              )}
              {userGroups && userGroups.length > 5 && (
                <div 
                  className="text-sm"
                  style={{ color: theme.colors.text.muted }}
                >
                  +{userGroups.length - 5} more groups
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Action Status */}
        {actionStatus && (
          <div 
            className="mx-6 mb-4 p-3 rounded-lg flex items-center space-x-2"
            style={{ 
              backgroundColor: theme.colors.primary[50],
              borderColor: theme.colors.primary[200]
            }}
          >
            <CheckCircleIcon 
              className="w-5 h-5"
              style={{ color: theme.colors.primary[600] }}
            />
            <span 
              className="text-sm font-medium"
              style={{ color: theme.colors.primary[800] }}
            >
              {actionStatus}
            </span>
          </div>
        )}

        {/* User Actions */}
        <div 
          className="px-6 py-4 border-t"
          style={{ borderColor: theme.colors.border }}
        >
          <h3 
            className="text-lg font-semibold mb-4"
            style={{ color: theme.colors.text.primary }}
          >
            User Actions
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {/* Email Customer */}
            <button
              onClick={handleEmailCustomer}
              className="flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-10"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.primary[50]}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Email User</span>
            </button>

            {/* Lock/Unlock Account */}
            <button
              onClick={handleToggleAccountLock}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-10 disabled:opacity-50 ${
                currentUserStatus === 'Disabled' ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'
              }`}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  if (currentUserStatus === 'Disabled') {
                    e.target.style.backgroundColor = '#dcfce7';
                  } else {
                    e.target.style.backgroundColor = '#fef2f2';
                  }
                }
              }}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isLoading ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : currentUserStatus === 'Disabled' ? (
                <LockOpenIcon className="w-5 h-5" />
              ) : (
                <LockClosedIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {isLoading ? 'Processing...' : currentUserStatus === 'Disabled' ? 'Unlock Account' : 'Lock Account'}
              </span>
            </button>

            {/* Reset Password */}
            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-10 disabled:opacity-50"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = theme.colors.primary[50])}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">{isLoading ? 'Resetting...' : 'Reset Password'}</span>
            </button>

            {/* Update Description */}
            <button
              onClick={handleUpdateDescription}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-10 disabled:opacity-50"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = theme.colors.primary[50])}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isLoading && isUpdatingDescription ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <PencilIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {isLoading && isUpdatingDescription ? 'Saving...' : isUpdatingDescription ? 'Save Description' : 'Edit Description'}
              </span>
            </button>
          </div>

          {/* Description Edit Field */}
          {isUpdatingDescription && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: theme.colors.primary[25] }}>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: theme.colors.text.primary }}
              >
                Job Title / Description:
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ 
                    borderColor: theme.colors.border,
                    focusRing: theme.colors.primary[500]
                  }}
                  placeholder="Enter job title or description"
                />
                <button
                  onClick={handleUpdateDescription}
                  className="px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: theme.colors.primary[600] }}
                >
                  Save
                </button>
                <button
                  onClick={cancelUpdateDescription}
                  className="px-4 py-2 rounded-lg border transition-colors"
                  style={{ 
                    borderColor: theme.colors.border,
                    color: theme.colors.text.secondary
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex justify-end space-x-3 px-6 py-4 border-t"
          style={{ 
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background?.secondary || '#f9fafb'
          }}
        >
          <button
            onClick={handleLogoffUser}
            className="px-4 py-2 rounded-lg border transition-colors"
            style={{ 
              borderColor: theme.colors.border,
              color: theme.colors.text.primary
            }}
            title="Log off this user from a specified computer"
          >
            Log Off User
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border transition-colors"
            style={{ 
              borderColor: theme.colors.border,
              color: theme.colors.text.secondary
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Group Management Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: theme.colors.border }}
            >
              <h3 
                className="text-lg font-semibold"
                style={{ color: theme.colors.text.primary }}
              >
                Manage Groups for {user.displayName}
              </h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: theme.colors.text.muted }}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Search and Add New Group */}
              <div className="space-y-4 mb-6">
                {/* Search existing groups */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.text.primary }}
                  >
                    Search Available Groups
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: theme.colors.text.muted }}
                    />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      placeholder="Search for groups..."
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ 
                        borderColor: theme.colors.border,
                        color: theme.colors.text.primary
                      }}
                    />
                  </div>
                </div>

                {/* Add new group manually */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.text.primary }}
                  >
                    Add New Group
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ 
                        borderColor: theme.colors.border,
                        color: theme.colors.text.primary
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewGroup()}
                    />
                    <button
                      onClick={handleAddNewGroup}
                      className="flex items-center px-3 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ backgroundColor: theme.colors.primary[600] }}
                      disabled={!newGroupName.trim() || isLoading}
                    >
                      {isLoading ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlusIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Groups */}
              {filteredGroups.length > 0 && (
                <div className="mb-6">
                  <h4 
                    className="text-sm font-medium mb-3"
                    style={{ color: theme.colors.text.primary }}
                  >
                    Available Groups ({filteredGroups.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {filteredGroups.map((group, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{ borderColor: theme.colors.border }}
                      >
                        <span 
                          className="text-sm"
                          style={{ color: theme.colors.text.primary }}
                        >
                          {group}
                        </span>
                        <button
                          onClick={() => handleAddGroup(group)}
                          disabled={isLoading}
                          className="flex items-center px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                          style={{ backgroundColor: theme.colors.primary[600] }}
                        >
                          {isLoading ? (
                            <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <PlusIcon className="w-3 h-3 mr-1" />
                          )}
                          {isLoading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Groups */}
              <div>
                <h4 
                  className="text-sm font-medium mb-3"
                  style={{ color: theme.colors.text.primary }}
                >
                  Current Groups ({userGroups.length})
                </h4>
                {userGroups.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {userGroups.map((group, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ 
                          backgroundColor: theme.colors.primary[50],
                          border: `1px solid ${theme.colors.primary[200]}`
                        }}
                      >
                        <span 
                          className="text-sm font-medium"
                          style={{ color: theme.colors.primary[700] }}
                        >
                          {group}
                        </span>
                        <button
                          onClick={() => handleRemoveGroup(group)}
                          disabled={isLoading}
                          className="flex items-center px-2 py-1 text-xs rounded text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <XMarkIcon className="w-3 h-3 mr-1" />
                          )}
                          {isLoading ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p 
                    className="text-sm"
                    style={{ color: theme.colors.text.muted }}
                  >
                    No groups assigned
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div 
              className="flex justify-end space-x-3 p-4 border-t"
              style={{ 
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background?.secondary || '#f9fafb'
              }}
            >
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 rounded-lg border transition-colors"
                style={{ 
                  borderColor: theme.colors.border,
                  color: theme.colors.text.secondary
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailModal;
