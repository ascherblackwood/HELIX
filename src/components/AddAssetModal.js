import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AddAssetModal = ({ isOpen, onClose, onAssetAdded }) => {
  const [formData, setFormData] = useState({
    assetName: '',
    type: 'Workstation',
    ipAddress: '',
    macAddress: '',
    location: '',
    description: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    operatingSystem: '',
    status: 'Online'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetTypes = [
    { value: 'Workstation', label: 'Workstation', icon: '🖥️' },
    { value: 'Server', label: 'Server', icon: '🖥️' },
    { value: 'Laptop', label: 'Laptop', icon: '💻' },
    { value: 'Printer', label: 'Printer', icon: '🖨️' },
    { value: 'Network Switch', label: 'Network Switch', icon: '🔌' },
    { value: 'Router', label: 'Router', icon: '📡' },
    { value: 'Firewall', label: 'Firewall', icon: '🛡️' },
    { value: 'Storage', label: 'Storage/NAS', icon: '💾' },
    { value: 'Access Point', label: 'Access Point', icon: '📶' },
    { value: 'Phone', label: 'IP Phone', icon: '📞' },
    { value: 'Camera', label: 'Security Camera', icon: '📷' },
    { value: 'Other', label: 'Other Device', icon: '📦' }
  ];

  const statusOptions = [
    { value: 'Online', label: 'Online', color: 'text-green-600 bg-green-100' },
    { value: 'Offline', label: 'Offline', color: 'text-red-600 bg-red-100' },
    { value: 'Away', label: 'Away/Sleep', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'Maintenance', label: 'Maintenance', color: 'text-blue-600 bg-blue-100' }
  ];

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        assetName: '',
        type: 'Workstation',
        ipAddress: '',
        macAddress: '',
        location: '',
        description: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        operatingSystem: '',
        status: 'Online'
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.assetName.trim()) {
      newErrors.assetName = 'Asset name is required';
    } else if (formData.assetName.length > 64) {
      newErrors.assetName = 'Asset name must be 64 characters or less';
    } else if (!/^[a-zA-Z0-9\-_.]+$/.test(formData.assetName)) {
      newErrors.assetName = 'Asset name can only contain letters, numbers, hyphens, periods, and underscores';
    }

    if (formData.ipAddress) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ipAddress)) {
        newErrors.ipAddress = 'Please enter a valid IP address';
      }
    }

    if (formData.macAddress) {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(formData.macAddress)) {
        newErrors.macAddress = 'Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)';
      }
    }

    if (formData.description && formData.description.length > 512) {
      newErrors.description = 'Description must be 512 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newAsset = {
        id: Date.now().toString(),
        assetName: formData.assetName,
        type: formData.type,
        ipAddress: formData.ipAddress || 'N/A',
        macAddress: formData.macAddress || 'N/A',
        location: formData.location || 'Unknown',
        description: formData.description || 'No description',
        manufacturer: formData.manufacturer || 'Unknown',
        model: formData.model || 'Unknown',
        serialNumber: formData.serialNumber || 'N/A',
        operatingSystem: formData.operatingSystem || 'Unknown',
        status: formData.status,
        lastSeen: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString()
      };

      onAssetAdded(newAsset);
      onClose();
    } catch (error) {
      console.error('Failed to add asset:', error);
      setErrors({ submit: 'Failed to add asset. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAssetType = assetTypes.find(type => type.value === formData.type);
  const selectedStatus = statusOptions.find(status => status.value === formData.status);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ComputerDesktopIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Asset</h2>
              <p className="text-gray-600">Register a new network asset or device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">{errors.submit}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Name *
              </label>
              <input
                type="text"
                value={formData.assetName}
                onChange={(e) => handleInputChange('assetName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.assetName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="WS-JOHN-01"
              />
              {errors.assetName && (
                <p className="mt-1 text-sm text-red-600">{errors.assetName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Unique identifier for the asset
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {assetTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              {selectedAssetType && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {selectedAssetType.icon} {selectedAssetType.label}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={formData.ipAddress}
                onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.ipAddress ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="192.168.1.100"
              />
              {errors.ipAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.ipAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MAC Address
              </label>
              <input
                type="text"
                value={formData.macAddress}
                onChange={(e) => handleInputChange('macAddress', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.macAddress ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="00:1A:2B:3C:4D:5E"
              />
              {errors.macAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.macAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Building A, Room 201"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {selectedStatus && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedStatus.color}`}>
                    {selectedStatus.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dell, HP, Lenovo, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="OptiPlex 7090, ThinkPad T14, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC123DEF456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating System
              </label>
              <input
                type="text"
                value={formData.operatingSystem}
                onChange={(e) => handleInputChange('operatingSystem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Windows 11 Pro, Ubuntu 22.04, etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Additional notes about this asset..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Asset Registration</h4>
                <p className="text-sm text-blue-600 mt-1">
                  This asset will be added to your network inventory. Only the asset name is required, 
                  but providing additional details like IP address and MAC address will help with 
                  network management and tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding Asset...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Add Asset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;