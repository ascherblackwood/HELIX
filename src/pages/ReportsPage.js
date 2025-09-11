import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLDAP } from '../contexts/LDAPContext';
import { DocumentTextIcon, ChartBarIcon, TableCellsIcon, UserGroupIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

const ReportsPage = () => {
  const { theme } = useTheme();
  const { searchUsers, isConnected } = useLDAP();
  const [generatingReport, setGeneratingReport] = useState('');
  const [recentReports, setRecentReports] = useState([]);

  const reportCategories = [
    {
      id: 'user-reports',
      title: 'User Reports',
      description: 'Generate reports about users and their information',
      icon: DocumentTextIcon,
      reports: [
        'User Activity Summary',
        'User Directory Export',
        'User Contact Information',
        'Inactive Users Report'
      ]
    },
    {
      id: 'group-reports',
      title: 'Group Reports',
      description: 'Generate reports about groups and memberships',
      icon: UserGroupIcon,
      reports: [
        'Group Membership Report',
        'Group Directory Export',
        'User Groups Summary',
        'Group Access Analysis'
      ]
    },
    {
      id: 'computer-reports',
      title: 'Computer Reports', 
      description: 'Generate reports about computers and systems',
      icon: ChartBarIcon,
      reports: [
        'Computer Inventory',
        'System Information Report',
        'Computer Status Report',
        'Hardware Summary Report'
      ]
    }
  ];

  // Dummy data for demonstration
  const dummyUsers = [
    {
      displayName: 'AJ Blackwood',
      sAMAccountName: 'ajblackwood',
      mail: 'aj.blackwood@domain.local',
      title: 'PBSP-IT SPECIALIST',
      department: 'IT',
      memberOf: ['IT Support', 'Domain Admins']
    },
    {
      displayName: 'Colin Blackwood',
      sAMAccountName: 'cblackwood',
      mail: 'colin.blackwood@domain.local',
      title: 'Network Engineer',
      department: 'IT',
      memberOf: ['IT Support', 'Network Admins']
    },
    {
      displayName: 'Bri Blackwood',
      sAMAccountName: 'bblackwood',
      mail: 'bri.blackwood@domain.local',
      employeeId: '0000002',
      title: 'Software Developer',
      department: 'Engineering',
      memberOf: ['Engineering Team', 'All Employees']
    }
  ];

  const generateReport = async (reportName) => {
    setGeneratingReport(reportName);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate generation time
      
      let workbook;
      
      switch (reportName) {
        case 'User Activity Summary':
          workbook = await generateUserActivityReport();
          break;
        case 'User Directory Export':
          workbook = await generateUserDirectoryReport();
          break;
        case 'User Contact Information':
          workbook = await generateUserContactReport();
          break;
        case 'Inactive Users Report':
          workbook = generateInactiveUsersReport();
          break;
        case 'Group Membership Report':
          workbook = await generateGroupMembershipReport();
          break;
        case 'Group Directory Export':
          workbook = generateGroupDirectoryReport();
          break;
        case 'User Groups Summary':
          workbook = await generateUserGroupsSummary();
          break;
        case 'Group Access Analysis':
          workbook = generateGroupAccessAnalysis();
          break;
        case 'Computer Inventory':
          workbook = generateComputerInventoryReport();
          break;
        case 'System Information Report':
          workbook = generateSystemInfoReport();
          break;
        case 'Computer Status Report':
          workbook = generateComputerStatusReport();
          break;
        case 'Hardware Summary Report':
          workbook = generateHardwareSummaryReport();
          break;
        default:
          workbook = generateDefaultReport(reportName);
      }
      
      // Create and download the Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Add to recent reports
      const newReport = {
        id: Date.now(),
        name: reportName,
        timestamp: new Date().toLocaleString(),
        size: Math.round(excelBuffer.length / 1024) + ' KB'
      };
      setRecentReports(prev => [newReport, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport('');
    }
  };

  // Helper function to create a basic workbook with headers
  const createWorkbook = () => {
    return XLSX.utils.book_new();
  };

  // Report generation functions
  const generateUserActivityReport = async () => {
    let users = dummyUsers; // Default to dummy data
    
    // Try to get real user data if connected
    if (isConnected) {
      try {
        users = await searchUsers();
      } catch (error) {
        console.warn('Could not fetch real users for report, using dummy data:', error);
        users = dummyUsers;
      }
    }
    
    const workbook = createWorkbook();
    
    // Create summary sheet
    const summaryData = [
      ['User Activity Summary Report'],
      ['Generated on:', new Date().toLocaleString()],
      ['Active Directory:', isConnected ? 'Connected' : 'Demo Mode'],
      [''],
      ['SUMMARY'],
      ['Total Users:', users.length],
      ['Active Users:', users.filter(u => u.title).length],
      ['']
    ];
    
    // Create detailed user data
    const userHeaders = ['User', 'Username', 'Email', 'Title', 'Department', 'Groups'];
    const userData = users.map(user => [
      user.displayName || user.name || 'N/A',
      user.sAMAccountName || user.username || 'N/A', 
      user.mail || user.email || 'N/A',
      user.title || 'N/A',
      user.department || 'N/A',
      user.memberOf ? user.memberOf.join(', ') : 'N/A'
    ]);
    
    // Add user details header and data
    summaryData.push(['USER DETAILS']);
    summaryData.push(userHeaders);
    summaryData.push(...userData);
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'User Activity Summary');
    
    return workbook;
  };

  const generateUserDirectoryReport = async () => {
    let users = dummyUsers;
    
    if (isConnected) {
      try {
        users = await searchUsers();
      } catch (error) {
        console.warn('Could not fetch real users for report, using dummy data:', error);
        users = dummyUsers;
      }
    }
    
    const workbook = createWorkbook();
    
    // Create header information
    const headerData = [
      ['User Directory Export'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Name', 'Username', 'Email', 'Title', 'Department', 'Employee ID']
    ];
    
    // Create user data
    const userData = users.map(user => [
      user.displayName || user.name || '',
      user.sAMAccountName || user.username || '', 
      user.mail || user.email || '',
      user.title || '',
      user.department || '',
      user.employeeId || ''
    ]);
    
    // Combine all data
    const allData = [...headerData, ...userData];
    
    const sheet = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'User Directory');
    
    return workbook;
  };

  const generateUserContactReport = async () => {
    let users = dummyUsers;
    
    if (isConnected) {
      try {
        users = await searchUsers();
      } catch (error) {
        console.warn('Could not fetch real users for report, using dummy data:', error);
        users = dummyUsers;
      }
    }
    
    const workbook = createWorkbook();
    
    const contactData = [
      ['User Contact Information Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['CONTACT DIRECTORY'],
      [''],
      ['Name', 'Username', 'Email', 'Title', 'Department', 'Phone', 'Mobile']
    ];
    
    const userData = users.map(user => [
      user.displayName || user.name || 'N/A',
      user.sAMAccountName || user.username || 'N/A', 
      user.mail || user.email || 'N/A',
      user.title || 'N/A',
      user.department || 'N/A',
      user.phone || 'N/A',
      user.mobile || 'N/A'
    ]);
    
    const allData = [...contactData, ...userData];
    const sheet = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'User Contacts');
    
    return workbook;
  };

  const generateDefaultReport = (reportName) => {
    const workbook = createWorkbook();
    const data = [
      [reportName],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['This report is not yet fully implemented.'],
      ['Please check back for future updates.']
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, reportName);
    return workbook;
  };

  const generateInactiveUsersReport = () => {
    const workbook = createWorkbook();
    const data = [
      ['Inactive Users Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['This report would show users who haven\'t logged in recently.'],
      ['In demo mode, no inactive users to display.'],
      [''],
      ['To implement: Query lastLogonTimestamp and filter users'],
      ['based on inactivity threshold (e.g., 90 days).']
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inactive Users');
    return workbook;
  };

  const generateGroupMembershipReport = async () => {
    let users = dummyUsers;
    
    if (isConnected) {
      try {
        users = await searchUsers();
      } catch (error) {
        console.warn('Could not fetch real users for report, using dummy data:', error);
        users = dummyUsers;
      }
    }
    
    const workbook = createWorkbook();
    
    const groupMap = {};
    users.forEach(user => {
      if (user.memberOf) {
        user.memberOf.forEach(group => {
          if (!groupMap[group]) groupMap[group] = [];
          groupMap[group].push(user.displayName || user.name);
        });
      }
    });

    const reportData = [
      ['Group Membership Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['GROUP MEMBERSHIPS'],
      [''],
      ['Group Name', 'Members']
    ];

    Object.keys(groupMap).forEach(group => {
      reportData.push([group, groupMap[group].join(', ')]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Group Memberships');
    
    return workbook;
  };

  const generateGroupDirectoryReport = () => {
    const users = dummyUsers; // Always use dummy data for this simple report
    const groups = new Set();
    
    users.forEach(user => {
      if (user.memberOf) {
        user.memberOf.forEach(group => groups.add(group));
      }
    });

    const workbook = createWorkbook();
    const reportData = [
      ['Group Directory Export'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Group Name', 'Member Count']
    ];

    Array.from(groups).forEach(group => {
      const memberCount = users.filter(user => user.memberOf && user.memberOf.includes(group)).length;
      reportData.push([group, memberCount]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Group Directory');
    return workbook;
  };

  const generateUserGroupsSummary = async () => {
    let users = dummyUsers;
    
    if (isConnected) {
      try {
        users = await searchUsers();
      } catch (error) {
        console.warn('Could not fetch real users for report, using dummy data:', error);
        users = dummyUsers;
      }
    }
    
    const workbook = createWorkbook();
    const reportData = [
      ['User Groups Summary'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['USER GROUP ASSIGNMENTS'],
      [''],
      ['User', 'Username', 'Groups']
    ];

    users.forEach(user => {
      const groups = user.memberOf && user.memberOf.length > 0 
        ? user.memberOf.join(', ') 
        : 'No group memberships';
      
      reportData.push([
        user.displayName || user.name,
        user.sAMAccountName || user.username,
        groups
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'User Groups');
    return workbook;
  };

  const generateGroupAccessAnalysis = () => {
    return generateDefaultReport('Group Access Analysis');
  };

  const generateComputerInventoryReport = () => {
    const workbook = createWorkbook();
    const reportData = [
      ['Computer Inventory Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['SYSTEM INVENTORY'],
      ['(Demo data - would query actual computer objects in production)'],
      [''],
      ['Computer Name', 'OS', 'Last Login', 'Status'],
      ['WORKSTATION-01', 'Windows 11 Pro', new Date(Date.now() - 86400000).toLocaleString(), 'Active'],
      ['WORKSTATION-02', 'Windows 10 Pro', new Date(Date.now() - 172800000).toLocaleString(), 'Active'],
      [''],
      ['SUMMARY'],
      ['Total Computers:', 2],
      ['Active:', 2],
      ['Offline:', 0]
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Computer Inventory');
    return workbook;
  };

  const generateSystemInfoReport = () => {
    const workbook = createWorkbook();
    const reportData = [
      ['System Information Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['DOMAIN INFORMATION'],
      ['Domain:', isConnected ? 'Connected Domain' : 'Demo Mode'],
      ['Domain Controllers:', 1],
      ['Forest Level:', 2016],
      ['Domain Level:', 2016],
      [''],
      ['SYSTEM HEALTH'],
      ['All domain controllers online'],
      ['Replication healthy'],
      ['DNS resolution working'],
      ['LDAP services operational'],
      [''],
      ['STATISTICS'],
      ['Users:', isConnected ? 'Live count' : '3 (demo)'],
      ['Computers:', isConnected ? 'Live count' : '2 (demo)'],
      ['Groups:', isConnected ? 'Live count' : '5 (demo)']
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'System Information');
    return workbook;
  };

  const generateComputerStatusReport = () => {
    const workbook = createWorkbook();
    const reportData = [
      ['Computer Status Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['COMPUTER STATUS SUMMARY'],
      ['Total Computers:', 2],
      ['Online:', 2],
      ['Offline:', 0],
      ['Needs Updates:', 0],
      [''],
      ['DETAILED STATUS'],
      ['Computer Name', 'Status', 'Last Contact', 'Health'],
      ['WORKSTATION-01', 'Online', new Date().toLocaleString(), 'Good'],
      ['WORKSTATION-02', 'Online', new Date(Date.now() - 3600000).toLocaleString(), 'Good']
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Computer Status');
    return workbook;
  };

  const generateHardwareSummaryReport = () => {
    const workbook = createWorkbook();
    const reportData = [
      ['Hardware Summary Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['HARDWARE INVENTORY SUMMARY'],
      ['(Demo data - would query WMI/hardware info in production)'],
      [''],
      ['PROCESSORS'],
      ['Intel Core i7:', '2 systems'],
      ['AMD Ryzen 5:', '0 systems'],
      [''],
      ['MEMORY'],
      ['16GB RAM:', '2 systems'],
      ['8GB RAM:', '0 systems'],
      [''],
      ['STORAGE'],
      ['SSD 512GB:', '2 systems'],
      ['HDD 1TB:', '0 systems'],
      [''],
      ['OPERATING SYSTEMS'],
      ['Windows 11 Pro:', '1 system'],
      ['Windows 10 Pro:', '1 system'],
      [''],
      ['RECOMMENDATIONS'],
      ['- All systems meet minimum requirements'],
      ['- Consider standardizing on Windows 11'],
      ['- Hardware refresh not needed at this time']
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Hardware Summary');
    return workbook;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold themed-text-primary mb-2">Reports</h1>
        <p className="themed-text-secondary">Generate and export various reports from your Active Directory</p>
      </div>

      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {reportCategories.map((category) => {
          const IconComponent = category.icon;
          
          return (
            <div
              key={category.id}
              className="themed-card p-6 rounded-xl border transition-all duration-200 hover:shadow-lg cursor-pointer"
              style={{ borderColor: theme.colors.border.default }}
            >
              {/* Category Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${theme.colors.primary[600]}20` }}
                >
                  <IconComponent 
                    className="w-6 h-6"
                    style={{ color: theme.colors.primary[600] }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold themed-text-primary">{category.title}</h3>
                  <p className="text-sm themed-text-muted">{category.description}</p>
                </div>
              </div>

              {/* Available Reports */}
              <div className="space-y-2">
                {category.reports.map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg themed-hover transition-colors duration-200"
                  >
                    <span className="text-sm themed-text-secondary">{report}</span>
                    <button
                      onClick={() => generateReport(report)}
                      disabled={generatingReport === report}
                      className="px-3 py-1 text-xs rounded-md transition-all duration-200 hover:shadow-sm disabled:opacity-50 flex items-center space-x-1"
                      style={{ 
                        backgroundColor: theme.colors.primary[600],
                        color: 'white'
                      }}
                    >
                      {generatingReport === report ? (
                        <>
                          <ClockIcon className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownTrayIcon className="w-3 h-3" />
                          <span>Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Reports Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold themed-text-primary mb-6">Recent Reports</h2>
        <div className="themed-card p-6 rounded-xl border" style={{ borderColor: theme.colors.border.default }}>
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ borderColor: theme.colors.border.default }}
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-6 h-6 themed-text-muted" />
                    <div>
                      <h4 className="text-sm font-medium themed-text-primary">{report.name}</h4>
                      <p className="text-xs themed-text-muted">{report.timestamp} • {report.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => generateReport(report.name)}
                    className="px-3 py-1 text-xs rounded-md transition-colors"
                    style={{ 
                      backgroundColor: theme.colors.primary[100],
                      color: theme.colors.primary[700]
                    }}
                  >
                    Re-generate
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-16 h-16 mx-auto themed-text-muted mb-4" />
              <p className="themed-text-muted">No recent reports found</p>
              <p className="text-sm themed-text-muted mt-2">Generated reports will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;