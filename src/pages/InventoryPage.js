import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArchiveBoxIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import AddAssetModal from '../components/AddAssetModal';

const InventoryPage = () => {
  const [assets, setAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssets, setFilteredAssets] = useState([]);

  // Sample inventory data
  const sampleAssets = [
    { id: '1', assetName: 'WS-JOHN-01', type: 'Workstation', ipAddress: '192.168.1.101', lastSeen: '2024-01-15 14:30', status: 'Online' },
    { id: '2', assetName: 'SRV-DC-01', type: 'Server', ipAddress: '192.168.1.10', lastSeen: '2024-01-15 14:35', status: 'Online' },
    { id: '3', assetName: 'PR-HP-001', type: 'Printer', ipAddress: '192.168.1.150', lastSeen: '2024-01-15 09:15', status: 'Online' },
    { id: '4', assetName: 'WS-JANE-02', type: 'Workstation', ipAddress: '192.168.1.102', lastSeen: '2024-01-14 16:45', status: 'Offline' },
    { id: '5', assetName: 'SW-CORE-01', type: 'Network Switch', ipAddress: '192.168.1.1', lastSeen: '2024-01-15 14:33', status: 'Online' },
    { id: '6', assetName: 'LAP-ALICE-04', type: 'Laptop', ipAddress: '192.168.1.210', lastSeen: '2024-01-13 11:20', status: 'Away' },
    { id: '7', assetName: 'NAS-BACKUP-01', type: 'Storage', ipAddress: '192.168.1.200', lastSeen: '2024-01-15 14:31', status: 'Online' },
  ];

  useEffect(() => {
    setAssets(sampleAssets);
  }, []);

  useEffect(() => {
    const filtered = assets.filter(asset =>
      asset.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.ipAddress.includes(searchTerm)
    );
    setFilteredAssets(filtered);
  }, [searchTerm, assets]);

  const [showAddAsset, setShowAddAsset] = useState(false);

  const handleAddAsset = () => {
    setShowAddAsset(true);
  };

  const handleAssetAdded = (newAsset) => {
    setAssets(prev => [newAsset, ...prev]);
    setFilteredAssets(prev => [newAsset, ...prev]);
  };


  const getStatusIcon = (status) => {
    switch (status) {
      case 'Online':
        return <CheckCircleIcon className="w-5 h-5 status-online" />;
      case 'Offline':
        return <XCircleIcon className="w-5 h-5 status-offline" />;
      case 'Away':
        return <ClockIcon className="w-5 h-5 status-warning" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Online':
        return 'status-online';
      case 'Offline':
        return 'status-offline';
      case 'Away':
        return 'status-warning';
      default:
        return 'text-gray-500';
    }
  };

  const getAssetIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'server':
        return '🖥️';
      case 'workstation':
      case 'laptop':
        return '💻';
      case 'printer':
        return '🖨️';
      case 'network switch':
        return '🔌';
      case 'storage':
        return '💾';
      default:
        return '📦';
    }
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-2 text-gray-600">Network asset discovery and management</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleAddAsset}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Asset</span>
          </button>
          
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
            <ArchiveBoxIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online</p>
              <p className="text-2xl font-bold text-green-600">
                {assets.filter(a => a.status === 'Online').length}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline</p>
              <p className="text-2xl font-bold text-red-600">
                {assets.filter(a => a.status === 'Offline').length}
              </p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Away</p>
              <p className="text-2xl font-bold text-yellow-600">
                {assets.filter(a => a.status === 'Away').length}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
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
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="table-row hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg">{getAssetIcon(asset.type)}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {asset.assetName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {asset.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.lastSeen}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(asset.status)}
                      <span className={`text-sm font-medium ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
                      Details
                    </button>
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by scanning the network or adding assets manually.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={showAddAsset}
        onClose={() => setShowAddAsset(false)}
        onAssetAdded={handleAssetAdded}
      />
    </div>
  );
};

export default InventoryPage;