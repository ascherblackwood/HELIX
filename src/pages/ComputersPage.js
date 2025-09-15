import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowPathIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useLDAP } from '../contexts/LDAPContext';
import ComputerDetailModal from '../components/ComputerDetailModal';
import AddComputerModal from '../components/AddComputerModal';

const ComputersPage = () => {
  const { searchComputers, isConnected, loading, connectionConfig } = useLDAP();
  const [computers, setComputers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredComputers, setFilteredComputers] = useState([]);
  const [searchType, setSearchType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedComputer, setSelectedComputer] = useState(null);
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [showAddComputerModal, setShowAddComputerModal] = useState(false);

  // Enhanced sample data for when not connected
  const sampleComputers = [
    {
      id: '1',
      computerName: 'WS-JOHN-01',
      os: 'Windows 11 Pro',
      lastLogon: '2024-01-15',
      status: 'Active',
      description: 'John Smith Workstation',
      currentUser: 'ACME\\john.smith',
      location: 'Building A - Room 201',
      department: 'IT Department',
      manufacturer: 'Dell Inc.',
      model: 'OptiPlex 7090',
      serialNumber: 'DL7090001',
      processor: 'Intel Core i7-11700',
      memory: '32 GB',
      storage: '512 GB SSD',
      ipAddress: '192.168.1.101',
      macAddress: '00:1A:2B:3C:4D:01',
      lastBootTime: '2024-01-15 08:30:00',
      uptime: '7 days 14 hours',
      installedSoftware: ['Microsoft Office 365', 'Adobe Reader', 'Google Chrome', 'VS Code'],
      patches: ['KB5034441', 'KB5034467', 'KB5034204'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Workstations,OU=IT,DC=acme,DC=local'
    },
    {
      id: '2',
      computerName: 'WS-JANE-02',
      os: 'Windows 10 Pro',
      lastLogon: '2024-01-14',
      status: 'Active',
      description: 'Jane Doe Marketing Workstation',
      currentUser: 'ACME\jane.doe',
      location: 'Building B - Room 105',
      department: 'Marketing',
      manufacturer: 'HP Inc.',
      model: 'EliteDesk 800 G6',
      serialNumber: 'HP800G6002',
      processor: 'Intel Core i5-10500',
      memory: '16 GB',
      storage: '256 GB SSD',
      ipAddress: '192.168.1.102',
      macAddress: '00:1A:2B:3C:4D:02',
      lastBootTime: '2024-01-14 09:15:00',
      uptime: '6 days 10 hours',
      installedSoftware: ['Microsoft Office 365', 'Adobe Creative Suite', 'Slack', 'Zoom'],
      patches: ['KB5034441', 'KB5034467'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Workstations,OU=Marketing,DC=acme,DC=local'
    },
    {
      id: '3',
      computerName: 'SRV-DC-01',
      os: 'Windows Server 2022',
      lastLogon: '2024-01-15',
      status: 'Active',
      description: 'Primary Domain Controller',
      currentUser: 'SYSTEM',
      location: 'Server Room A - Rack 1',
      department: 'IT Infrastructure',
      manufacturer: 'Dell Inc.',
      model: 'PowerEdge R750',
      serialNumber: 'DLR750001',
      processor: 'Intel Xeon Gold 6338',
      memory: '128 GB',
      storage: '2 TB SSD RAID 1',
      ipAddress: '192.168.1.10',
      macAddress: '00:1A:2B:3C:4D:10',
      lastBootTime: '2023-12-01 10:00:00',
      uptime: '45 days 18 hours',
      installedSoftware: ['Active Directory Domain Services', 'DNS Server', 'DHCP Server', 'Windows Update Services'],
      patches: ['KB5034441', 'KB5034467', 'KB5034204', 'KB5033375'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Domain Controllers,DC=acme,DC=local'
    },
    {
      id: '4',
      computerName: 'WS-BOB-03',
      os: 'Windows 11 Pro',
      lastLogon: '2023-12-20',
      status: 'Disabled',
      description: 'Bob Johnson Development Machine (Disabled)',
      location: 'Building C - Room 301',
      department: 'Engineering',
      manufacturer: 'Lenovo',
      model: 'ThinkStation P350',
      serialNumber: 'LNP350003',
      processor: 'Intel Core i9-11900K',
      memory: '64 GB',
      storage: '1 TB NVMe SSD',
      ipAddress: 'N/A',
      macAddress: '00:1A:2B:3C:4D:03',
      lastBootTime: '2023-12-20 16:45:00',
      uptime: 'Offline',
      installedSoftware: ['Visual Studio 2022', 'Docker Desktop', 'Git', 'Node.js'],
      patches: ['KB5034441'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Workstations,OU=Engineering,DC=acme,DC=local'
    },
    {
      id: '5',
      computerName: 'LAP-ALICE-04',
      os: 'Windows 11 Pro',
      lastLogon: '2024-01-13',
      status: 'Active',
      description: 'Alice Brown Executive Laptop',
      currentUser: 'ACME\alice.brown',
      location: 'Building A - Room 110 (Mobile)',
      department: 'Human Resources',
      manufacturer: 'Microsoft',
      model: 'Surface Laptop Studio',
      serialNumber: 'MSSLS004',
      processor: 'Intel Core i7-11370H',
      memory: '32 GB',
      storage: '1 TB SSD',
      ipAddress: '192.168.1.104',
      macAddress: '00:1A:2B:3C:4D:04',
      lastBootTime: '2024-01-13 07:45:00',
      uptime: '2 days 8 hours',
      installedSoftware: ['Microsoft Office 365', 'Teams', 'OneDrive', 'Power BI'],
      patches: ['KB5034441', 'KB5034467', 'KB5034204'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Laptops,OU=HR,DC=acme,DC=local'
    },
    {
      id: '6',
      computerName: 'WS-CHARLIE-05',
      os: 'Windows 10 Pro',
      lastLogon: '2024-01-15',
      status: 'Active',
      description: 'Charlie Wilson Sales Workstation',
      location: 'Building B - Room 205',
      department: 'Sales',
      manufacturer: 'ASUS',
      model: 'ProArt Station PA602',
      serialNumber: 'ASPA602005',
      processor: 'AMD Ryzen 7 5800X',
      memory: '32 GB',
      storage: '512 GB NVMe SSD',
      ipAddress: '192.168.1.105',
      macAddress: '00:1A:2B:3C:4D:05',
      lastBootTime: '2024-01-15 08:00:00',
      uptime: '1 day 2 hours',
      installedSoftware: ['Salesforce Desktop', 'Microsoft Office 365', 'Zoom', 'Chrome'],
      patches: ['KB5034441', 'KB5034467'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Workstations,OU=Sales,DC=acme,DC=local'
    },
    {
      id: '7',
      computerName: 'SRV-FILE-01',
      os: 'Windows Server 2019',
      lastLogon: '2024-01-15',
      status: 'Active',
      description: 'Primary File Server',
      location: 'Server Room B - Rack 2',
      department: 'IT Infrastructure',
      manufacturer: 'HPE',
      model: 'ProLiant DL380 Gen10',
      serialNumber: 'HPEDL380001',
      processor: 'Intel Xeon Silver 4214',
      memory: '96 GB',
      storage: '8 TB RAID 5',
      ipAddress: '192.168.1.20',
      macAddress: '00:1A:2B:3C:4D:20',
      lastBootTime: '2023-11-15 14:30:00',
      uptime: '78 days 6 hours',
      installedSoftware: ['File Server Role', 'DFS Management', 'Windows Backup', 'Antivirus'],
      patches: ['KB5034441', 'KB5034467', 'KB5033375'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Servers,DC=acme,DC=local'
    },
    {
      id: '8',
      computerName: 'WS-DIANA-06',
      os: 'Windows 11 Pro',
      lastLogon: '2024-01-15',
      status: 'Active',
      description: 'Diana Prince Finance Workstation',
      location: 'Building A - Room 305',
      department: 'Finance',
      manufacturer: 'Dell Inc.',
      model: 'Precision 3660',
      serialNumber: 'DLP3660006',
      processor: 'Intel Core i7-12700K',
      memory: '32 GB',
      storage: '1 TB SSD',
      ipAddress: '192.168.1.106',
      macAddress: '00:1A:2B:3C:4D:06',
      lastBootTime: '2024-01-15 08:15:00',
      uptime: '12 hours',
      installedSoftware: ['QuickBooks Enterprise', 'Excel', 'SAP Client', 'Tableau'],
      patches: ['KB5034441', 'KB5034467', 'KB5034204'],
      domain: 'ACME.LOCAL',
      organizationalUnit: 'OU=Workstations,OU=Finance,DC=acme,DC=local'
    }
  ];

  useEffect(() => {
    loadComputers();
  }, [isConnected]);

  // Search functionality
  const searchTypes = [
    { value: 'all', label: 'All Fields' },
    { value: 'name', label: 'Computer Name' },
    { value: 'description', label: 'Description' },
    { value: 'os', label: 'Operating System' },
    { value: 'location', label: 'Location' },
    { value: 'department', label: 'Department' }
  ];

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredComputers(computers);
      return;
    }

    const filtered = computers.filter(computer => {
      const term = searchTerm.toLowerCase();
      
      switch (searchType) {
        case 'name':
          return computer.computerName.toLowerCase().includes(term);
        case 'description':
          return computer.description?.toLowerCase().includes(term) || false;
        case 'os':
          return computer.os.toLowerCase().includes(term);
        case 'location':
          return computer.location?.toLowerCase().includes(term) || false;
        case 'department':
          return computer.department?.toLowerCase().includes(term) || false;
        case 'all':
        default:
          return (
            computer.computerName.toLowerCase().includes(term) ||
            computer.description?.toLowerCase().includes(term) ||
            computer.os.toLowerCase().includes(term) ||
            computer.location?.toLowerCase().includes(term) ||
            computer.department?.toLowerCase().includes(term) ||
            computer.manufacturer?.toLowerCase().includes(term) ||
            computer.model?.toLowerCase().includes(term)
          );
      }
    });
    setFilteredComputers(filtered);
  }, [searchTerm, searchType, computers]);

  const loadComputers = async () => {
    if (isConnected) {
      try {
        const ldapComputers = await searchComputers();
        setComputers(ldapComputers);
      } catch (error) {
        console.error('Failed to load computers:', error);
        // When connected, avoid showing sample data to prevent confusion
        setComputers([]);
      }
    } else {
      setComputers(sampleComputers);
    }
  };

  const handleAddComputer = () => {
    setShowAddComputerModal(true);
  };

  const handleComputerAdded = (newComputer) => {
    if (!newComputer) {
      // Refresh from AD to get real attributes
      loadComputers();
      return;
    }
    setComputers(prev => [newComputer, ...prev]);
    setFilteredComputers(prev => [newComputer, ...prev]);
  };

  const handleRefresh = () => {
    loadComputers();
  };

  const handleComputerClick = (computer) => {
    setSelectedComputer(computer);
    setShowComputerModal(true);
  };

  const closeComputerModal = () => {
    setShowComputerModal(false);
    setSelectedComputer(null);
  };

  const getStatusIcon = (status) => {
    return status === 'Active' ? (
      <CheckCircleIcon className="w-5 h-5 status-online" />
    ) : (
      <XCircleIcon className="w-5 h-5 status-offline" />
    );
  };

  const getOSIcon = (os) => {
    if (os.toLowerCase().includes('server')) {
      return '🖥️';
    } else if (os.toLowerCase().includes('windows')) {
      return '💻';
    } else {
      return '🖥️';
    }
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Computers</h1>
        <p className="mt-2 text-gray-600">Manage Active Directory computers</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${searchType === 'all' ? 'computers' : searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={handleAddComputer}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Computer</span>
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

        {/* Search Filters */}
        {showFilters && (
          <div className="card p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Search Filters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {searchTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSearchType(type.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    searchType === type.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {searchTerm && (
              <div className="mt-3 text-sm text-gray-600">
                Found {filteredComputers.length} computer{filteredComputers.length !== 1 ? 's' : ''} matching "{searchTerm}" in {searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Computers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Computer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operating System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredComputers.map((computer) => (
                <tr key={computer.id} className="table-row hover:bg-gray-50 cursor-pointer" onClick={() => handleComputerClick(computer)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <ComputerDesktopIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {computer.computerName}
                        </div>
                        {computer.description && (
                          <div className="text-xs text-gray-500">
                            {computer.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getOSIcon(computer.os)}</span>
                      <span className="text-sm text-gray-900">{computer.os}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {computer.lastLogonAt ? (
                      <span title={new Date(computer.lastLogonAt).toLocaleString()}>
                        {computer.lastLogonAgo}
                      </span>
                    ) : (
                      computer.lastLogon || 'Never'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(computer.status)}
                      <span className={`text-sm font-medium ${
                        computer.status === 'Active' ? 'status-online' : 'status-offline'
                      }`}>
                        {computer.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComputerClick(computer);
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
          
          {filteredComputers.length === 0 && (
            <div className="text-center py-12">
              <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No computers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new computer.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Computer Detail Modal */}
      {showComputerModal && selectedComputer && (
        <ComputerDetailModal
          computer={selectedComputer}
          isOpen={showComputerModal}
          onClose={closeComputerModal}
        />
      )}

      {/* Add Computer Modal */}
      <AddComputerModal
        isOpen={showAddComputerModal}
        onClose={() => setShowAddComputerModal(false)}
        onComputerAdded={handleComputerAdded}
        connectionConfig={connectionConfig}
      />
    </div>
  );
};

export default ComputersPage;
