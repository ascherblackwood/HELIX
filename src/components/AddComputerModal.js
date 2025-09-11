import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';

const AddComputerModal = ({ isOpen, onClose, onComputerAdded, connectionConfig }) => {
  const { searchGroups, isConnected } = useLDAP();
  const [formData, setFormData] = useState({
    computerName: '',
    description: '',
    selectedGroups: []
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

  // Sample groups for when not connected to AD
  const sampleGroups = [
    { id: '1', name: 'Domain Computers', description: 'All domain computers' },
    { id: '2', name: 'Workstations', description: 'User workstations' },
    { id: '3', name: 'IT-Managed', description: 'IT managed computers' },
    { id: '4', name: 'Sales-Computers', description: 'Sales department computers' },
    { id: '5', name: 'Finance-Computers', description: 'Finance department computers' },
    { id: '6', name: 'HR-Computers', description: 'Human Resources computers' },
    { id: '7', name: 'Development-Machines', description: 'Software development computers' },
    { id: '8', name: 'Remote-Access', description: 'Remote access enabled computers' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        computerName: '',
        description: '',
        selectedGroups: []
      });
      setErrors({});
      setGroupSearchTerm('');
      setShowGroupSearch(false);
      
      // Load groups
      loadAvailableGroups();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter groups based on search term
    if (groupSearchTerm) {
      setFilteredGroups(
        availableGroups.filter(group =>
          group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
          group.description.toLowerCase().includes(groupSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredGroups(availableGroups);
    }
  }, [groupSearchTerm, availableGroups]);

  const loadAvailableGroups = async () => {
    if (isConnected) {
      try {
        const groups = await searchGroups('(objectClass=group)');
        // Normalize to { id, name, description }
        const normalized = (groups || []).map(g => ({
          id: g.id || g.groupName || g.cn || g.name || Math.random().toString(36).slice(2),
          name: g.groupName || g.name || g.cn || 'Unnamed Group',
          description: (g.description || '').toString()
        }));
        setAvailableGroups(normalized);
      } catch (error) {
        console.error('Failed to load groups:', error);
        setAvailableGroups(sampleGroups);
      }
    } else {
      setAvailableGroups(sampleGroups);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.computerName.trim()) {
      newErrors.computerName = 'Computer name is required';
    } else if (formData.computerName.length > 15) {
      newErrors.computerName = 'Computer name must be 15 characters or less';
    } else if (!/^[A-Za-z0-9-]+$/.test(formData.computerName)) {
      newErrors.computerName = 'Computer name can only contain letters, numbers, and hyphens';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 100) {
      newErrors.description = 'Description must be 100 characters or less';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Ensure we have connectionConfig
    if (!connectionConfig) {
      setErrors({ submit: 'No Active Directory connection available. Please connect first.' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const computerData = {
        computerName: formData.computerName.toUpperCase(),
        description: formData.description,
        selectedGroups: formData.selectedGroups,
        organizationalUnit: connectionConfig.parentOU || 'CN=Computers',
        enabled: true
      };

      const result = await window.electronAPI.createADComputer(connectionConfig, computerData);
      
      if (result.success) {
        // Ask parent to refresh from AD to avoid placeholders
        onComputerAdded(null);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to create computer in Active Directory.' });
      }
    } catch (error) {
      console.error('Failed to add computer:', error);
      setErrors({ submit: 'Failed to add computer. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupToggle = (group) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.find(g => g.id === group.id)
        ? prev.selectedGroups.filter(g => g.id !== group.id)
        : [...prev.selectedGroups, group]
    }));
  };

  const removeGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.filter(g => g.id !== groupId)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ComputerDesktopIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Computer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Computer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Computer Name *
              </label>
              <input
                type="text"
                value={formData.computerName}
                onChange={(e) => handleInputChange('computerName', e.target.value)}
                placeholder="e.g., WS-JOHN-01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.computerName ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={15}
              />
              {errors.computerName && (
                <p className="text-sm text-red-600 mt-1">{errors.computerName}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum 15 characters. Letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="e.g., John Smith's Workstation"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={100}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum 100 characters. Brief description of the computer's purpose or user.
              </p>
            </div>

            {/* AD Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Directory Groups (Optional)
              </label>
              
              {/* Selected Groups */}
              {formData.selectedGroups.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedGroups.map(group => (
                      <span
                        key={group.id}
                        className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                      >
                        <UserGroupIcon className="w-3 h-3" />
                        <span>{group.name}</span>
                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Groups Button */}
              <button
                type="button"
                onClick={() => setShowGroupSearch(!showGroupSearch)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UserGroupIcon className="w-4 h-4" />
                <span>Add Groups</span>
              </button>

              {/* Group Search */}
              {showGroupSearch && (
                <div className="mt-3 border border-gray-200 rounded-lg p-4">
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto">
                    {filteredGroups.map(group => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleGroupToggle(group)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{group.name}</div>
                          <div className="text-xs text-gray-500">{group.description}</div>
                        </div>
                        {formData.selectedGroups.find(g => g.id === group.id) && (
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isLoading ? 'Adding...' : 'Add Computer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddComputerModal;
