import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowPathIcon,
  UserGroupIcon,
  UsersIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';
import GroupDetailModal from '../components/GroupDetailModal';
import AddGroupModal from '../components/AddGroupModal';

const GroupsPage = () => {
  const { searchGroups, isConnected, loading } = useLDAP();
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  // Enhanced sample data for when not connected
  const sampleGroups = [
    { 
      id: '1', 
      groupName: 'Domain Admins', 
      description: 'Domain administrators with full control over the domain',
      memberCount: 3, 
      type: 'Security',
      scope: 'Global',
      distinguishedName: 'CN=Domain Admins,CN=Users,DC=acme,DC=local',
      createdDate: '2023-01-15T08:00:00Z',
      modifiedDate: '2024-01-10T14:30:00Z',
      members: [
        { name: 'Administrator', username: 'ACME\\administrator' },
        { name: 'John Smith', username: 'ACME\\john.smith' },
        { name: 'IT Manager', username: 'ACME\\it.manager' }
      ],
      memberOf: [
        { name: 'Administrators', type: 'Security' }
      ]
    },
    { 
      id: '2', 
      groupName: 'IT Support', 
      description: 'IT support staff and technicians',
      memberCount: 12, 
      type: 'Security',
      scope: 'Global',
      distinguishedName: 'CN=IT Support,OU=IT,DC=acme,DC=local',
      createdDate: '2023-02-01T09:15:00Z',
      modifiedDate: '2024-01-08T16:45:00Z',
      members: [
        { name: 'John Smith', username: 'ACME\\john.smith' },
        { name: 'Sarah Connor', username: 'ACME\\sarah.connor' },
        { name: 'Mike Johnson', username: 'ACME\\mike.johnson' },
        { name: 'Lisa Anderson', username: 'ACME\\lisa.anderson' },
        { name: 'David Wilson', username: 'ACME\\david.wilson' },
        { name: 'Emily Brown', username: 'ACME\\emily.brown' },
        { name: 'Alex Taylor', username: 'ACME\\alex.taylor' },
        { name: 'Jessica Davis', username: 'ACME\\jessica.davis' },
        { name: 'Robert Garcia', username: 'ACME\\robert.garcia' },
        { name: 'Michelle Lee', username: 'ACME\\michelle.lee' },
        { name: 'Kevin Martinez', username: 'ACME\\kevin.martinez' },
        { name: 'Amanda White', username: 'ACME\\amanda.white' }
      ],
      memberOf: [
        { name: 'IT Department', type: 'Distribution' },
        { name: 'Technical Staff', type: 'Security' }
      ]
    },
    { 
      id: '3', 
      groupName: 'Marketing Team', 
      description: 'Marketing department staff',
      memberCount: 8, 
      type: 'Distribution',
      scope: 'Global',
      distinguishedName: 'CN=Marketing Team,OU=Marketing,DC=acme,DC=local',
      createdDate: '2023-03-10T10:30:00Z',
      modifiedDate: '2024-01-05T11:20:00Z',
      members: [
        { name: 'Jane Doe', username: 'ACME\\jane.doe' },
        { name: 'Marketing Manager', username: 'ACME\\marketing.mgr' },
        { name: 'Tom Williams', username: 'ACME\\tom.williams' },
        { name: 'Rachel Green', username: 'ACME\\rachel.green' },
        { name: 'Chris Miller', username: 'ACME\\chris.miller' },
        { name: 'Angela Stone', username: 'ACME\\angela.stone' },
        { name: 'Brian Clark', username: 'ACME\\brian.clark' },
        { name: 'Nicole Parker', username: 'ACME\\nicole.parker' }
      ],
      memberOf: [
        { name: 'All Company', type: 'Distribution' },
        { name: 'Marketing Resources', type: 'Security' }
      ]
    },
    { 
      id: '4', 
      groupName: 'Developers', 
      description: 'Software development team',
      memberCount: 15, 
      type: 'Security',
      scope: 'Global',
      distinguishedName: 'CN=Developers,OU=Engineering,DC=acme,DC=local',
      createdDate: '2023-01-20T13:45:00Z',
      modifiedDate: '2024-01-12T09:30:00Z',
      members: [
        { name: 'Bob Johnson', username: 'ACME\\bob.johnson' },
        { name: 'Senior Developer', username: 'ACME\\senior.dev' },
        { name: 'Frontend Team Lead', username: 'ACME\\frontend.lead' },
        { name: 'Backend Developer 1', username: 'ACME\\backend.dev1' },
        { name: 'Backend Developer 2', username: 'ACME\\backend.dev2' },
        { name: 'Full Stack Developer', username: 'ACME\\fullstack.dev' },
        { name: 'DevOps Engineer', username: 'ACME\\devops.eng' },
        { name: 'QA Lead', username: 'ACME\\qa.lead' },
        { name: 'Junior Developer 1', username: 'ACME\\junior.dev1' },
        { name: 'Junior Developer 2', username: 'ACME\\junior.dev2' },
        { name: 'UI/UX Designer', username: 'ACME\\ui.designer' },
        { name: 'Mobile Developer', username: 'ACME\\mobile.dev' },
        { name: 'Data Scientist', username: 'ACME\\data.scientist' },
        { name: 'Security Engineer', username: 'ACME\\security.eng' },
        { name: 'Cloud Architect', username: 'ACME\\cloud.architect' }
      ],
      memberOf: [
        { name: 'Engineering', type: 'Distribution' },
        { name: 'Code Repository Access', type: 'Security' },
        { name: 'Development Tools', type: 'Security' }
      ]
    },
    { 
      id: '5', 
      groupName: 'HR Department', 
      description: 'Human resources staff',
      memberCount: 5, 
      type: 'Distribution',
      scope: 'Global',
      distinguishedName: 'CN=HR Department,OU=HR,DC=acme,DC=local',
      createdDate: '2023-01-25T11:00:00Z',
      modifiedDate: '2023-12-20T15:15:00Z',
      members: [
        { name: 'Alice Brown', username: 'ACME\\alice.brown' },
        { name: 'HR Manager', username: 'ACME\\hr.manager' },
        { name: 'Recruiter', username: 'ACME\\recruiter' },
        { name: 'HR Assistant', username: 'ACME\\hr.assistant' },
        { name: 'Benefits Coordinator', username: 'ACME\\benefits.coord' }
      ],
      memberOf: [
        { name: 'All Company', type: 'Distribution' },
        { name: 'Confidential Access', type: 'Security' }
      ]
    },
    { 
      id: '6', 
      groupName: 'Finance Team', 
      description: 'Finance and accounting staff',
      memberCount: 7, 
      type: 'Security',
      scope: 'Global',
      distinguishedName: 'CN=Finance Team,OU=Finance,DC=acme,DC=local',
      createdDate: '2023-02-10T14:20:00Z',
      modifiedDate: '2024-01-03T10:45:00Z',
      members: [
        { name: 'Diana Prince', username: 'ACME\\diana.prince' },
        { name: 'Finance Manager', username: 'ACME\\finance.mgr' },
        { name: 'Senior Accountant', username: 'ACME\\senior.accountant' },
        { name: 'Junior Accountant', username: 'ACME\\junior.accountant' },
        { name: 'Payroll Specialist', username: 'ACME\\payroll.spec' },
        { name: 'Financial Analyst', username: 'ACME\\financial.analyst' },
        { name: 'Accounts Receivable', username: 'ACME\\accounts.receivable' }
      ],
      memberOf: [
        { name: 'Financial Systems Access', type: 'Security' },
        { name: 'Confidential Access', type: 'Security' }
      ]
    },
  ];

  useEffect(() => {
    loadGroups();
  }, [isConnected]);

  useEffect(() => {
    const filtered = groups.filter(group =>
      group.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [searchTerm, groups]);

  const loadGroups = async () => {
    if (isConnected) {
      try {
        const ldapGroups = await searchGroups();
        setGroups(ldapGroups);
      } catch (error) {
        console.error('Failed to load groups:', error);
        setGroups(sampleGroups); // Fallback to sample data
      }
    } else {
      setGroups(sampleGroups);
    }
  };

  const handleAddGroup = () => {
    setShowAddGroup(true);
  };

  const handleGroupAdded = (newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    setFilteredGroups(prev => [newGroup, ...prev]);
  };

  const handleRefresh = () => {
    loadGroups();
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setSelectedGroup(null);
  };

  const getGroupTypeColor = (type) => {
    return type === 'Security' ? 'text-blue-600 bg-blue-100' : 'text-green-600 bg-green-100';
  };

  const getGroupIcon = (type) => {
    return type === 'Security' ? '🔒' : '📧';
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <p className="mt-2 text-gray-600">Manage Active Directory groups</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleAddGroup}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Group</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Groups Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.map((group) => (
                <tr key={group.id} className="table-row hover:bg-gray-50 cursor-pointer" onClick={() => handleGroupClick(group)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserGroupIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {group.groupName}
                        </div>
                        {group.description && (
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {group.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {group.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <UsersIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {group.memberCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getGroupIcon(group.type)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupTypeColor(group.type)}`}>
                        {group.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClick(group);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4 flex items-center space-x-1"
                    >
                      <InformationCircleIcon className="w-4 h-4" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new group.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Group Detail Modal */}
      {showGroupModal && selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          isOpen={showGroupModal}
          onClose={closeGroupModal}
        />
      )}

      {/* Add Group Modal */}
      <AddGroupModal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onGroupAdded={handleGroupAdded}
      />
    </div>
  );
};

export default GroupsPage;