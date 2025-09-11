import React, { useEffect, useMemo, useState } from 'react';
import { 
  XMarkIcon,
  UserGroupIcon,
  UsersIcon,
  ShieldCheckIcon,
  InboxIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UserIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';

const GroupDetailModal = ({ group, isOpen, onClose }) => {
  const { searchUsers, connectionConfig, isConnected } = useLDAP();
  const [searchMembers, setSearchMembers] = useState('');
  const [searchMembership, setSearchMembership] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !group) return;
    const load = async () => {
      try {
        if (isConnected) {
          const users = await searchUsers();
          setAllUsers(users);
          // Build current members from user.memberOf DN strings where possible
          const groupName = group.groupName || group.cn || group.Name;
          const inGroup = users.filter(u => {
            if (!u.memberOf) return false;
            return Array.isArray(u.memberOf)
              ? u.memberOf.some(m => (m || '').toString().toLowerCase().includes(groupName.toLowerCase()))
              : (u.memberOf || '').toString().toLowerCase().includes(groupName.toLowerCase());
          }).map(u => ({ name: u.displayName || u.name || u.cn || u.username, username: u.username || u.sAMAccountName }));
          setMembers(inGroup);
        } else {
          // Fallback: use provided group.members if present
          setAllUsers([]);
          setMembers(group.members || []);
        }
      } catch (e) {
        setAllUsers([]);
        setMembers(group.members || []);
      }
    };
    load();
  }, [isOpen, group, isConnected, searchUsers]);

  if (!isOpen || !group) return null;

  const getGroupIcon = () => {
    return group.type === 'Security' ? (
      <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
    ) : (
      <InboxIcon className="w-8 h-8 text-green-600" />
    );
  };

  const getGroupTypeColor = () => {
    return group.type === 'Security' ? 'text-blue-600 bg-blue-100' : 'text-green-600 bg-green-100';
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'Never' || dateString === 'N/A') return dateString;
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const filteredMembers = useMemo(() => (members || []).filter(member =>
    (member.name || '').toLowerCase().includes(searchMembers.toLowerCase()) ||
    (member.username || '').toLowerCase().includes(searchMembers.toLowerCase())
  ), [members, searchMembers]);

  const filteredMembership = group.memberOf?.filter(parentGroup =>
    parentGroup.name.toLowerCase().includes(searchMembership.toLowerCase())
  ) || [];

  const candidates = useMemo(() => {
    const groupUsernames = new Set((members || []).map(m => (m.username || '').toLowerCase()));
    return (allUsers || [])
      .filter(u => !groupUsernames.has((u.username || u.sAMAccountName || '').toLowerCase()))
      .filter(u => {
        const t = userSearch.toLowerCase();
        if (!t) return true;
        return (
          (u.displayName || u.name || '').toLowerCase().includes(t) ||
          (u.username || u.sAMAccountName || '').toLowerCase().includes(t) ||
          (u.mail || '').toLowerCase().includes(t)
        );
      })
      .slice(0, 100); // cap list
  }, [allUsers, members, userSearch]);

  const handleAddMember = async (user) => {
    try {
      if (!connectionConfig || !connectionConfig.server) return;
      const username = user.username || user.sAMAccountName;
      const groupName = group.groupName || group.cn || group.Name;
      const res = await window.electronAPI.addUserToGroup(connectionConfig, { username, groupName });
      if (res?.success) {
        setMembers(prev => [{ name: user.displayName || user.name || username, username }, ...prev]);
      } else {
        alert(res?.error || 'Failed to add user to group');
      }
    } catch (e) {
      alert('Failed to add user to group: ' + e.message);
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      if (!connectionConfig || !connectionConfig.server) return;
      const username = member.username;
      const groupName = group.groupName || group.cn || group.Name;
      const res = await window.electronAPI.removeUserFromGroup(connectionConfig, { username, groupName });
      if (res?.success) {
        setMembers(prev => prev.filter(m => (m.username || '').toLowerCase() !== (username || '').toLowerCase()));
      } else {
        alert(res?.error || 'Failed to remove user from group');
      }
    } catch (e) {
      alert('Failed to remove user from group: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getGroupIcon()}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{group.groupName}</h2>
              <p className="text-gray-600">{group.description || 'Group Details'}</p>
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
          {/* Group Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Group Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Group Name:</span>
                  <span className="font-medium">{group.groupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium text-right max-w-xs">{group.description || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Type:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupTypeColor()}`}>
                    {group.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scope:</span>
                  <span className="font-medium">{group.scope || 'Global'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distinguished Name:</span>
                  <span className="font-medium text-right max-w-xs text-xs font-mono">{group.distinguishedName || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                Group Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Members:</span>
                  <span className="font-medium">{group.memberCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Direct Members:</span>
                  <span className="font-medium">{group.members?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Of Groups:</span>
                  <span className="font-medium">{group.memberOf?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created Date:</span>
                  <span className="font-medium text-sm">{formatDateTime(group.createdDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modified Date:</span>
                  <span className="font-medium text-sm">{formatDateTime(group.modifiedDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group Members */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <UsersIcon className="w-5 h-5 mr-2" />
                Group Members ({members?.length || 0})
              </h3>
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>

            {showAddPanel && (
              <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users to add..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {candidates.map((u, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{u.displayName || u.name || u.username || u.sAMAccountName}</div>
                          <div className="text-xs text-gray-500">{u.username || u.sAMAccountName} {u.mail ? `· ${u.mail}` : ''}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(u)}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                  {candidates.length === 0 && (
                    <div className="text-sm text-gray-500">No users found.</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Search Members */}
            <div className="mb-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchMembers}
                onChange={(e) => setSearchMembers(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {members && members.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UsersIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No members in this group</p>
              </div>
            )}
          </div>

          {/* Group Membership (Member Of) */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Member Of Groups ({group.memberOf?.length || 0})
            </h3>
            
            {/* Search Group Membership */}
            <div className="mb-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search parent groups..."
                value={searchMembership}
                onChange={(e) => setSearchMembership(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {group.memberOf && group.memberOf.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {filteredMembership.map((parentGroup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <UserGroupIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{parentGroup.name}</div>
                          <div className="text-xs text-gray-500">{parentGroup.type}</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parentGroup.type === 'Security' ? 'text-blue-600 bg-blue-100' : 'text-green-600 bg-green-100'
                      }`}>
                        {parentGroup.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>This group is not a member of any other groups</p>
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
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Edit Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailModal;
