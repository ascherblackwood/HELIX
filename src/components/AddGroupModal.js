import React, { useState, useEffect } from 'react';
import { useLDAP } from '../contexts/LDAPContext';
import {
  XMarkIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AddGroupModal = ({ isOpen, onClose, onGroupAdded }) => {
  const { isConnected, connectionConfig } = useLDAP();
  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
    type: 'Security',
    scope: 'Global',
    managedBy: '',
    email: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupTypes = [
    { value: 'Security', label: 'Security Group', description: 'Used for security permissions and access control' },
    { value: 'Distribution', label: 'Distribution Group', description: 'Used for email distribution lists' }
  ];

  const groupScopes = [
    { value: 'Global', label: 'Global', description: 'Can contain members from any domain and be used anywhere in the forest' },
    { value: 'DomainLocal', label: 'Domain Local', description: 'Can contain members from any domain but only used in the local domain' },
    { value: 'Universal', label: 'Universal', description: 'Can contain members from any domain and be used anywhere' }
  ];

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        groupName: '',
        description: '',
        type: 'Security',
        scope: 'Global',
        managedBy: '',
        email: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.groupName && formData.type === 'Distribution') {
      const emailSuggestion = `${formData.groupName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@domain.local`;
      if (!formData.email) {
        setFormData(prev => ({ ...prev, email: emailSuggestion }));
      }
    }
  }, [formData.groupName, formData.type]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group name is required';
    } else if (formData.groupName.length > 64) {
      newErrors.groupName = 'Group name must be 64 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(formData.groupName)) {
      newErrors.groupName = 'Group name can only contain letters, numbers, spaces, hyphens, periods, and underscores';
    }

    if (formData.description && formData.description.length > 1024) {
      newErrors.description = 'Description must be 1024 characters or less';
    }

    if (formData.type === 'Distribution' && formData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.managedBy && formData.managedBy.length > 256) {
      newErrors.managedBy = 'Managed by field must be 256 characters or less';
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
      if (isConnected && window.electronAPI?.createADGroup) {
        const result = await window.electronAPI.createADGroup(connectionConfig, {
          groupName: formData.groupName.trim(),
          description: formData.description || '',
          type: formData.type,
          scope: formData.scope
        });

        if (result?.success) {
          const g = result.group || {};
          const newGroup = {
            id: Date.now().toString(),
            groupName: g.groupName || formData.groupName,
            description: g.description ?? (formData.description || 'No description provided'),
            memberCount: 0,
            type: g.type || formData.type,
            scope: g.scope || formData.scope,
            distinguishedName: g.distinguishedName || `CN=${formData.groupName},${connectionConfig.parentOU || 'CN=Users'}`,
            createdDate: g.whenCreated || new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            members: [],
            memberOf: []
          };
          onGroupAdded(newGroup);
          onClose();
        } else {
          throw new Error(result?.error || 'Failed to create group');
        }
      } else {
        // Fallback: offline/demo mode
        const newGroup = {
          id: Date.now().toString(),
          groupName: formData.groupName,
          description: formData.description || 'No description provided',
          memberCount: 0,
          type: formData.type,
          scope: formData.scope,
          distinguishedName: `CN=${formData.groupName},OU=Groups,DC=acme,DC=local`,
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
          members: [],
          memberOf: []
        };
        onGroupAdded(newGroup);
        onClose();
      }
    } catch (error) {
      console.error('Failed to add group:', error);
      setErrors({ submit: 'Failed to add group. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGroupType = groupTypes.find(type => type.value === formData.type);
  const selectedScope = groupScopes.find(scope => scope.value === formData.scope);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Group</h2>
              <p className="text-gray-600">Create a new Active Directory group</p>
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => handleInputChange('groupName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.groupName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Sales Team"
              />
              {errors.groupName && (
                <p className="mt-1 text-sm text-red-600">{errors.groupName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Group name must be unique within the domain
              </p>
            </div>

            <div>
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
                placeholder="Brief description of the group's purpose"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Group Type *
              </label>
              <div className="space-y-3">
                {groupTypes.map(type => (
                  <div key={type.value} className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id={`type-${type.value}`}
                      name="groupType"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor={`type-${type.value}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                        {type.label}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedGroupType && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">{selectedGroupType.label}</p>
                      <p className="text-xs text-blue-600 mt-1">{selectedGroupType.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Group Scope *
              </label>
              <div className="space-y-3">
                {groupScopes.map(scope => (
                  <div key={scope.value} className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id={`scope-${scope.value}`}
                      name="groupScope"
                      value={scope.value}
                      checked={formData.scope === scope.value}
                      onChange={(e) => handleInputChange('scope', e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor={`scope-${scope.value}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                        {scope.label}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">{scope.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedScope && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-800 font-medium">{selectedScope.label} Scope</p>
                      <p className="text-xs text-green-600 mt-1">{selectedScope.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formData.type === 'Distribution' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="sales.team@domain.local"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Email address for distribution group (optional)
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Managed By
              </label>
              <input
                type="text"
                value={formData.managedBy}
                onChange={(e) => handleInputChange('managedBy', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.managedBy ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Manager Name or Department"
              />
              {errors.managedBy && (
                <p className="mt-1 text-sm text-red-600">{errors.managedBy}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Person or group responsible for managing this group
              </p>
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
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupModal;
