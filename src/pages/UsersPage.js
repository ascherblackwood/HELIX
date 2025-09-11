import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowPathIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';
import { useTheme } from '../contexts/ThemeContext';
import UserDetailModal from '../components/UserDetailModal';
import AddUserModal from '../components/AddUserModal';

const UsersPage = () => {
  const { searchUsers, isConnected, loading, connectionConfig } = useLDAP();
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);

  const searchTypes = [
    { value: 'all', label: 'All Fields' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'employeeId', label: 'Employee ID' },
    { value: 'title', label: 'Job Title' },
    { value: 'description', label: 'Description' },
    { value: 'email', label: 'Email' }
  ];

  useEffect(() => {
    loadUsers();
  }, [isConnected]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = users.filter(user => {
      switch (searchType) {
        case 'lastName':
          return user.surname?.toLowerCase().includes(searchLower);
        case 'firstName':
          return user.givenName?.toLowerCase().includes(searchLower);
        case 'employeeId':
          return user.employeeId?.toLowerCase().includes(searchLower);
        case 'title':
          return user.title?.toLowerCase().includes(searchLower);
        case 'description':
          return (user.description?.toLowerCase().includes(searchLower) ||
                  user.comment?.toLowerCase().includes(searchLower) ||
                  user.info?.toLowerCase().includes(searchLower) ||
                  user.notes?.toLowerCase().includes(searchLower));
        case 'email':
          return user.email?.toLowerCase().includes(searchLower);
        case 'all':
        default:
          return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.username?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.givenName?.toLowerCase().includes(searchLower) ||
            user.surname?.toLowerCase().includes(searchLower) ||
            user.employeeId?.toLowerCase().includes(searchLower) ||
            user.title?.toLowerCase().includes(searchLower) ||
            user.description?.toLowerCase().includes(searchLower) ||
            user.comment?.toLowerCase().includes(searchLower) ||
            user.info?.toLowerCase().includes(searchLower) ||
            user.notes?.toLowerCase().includes(searchLower)
          );
      }
    });
    setFilteredUsers(filtered);
  }, [searchTerm, searchType, users]);

  // Comprehensive dummy user data for demonstration
  const dummyUsers = [
    {
      cn: 'John Smith',
      sAMAccountName: 'jsmith',
      mail: 'john.smith@domain.local',
      userAccountControl: 512,
      givenName: 'John',
      surname: 'Smith',
      displayName: 'John Smith',
      title: 'Senior Systems Administrator',
      department: 'Information Technology',
      description: 'System Administrator',
      company: 'Acme Corporation',
      manager: 'Sarah Wilson',
      employeeId: 'EMP001',
      employeeType: 'Full-Time',
      office: 'Building A, Room 201',
      phone: '+1-555-0101',
      mobile: '+1-555-0102',
      streetAddress: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'United States',
      lastLogon: '2024-01-15T14:30:00Z',
      passwordLastSet: '2023-12-01T09:15:00Z',
      logonCount: 1247,
      memberOf: ['Domain Admins', 'IT Support', 'VPN Users']
    },
    {
      cn: 'Jane Doe',
      sAMAccountName: 'jdoe',
      mail: 'jane.doe@domain.local',
      userAccountControl: 512,
      givenName: 'Jane',
      surname: 'Doe',
      displayName: 'Jane Doe',
      title: 'Marketing Manager',
      department: 'Marketing',
      description: 'Marketing Manager',
      company: 'Acme Corporation',
      manager: 'Michael Brown',
      employeeId: 'EMP002',
      employeeType: 'Full-Time',
      office: 'Building B, Room 105',
      phone: '+1-555-0201',
      mobile: '+1-555-0202',
      streetAddress: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'United States',
      lastLogon: '2024-01-15T13:45:00Z',
      passwordLastSet: '2024-01-01T10:00:00Z',
      logonCount: 892,
      memberOf: ['Marketing Team', 'All Employees', 'VPN Users']
    },
    {
      cn: 'Robert Johnson',
      sAMAccountName: 'rjohnson',
      mail: 'robert.johnson@domain.local',
      userAccountControl: 514,
      givenName: 'Robert',
      surname: 'Johnson',
      displayName: 'Bob Johnson',
      title: 'Software Developer',
      department: 'Engineering',
      description: 'Software Developer',
      wWWHomePage: 'https://example.com/stale-profile',
      company: 'Acme Corporation',
      manager: 'Alice Cooper',
      employeeId: 'EMP003',
      employeeType: 'Contract',
      office: 'Building C, Room 301',
      phone: '+1-555-0301',
      mobile: '+1-555-0302',
      streetAddress: '789 Pine Street',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'United States',
      lastLogon: '2023-12-20T16:20:00Z',
      passwordLastSet: '2023-11-15T14:30:00Z',
      logonCount: 445,
      memberOf: ['Engineering Team', 'Contractors']
    },
    {
      cn: 'Alice Brown',
      sAMAccountName: 'abrown',
      mail: 'alice.brown@domain.local',
      userAccountControl: 512,
      givenName: 'Alice',
      surname: 'Brown',
      displayName: 'Alice Brown',
      title: 'HR Director',
      department: 'Human Resources',
      description: 'HR Director',
      company: 'Acme Corporation',
      manager: 'David Wilson',
      employeeId: 'EMP004',
      employeeType: 'Full-Time',
      office: 'Building A, Room 110',
      phone: '+1-555-0401',
      mobile: '+1-555-0402',
      streetAddress: '321 Elm Street',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'United States',
      lastLogon: '2024-01-14T17:00:00Z',
      passwordLastSet: '2024-01-05T08:20:00Z',
      logonCount: 1156,
      memberOf: ['HR Team', 'Management', 'Payroll Access']
    },
    {
      cn: 'Charles Wilson',
      sAMAccountName: 'cwilson',
      mail: 'charles.wilson@domain.local',
      userAccountControl: 512,
      givenName: 'Charles',
      surname: 'Wilson',
      displayName: 'Charlie Wilson',
      title: 'Sales Representative',
      department: 'Sales',
      description: 'Sales Rep',
      company: 'Acme Corporation',
      manager: 'Linda Davis',
      employeeId: 'EMP005',
      employeeType: 'Full-Time',
      office: 'Building B, Room 205',
      phone: '+1-555-0501',
      mobile: '+1-555-0502',
      streetAddress: '654 Maple Drive',
      city: 'Miami',
      state: 'FL',
      postalCode: '33101',
      country: 'United States',
      lastLogon: '2024-01-15T12:15:00Z',
      passwordLastSet: '2023-12-10T11:45:00Z',
      logonCount: 678,
      memberOf: ['Sales Team', 'CRM Access']
    },
    {
      cn: 'Diana Prince',
      sAMAccountName: 'dprince',
      mail: 'diana.prince@domain.local',
      userAccountControl: 512,
      givenName: 'Diana',
      surname: 'Prince',
      displayName: 'Diana Prince',
      title: 'Financial Analyst',
      department: 'Finance',
      description: 'Financial Analyst',
      company: 'Acme Corporation',
      manager: 'Robert Kim',
      employeeId: 'EMP006',
      employeeType: 'Full-Time',
      office: 'Building A, Room 305',
      phone: '+1-555-0601',
      mobile: '+1-555-0602',
      streetAddress: '987 Cedar Lane',
      city: 'Boston',
      state: 'MA',
      postalCode: '02101',
      country: 'United States',
      lastLogon: '2024-01-15T10:30:00Z',
      passwordLastSet: '2024-01-08T09:00:00Z',
      logonCount: 934,
      memberOf: ['Finance Team', 'Financial Systems Access']
    },
    {
      cn: 'Michael Rodriguez',
      sAMAccountName: 'mrodriguez',
      mail: 'michael.rodriguez@domain.local',
      userAccountControl: 512,
      givenName: 'Michael',
      surname: 'Rodriguez',
      displayName: 'Mike Rodriguez',
      title: 'Network Engineer',
      department: 'Information Technology',
      description: 'Network Engineer',
      company: 'Acme Corporation',
      manager: 'John Smith',
      employeeId: 'EMP007',
      employeeType: 'Full-Time',
      office: 'Building A, Room 203',
      phone: '+1-555-0701',
      mobile: '+1-555-0702',
      streetAddress: '111 Technology Blvd',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'United States',
      lastLogon: '2024-01-15T11:45:00Z',
      passwordLastSet: '2024-01-02T14:20:00Z',
      logonCount: 2341,
      memberOf: ['IT Support', 'Network Admins', 'VPN Users']
    },
    {
      cn: 'Sarah Thompson',
      sAMAccountName: 'sthompson',
      mail: 'sarah.thompson@domain.local',
      userAccountControl: 512,
      givenName: 'Sarah',
      surname: 'Thompson',
      displayName: 'Sarah Thompson',
      title: 'Product Manager',
      department: 'Product Development',
      description: 'Product Manager',
      company: 'Acme Corporation',
      manager: 'Jennifer Lee',
      employeeId: 'EMP008',
      employeeType: 'Full-Time',
      office: 'Building C, Room 201',
      phone: '+1-555-0801',
      mobile: '+1-555-0802',
      streetAddress: '456 Innovation Way',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'United States',
      lastLogon: '2024-01-15T09:15:00Z',
      passwordLastSet: '2023-12-28T16:30:00Z',
      logonCount: 1523,
      memberOf: ['Product Team', 'Project Managers', 'All Employees']
    },
    {
      cn: 'David Miller',
      sAMAccountName: 'dmiller',
      mail: 'david.miller@domain.local',
      userAccountControl: 514,
      givenName: 'David',
      surname: 'Miller',
      displayName: 'David Miller',
      title: 'Database Administrator',
      department: 'Information Technology',
      description: 'DBA',
      wWWHomePage: 'https://company.com/users/stale-account',
      company: 'Acme Corporation',
      manager: 'John Smith',
      employeeId: 'EMP009',
      employeeType: 'Part-Time',
      office: 'Building A, Room 210',
      phone: '+1-555-0901',
      mobile: '+1-555-0902',
      streetAddress: '789 Database Dr',
      city: 'Denver',
      state: 'CO',
      postalCode: '80201',
      country: 'United States',
      lastLogon: '2023-12-18T15:30:00Z',
      passwordLastSet: '2023-11-20T10:15:00Z',
      logonCount: 234,
      memberOf: ['IT Support', 'Database Admins']
    },
    {
      cn: 'Jennifer Garcia',
      sAMAccountName: 'jgarcia',
      mail: 'jennifer.garcia@domain.local',
      userAccountControl: 512,
      givenName: 'Jennifer',
      surname: 'Garcia',
      displayName: 'Jen Garcia',
      title: 'UX Designer',
      department: 'Design',
      description: 'UX Designer',
      company: 'Acme Corporation',
      manager: 'Sarah Thompson',
      employeeId: 'EMP010',
      employeeType: 'Contract',
      office: 'Building C, Room 105',
      phone: '+1-555-1001',
      mobile: '+1-555-1002',
      streetAddress: '321 Design Plaza',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'United States',
      lastLogon: '2024-01-14T14:20:00Z',
      passwordLastSet: '2024-01-03T11:45:00Z',
      logonCount: 887,
      memberOf: ['Design Team', 'Contractors', 'Creative Suite Users']
    }
  ];

  const loadUsers = async () => {
    if (isConnected) {
      try {
        const ldapUsers = await searchUsers();
        setUsers(ldapUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
        // When connected, avoid placeholder; show empty to reflect real query state
        setUsers([]);
      }
    } else {
      // When not connected, show dummy users for demonstration
      setUsers(dummyUsers);
    }
  };

  const handleAddUser = () => {
    setShowAddUser(true);
  };

  const handleUserAdded = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
    setFilteredUsers(prev => [newUser, ...prev]);
  };

  const handleRefresh = () => {
    loadUsers();
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const getStatusIcon = (status) => {
    if (status === 'Active') {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (status === 'Stale') {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  // Helper function to log debug info to localStorage
  const logDebug = (message, data = null) => {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp}: ${message}${data ? ' - ' + JSON.stringify(data) : ''}`;
      
      // Get existing logs
      const existingLogs = localStorage.getItem('ctrl-debug-logs') || '';
      const newLogs = existingLogs + '\n' + logEntry;
      
      // Keep only last 50 lines
      const lines = newLogs.split('\n').slice(-50);
      localStorage.setItem('ctrl-debug-logs', lines.join('\n'));
    } catch (error) {
      console.warn('Failed to write debug log:', error);
    }
  };

  const getUserStatus = (user) => {
    // Check if user is disabled
    if (user.userAccountControl && (user.userAccountControl & 2)) {
      return 'Disabled';
    }
    
    // Debug logging for Colin Blackwood specifically
    if ((user.displayName && user.displayName.includes('Colin Blackwood')) || 
        (user.cn && user.cn.includes('Colin Blackwood'))) {
      logDebug('Colin Blackwood FOCUSED FIELDS', {
        'user.wWWHomePage': user.wWWHomePage,
        'user.description': user.description,
        'user.comment': user.comment,
        'user.info': user.info,
        'user.notes': user.notes,
        'wWWHomePage_exists': user.hasOwnProperty('wWWHomePage'),
        'description_exists': user.hasOwnProperty('description'),
        'typeof_wWWHomePage': typeof user.wWWHomePage,
        'all_webpage_fields': {
          wWWHomePage: user.wWWHomePage,
          wwwHomePage: user.wwwHomePage,
          url: user.url,
          website: user.website,
          webPage: user.webPage,
          homeURL: user.homeURL
        }
      });
    }
    
    // Check if "stale" appears in the web page entry - focus on wWWHomePage primarily
    if (user.wWWHomePage && user.wWWHomePage.toString().toLowerCase().includes('stale')) {
      logDebug('Found stale status in wWWHomePage', {
        user: user.displayName || user.cn,
        wWWHomePage: user.wWWHomePage
      });
      return 'Stale';
    }
    
    // Also check other possible fields as fallback
    const checkFields = {
      description: user.description,
      comment: user.comment,
      info: user.info,
      notes: user.notes
    };
    
    for (const [fieldName, fieldValue] of Object.entries(checkFields)) {
      if (fieldValue && fieldValue.toString().toLowerCase().includes('stale')) {
        logDebug('Found stale status in fallback field', {
          user: user.displayName || user.cn,
          field: fieldName,
          value: fieldValue
        });
        return 'Stale';
      }
    }
    
    return 'Active';
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchType('all');
  };

  const viewDebugLogs = () => {
    const logs = localStorage.getItem('ctrl-debug-logs') || 'No debug logs available';
    alert('Debug Logs:\n\n' + logs);
  };

  const clearDebugLogs = () => {
    localStorage.removeItem('ctrl-debug-logs');
    alert('Debug logs cleared');
  };

  return (
    <div className="p-6 themed-background">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold themed-text-primary">Users</h1>
        <p className="mt-2 themed-text-muted">Manage Active Directory users</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
              style={{ color: theme.colors.text.muted }}
            />
            <input
              type="text"
              placeholder={`Search by ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase() || 'all fields'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 themed-surface border rounded-lg focus:ring-2 focus:border-transparent transition-all"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.primary
              }}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" style={{ color: theme.colors.text.muted }} />
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                showAdvancedSearch ? 'bg-blue-50' : 'themed-surface'
              }`}
              style={{ 
                borderColor: showAdvancedSearch ? theme.colors.primary[300] : theme.colors.border,
                color: showAdvancedSearch ? theme.colors.primary[600] : theme.colors.text.secondary
              }}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={handleAddUser}
              className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: theme.colors.primary[600] }}
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add User</span>
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 themed-surface border rounded-lg transition-colors disabled:opacity-50"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.secondary
              }}
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={viewDebugLogs}
              className="flex items-center space-x-2 px-4 py-2 themed-surface border rounded-lg transition-colors"
              style={{ 
                borderColor: theme.colors.border,
                color: theme.colors.text.secondary
              }}
              title="View debug logs for troubleshooting"
            >
              <span>Debug</span>
            </button>
          </div>
        </div>

        {/* Advanced Search Options */}
        {showAdvancedSearch && (
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
                Search in:
              </span>
              {searchTypes.map(type => (
                <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value={type.value}
                    checked={searchType === type.value}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="text-blue-600"
                    style={{ accentColor: theme.colors.primary[600] }}
                  />
                  <span 
                    className="text-sm"
                    style={{ color: theme.colors.text.primary }}
                  >
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
            
            {searchTerm && (
              <div className="mt-3 text-sm" style={{ color: theme.colors.text.muted }}>
                Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} matching "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="themed-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.text.secondary }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.text.secondary }}>
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.text.secondary }}>
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.text.secondary }}>
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.text.secondary }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: theme.colors.border }}>
              {filteredUsers.map((user) => (
                <tr 
                  key={user.sAMAccountName} 
                  className="table-row hover:bg-opacity-50 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(user)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div 
                          className="h-12 w-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: theme.colors.primary[100] }}
                        >
                          <UserIcon 
                            className="w-7 h-7" 
                            style={{ color: theme.colors.primary[600] }}
                          />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div 
                          className="text-sm font-medium"
                          style={{ color: theme.colors.text.primary }}
                        >
                          {user.displayName || user.cn}
                        </div>
                        <div 
                          className="text-sm"
                          style={{ color: theme.colors.text.muted }}
                        >
                          {user.sAMAccountName} • {user.mail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: theme.colors.text.primary }}>
                    {user.employeeId || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: theme.colors.text.primary }}>
                    {user.title || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: theme.colors.text.primary }}>
                    {user.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(getUserStatus(user))}
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        getUserStatus(user) === 'Disabled' ? 'bg-red-100 text-red-800' :
                        getUserStatus(user) === 'Stale' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getUserStatus(user)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserIcon 
                className="mx-auto h-12 w-12" 
                style={{ color: theme.colors.text.muted }}
              />
              <h3 
                className="mt-2 text-sm font-medium"
                style={{ color: theme.colors.text.primary }}
              >
                No users found
              </h3>
              <p 
                className="mt-1 text-sm"
                style={{ color: theme.colors.text.muted }}
              >
                {searchTerm ? 'Try adjusting your search criteria.' : 'Connect to Active Directory to view users.'}
              </p>
              {!isConnected && (
                <button
                  onClick={() => window.location.href = '#settings'}
                  className="mt-4 px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: theme.colors.primary[600] }}
                >
                  Configure Connection
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      <UserDetailModal 
        user={selectedUser}
        isOpen={showUserDetail}
        onClose={() => {
          setShowUserDetail(false);
          setSelectedUser(null);
        }}
        connectionConfig={connectionConfig}
        onUserUpdated={loadUsers}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserAdded={handleUserAdded}
        connectionConfig={connectionConfig}
      />
    </div>
  );
};

export default UsersPage;
