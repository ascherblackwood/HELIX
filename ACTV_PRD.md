# ActV - Active Directory Management Tool
## Product Requirements Document (PRD)

**Version:** 3.4.2
**Date:** October 2025
**Author:** ActV Team  

---

## 1. Executive Summary

ActV is a comprehensive Windows desktop application designed for IT administrators to manage Active Directory environments with advanced user management, group administration, reporting, and organizational unit-specific operations. Built on Electron framework with React frontend, it provides a unified interface for streamlined AD management with real-time Excel report generation, enhanced security features, and comprehensive remote computer management capabilities including user profile management, system rebooting, and disk space monitoring.

## 2. Product Overview

### 2.1 Vision
To provide IT administrators with a powerful, intuitive desktop tool that streamlines Active Directory management within specific organizational units, reducing administrative overhead and improving operational efficiency through modern UI and comprehensive reporting.

### 2.2 Mission
Simplify complex AD operations through an elegant desktop interface while providing advanced user and group management capabilities, comprehensive Excel-based reporting, and OU-specific administrative control.

## 3. Target Audience

### Primary Users
- **IT System Administrators** - Managing Windows domains and Active Directory
- **OU Administrators** - Managing specific organizational units within larger domains
- **Help Desk Technicians** - Supporting end users and managing user accounts
- **Compliance Officers** - Generating reports and auditing user access

### Use Cases
- Daily Active Directory user and group management within specific OUs
- Advanced group membership management with searchable interfaces
- Excel report generation for compliance and auditing
- OU-specific system monitoring and statistics
- User account lifecycle management
- Remote computer management with user profile administration
- System maintenance operations including reboots and disk monitoring
- Automated WinRM enablement for remote operations

## 4. Product Architecture

### 4.1 Technical Stack
- **Frontend:** React 18.2.0 with Tailwind CSS 3.3.3
- **Desktop Framework:** Electron 26.6.10
- **Icons:** HeroIcons 2.0.18
- **Routing:** React Router DOM 6.15.0
- **Reporting:** XLSX library for Excel generation
- **Backend Integration:** PowerShell, Active Directory module, LDAP

### 4.2 Application Structure
- **Portable Executable:** Single .exe file for easy deployment
- **Self-Contained:** No installation required - runs directly from executable
- **Windows Native Integration:** Full PowerShell and Active Directory integration
- **Secure Architecture:** Context isolation and secure IPC communication
- **Modular Backend Architecture:** Functional separation for improved performance and maintainability

#### 4.2.1 Modular Handler Architecture
**Core Architecture:**
- `main.js` (79 lines) - Lightweight main process with window management and handler registration
- `utils/powershell.js` - Shared PowerShell utilities and authentication helpers
- `handlers/` directory - Functionally separated IPC handler modules

**Handler Modules:**
- `handlers/auth.js` - LDAP connection, Kerberos authentication, and ADUC launching
- `handlers/users.js` - User management operations (create, update, password reset, account toggle, group membership)
- `handlers/computers.js` - Computer management, WinRM operations, and printer management
- `handlers/groups.js` - Group management, creation, and OU tree operations
- `handlers/system.js` - System operations (user profiles, disk monitoring, reboots, session management)
- `handlers/ldap.js` - LDAP search operations, AD counting, and computer inventory collection

**Performance Benefits:**
- **96% reduction** in main.js file size (from 2,207 to 79 lines)
- **Faster startup times** through optimized code loading
- **Better memory management** with V8 module caching
- **Enhanced error isolation** per functional domain
- **Improved maintainability** with logical code separation

### 4.3 Build & Packaging (Current Build)
- Builder: electron-builder 24.x
- Target: Windows portable (single-file .exe)
- Output: `dist-build/ActV-v3.4.2.exe` (filename reflects semver without leading zeros)
- ASAR: enabled
- Included: `build/**`, `main.js`, `preload.js`, `node_modules/**`, `src/assets/**`, `handlers/**`, `utils/**`, `PrinterManagement.ps1`
- Icon: `src/assets/actv.ico`
- App ID: `com.actv.admanager`
- Size: ~85MB portable executable

## 5. Core Features

### 5.1 Navigation & UI
**Main Navigation Rail:**
- Admin Dashboard with OU-specific metrics
- Users Management with advanced filtering
- Computers Management with system information
- Groups Administration with membership management
- Reports Center with Excel export functionality
- Knowledge Base — searchable placeholder articles
- Settings Configuration with connection management

**UI Features:**
- Modern responsive design optimized for desktop
- Real-time status indicators and loading states
- Context-sensitive modals and actions
- Comprehensive error handling with user feedback
- Professional ActV branding throughout

### 5.2 Admin Dashboard
**Current Implementation:**
- **OU-Specific Metrics:** Shows counts only from currently selected organizational unit
- **Real-time Statistics:** Live user, computer, and group counts
- **Connection Status:** Visual indicators for AD connectivity and authentication method
- **System Information:** Platform details, hostname, and version information
- **Quick Actions:** Sync AD data, backup settings, view logs
- **Demo Mode Support:** Fallback data when not connected to AD

**Key Features:**
- Domain status with parent OU display
- Enhanced Security Mode indicator
- Last sync timestamp tracking
- System overview with current OU/Demo Data indicators

### 5.3 User Management
**Core Capabilities:**
- **OU-Scoped User Browsing:** Users displayed only from current organizational unit
- **Advanced Search and Filtering:** Real-time user search across multiple attributes
- **User Property Management:** Complete user information editing and viewing
- **Account Status Management:** Enable/disable accounts with real-time updates
- **Description Field Support:** Proper display of Active Directory description attribute

**Advanced Group Management:**
- **Interactive Group Modal:** Searchable group management interface
- **Real-time Group Search:** Filter available groups by name with instant results
- **Manual Group Entry:** Add users to custom or unlisted groups
- **Group Membership Display:** Visual group badges with remove functionality
- **AD Integration:** Real-time add/remove operations with Active Directory
- **Loading States:** Visual feedback during group operations

**User Detail Features:**
- Comprehensive user information display
- Contact information management
- Account information and password controls
- Group membership management with visual interface
- Account actions (reset password, enable/disable, update information)

### 5.4 Computer Management
**Primary Features:**
- Active Directory computer object management within current OU
- Computer inventory and status tracking
- System information display
- OU-scoped computer statistics
- **Enhanced Remote Management Capabilities**

#### Inventory Resolution (Local/Remote)
- The Details modal requests inventory via `get-computer-inventory(<computerName>)`.
- Local detection: If the name matches this host (case-insensitive, FQDN handled, also `LOCALHOST`/`127.0.0.1`), inventory is collected locally via CIM — no WinRM required.
- Remote: Uses CIM over WinRM (Negotiate) for other hosts.
- Robust field population:
  - IP address: from `Win32_NetworkAdapterConfiguration` IPv4; fallback to `Get-NetIPAddress` (IPv4, non‑APIPA).
  - Domain: from `Win32_ComputerSystem.Domain`.
  - MAC address: from first enabled adapter with MAC.
  - Memory: rounded GB from `TotalPhysicalMemory`.
  - Last boot: safe conversion from DateTime or DMTF string.
- UI maps these live fields: PC Make, Model, Serial Number, Installed Memory, IP Address, Domain, MAC Address, Processor. If unavailable, shows "N/A" (no placeholders).

#### WinRM Enablement (Remote Session)
- Test WinRM connectivity to a selected computer.
- Attempt to enable WinRM remotely when not reachable.
- Implementation details:
  - **Enhanced PowerShell-based enablement** (no PSExec dependency required)
  - Primary: `Invoke-Command` with `winrm quickconfig -q -force` on target
  - Fallback 1: `sc.exe` service control commands for WinRM service
  - Fallback 2: Registry modifications for WinRM configuration
  - Re-tests connection and surfaces result in the UI.
  - Exposed via IPC: `test-winrm`, `enable-winrm` (see preload `electronAPI`).
  - UI: Action button in Computer Details → Actions → "Enable WinRM".

#### User Profile Management (NEW)
- **Comprehensive user profile administration** for selected computers
- **Protected account filtering** - Automatically hides system and protected accounts:
  - Built-in Administrator (RID 500) and Guest (RID 501) accounts
  - System accounts (SYSTEM, LOCAL SERVICE, NETWORK SERVICE)
  - Service accounts (NT SERVICE\\*, NT AUTHORITY\\*, *SERVICE*)
  - Special accounts (DefaultAccount, WDAGUtilityAccount, Public)
- **Profile enumeration** via PowerShell registry and WMI methods
- **Batch profile deletion** with safety confirmations
- **Smart connectivity** - Automatically tests WinRM before remote operations
- **Enhanced error handling** with troubleshooting guidance and automated remediation
- **Implementation details:**
  - Primary: PowerShell registry access via `Get-ChildItem` and `Get-ItemProperty`
  - Fallback: WMI `Win32_UserProfile` class enumeration
  - Remote execution via `Invoke-Command` for WinRM-enabled targets
  - Local execution for same-machine operations
  - Profile deletion via `Remove-CimInstance` with Win32_UserProfile

#### System Reboot Management (NEW)
- **Remote computer restart capabilities** with administrative privileges
- **Safety confirmations** with warnings about process interruption
- **Dual-method implementation:**
  - Primary: PowerShell `Restart-Computer` cmdlet
  - Fallback: `shutdown.exe` command with forced restart
- **Real-time status feedback** during reboot operations
- **Error handling** with descriptive messages for failed operations

#### Disk Space Monitoring (NEW)
- **Real-time disk usage information** for all logical drives
- **Visual progress indicators** showing disk utilization percentages
- **Comprehensive metrics display:**
  - Total disk size in GB
  - Free space available in GB
  - Used space in GB
  - Free space percentage
  - Color-coded visual indicators
- **Multi-drive support** with grid layout for multiple drives
- **Implementation via CIM queries** using `Win32_LogicalDisk` class
- **Local and remote compatibility** with automatic detection

### 5.5 Groups Management
**Enhanced Group Administration:**
- Active Directory group browsing within current OU
- Group creation and modification
- Advanced membership management
- Nested group support
- Security and distribution group handling

### 5.6 Reports Center
**Complete Excel Integration:**
All reports generate as downloadable Excel (.xls) files with professional formatting:

**User Reports:**
- **User Activity Summary:** Detailed user information with summary statistics
- **User Directory Export:** Clean CSV-style export of user data in Excel format
- **User Contact Information:** Contact details in tabular Excel format
- **Inactive Users Report:** Analysis template for inactive user accounts

**Group Reports:**  
- **Group Membership Report:** Shows which users belong to which groups
- **Group Directory Export:** Summary of all groups with member counts
- **User Groups Summary:** Lists all users and their group memberships
- **Group Access Analysis:** Template for access pattern analysis

**Computer Reports:**
- **Computer Inventory:** System inventory with OS and status information
- **System Information Report:** Domain and system health information in Excel
- **Computer Status Report:** Detailed computer status and health metrics
- **Hardware Summary Report:** Hardware inventory and recommendations

**Report Features:**
- **Real Data Integration:** Reports use actual AD data when connected
- **Professional Formatting:** Excel sheets with headers, data organization, and spacing
- **Fallback Support:** Demo data when not connected to Active Directory
- **File Naming:** Descriptive names with date stamps
- **Recent Reports:** Tracking and re-generation capability
- **Download Management:** Automatic file download with progress indicators

### 5.7 Settings & Configuration
**LDAP/Active Directory Configuration:**
- **Domain Controller Connection:** Server and port configuration
- **Authentication Management:** Username/password with secure storage
- **Parent OU Selection:** Organizational unit scoping for all operations
- **Kerberos Support:** Enhanced security authentication
- **SSL/TLS Options:** Secure connection configuration

**Connection Features:**
- **Real-time Validation:** Connection testing with detailed feedback
- **Authentication Methods:** Support for standard LDAP and Kerberos
- **OU-Specific Operations:** All searches and operations limited to selected OU
- **Connection Status:** Visual indicators and detailed connection information

## 6. Technical Requirements

### 6.1 System Requirements
**Minimum Requirements:**
- Windows 10 or Windows Server 2016+
- 4GB RAM (8GB recommended)
- 200MB free disk space
- Network connectivity to domain controllers
- PowerShell 5.0 or higher with Active Directory module

**Administrative Requirements:**
- Domain privileges appropriate for target OU operations
- Active Directory user account with necessary permissions
- Network access to domain controllers (LDAP/LDAPS)

### 6.2 Network Requirements
- LDAP/LDAPS access to domain controllers (ports 389/636)
- DNS resolution for domain controller discovery
- Network connectivity to organizational unit containers

### 6.3 Security Features
- **Secure Credential Storage:** Encrypted credential management
- **Context Isolation:** Secure frontend/backend separation
- **Audit Logging:** Console and localStorage debugging
- **Error Handling:** Graceful degradation with security considerations
- **Session Management:** Secure connection state management

## 7. Integration Capabilities

### 7.1 Active Directory Integration
**PowerShell-Based Operations:**
- **Get-ADUser:** User querying with property filtering
- **Set-ADUser:** User property updates and account management
- **Get-ADGroup:** Group enumeration and filtering  
- **Add-ADGroupMember/Remove-ADGroupMember:** Group membership management
- **Get-ADComputer:** Computer object management

**OU-Specific Operations:**
- **Scoped Searches:** All queries limited to configured parent OU
- **Hierarchical Support:** Support for nested OU structures
- **Permission-Based:** Operations respect user's AD permissions

### 7.2 Excel Integration
- **XLSX Library:** Professional Excel file generation
- **Multiple Sheets:** Support for complex report structures
- **Data Formatting:** Proper headers, data types, and styling
- **Large Data Sets:** Efficient handling of enterprise-scale data

## 8. User Experience

### 8.1 Workflow Examples

**Group Management Workflow:**
1. Open user from Users tab
2. Click user to open detailed modal
3. Navigate to Groups & Permissions section
4. Click "Manage" button to open group management modal
5. Search for groups using real-time filter
6. Add groups by clicking "Add" button next to desired groups
7. Or manually enter group names in custom field
8. Remove groups using "Remove" button next to current memberships
9. Real-time feedback shows success/failure of each operation
10. Groups are immediately updated in Active Directory

**Report Generation Workflow:**
1. Navigate to Reports tab
2. Select desired report category (User, Group, or Computer)
3. Click "Generate" button next to specific report
4. System shows loading spinner during generation
5. Excel file automatically downloads when complete
6. Report appears in "Recent Reports" section
7. Can re-generate reports from recent reports list

**OU-Specific Administration:**
1. Configure connection in Settings with specific Parent OU
2. All user/group/computer operations automatically scoped to that OU
3. Admin dashboard shows statistics only for current OU
4. All searches and filters work within OU boundaries
5. Clear indicators show "Current OU" vs "Demo Data" mode

### 8.2 Performance Expectations
**Enhanced Performance (Post-Refactoring):**
- Application startup: < 1.5 seconds (improved from modular architecture)
- Main process initialization: < 500ms (96% code reduction benefit)
- LDAP query response: < 3 seconds for OU-scoped queries
- Group operations: < 5 seconds for add/remove operations
- Report generation: 2-10 seconds depending on data size
- Excel download: Immediate after generation completion
- Memory usage: Reduced baseline consumption through optimized module loading
- Handler response time: < 100ms for local operations, < 2 seconds for remote operations

## 9. Deployment Strategy

### 9.1 Distribution Method
- **Portable Executable:** Single ActV-v3.4.1.exe file (~85MB)
- **No Installation Required:** Copy and run deployment model
- **Self-Contained:** All dependencies included in executable
- **Version Control:** Clear version identification in filename and UI
- **Enhanced Security:** No external tool dependencies (PSExec eliminated)

### 9.2 Configuration Management
- **Persistent Settings:** Configuration saved across application restarts
- **Connection Profiles:** Support for multiple AD connection configurations
- **Backup/Restore:** Settings backup and restoration capabilities

## 10. Success Metrics

### 10.1 Operational Metrics
- **Time Savings:** Reduced time for group membership management and system administration
- **Accuracy Improvement:** Fewer errors in user/group operations and system management
- **Report Efficiency:** Faster generation of compliance and audit reports
- **OU Management:** Improved control and visibility within organizational units
- **Remote Management Efficiency:** Streamlined computer administration without manual interventions
- **System Maintenance:** Automated disk monitoring and user profile cleanup capabilities
- **Security Compliance:** Protected account filtering ensures system integrity

### 10.2 User Satisfaction Metrics
- **Adoption Rate:** Percentage of IT staff actively using ActV
- **Feature Utilization:** Most-used features and workflows
- **Error Reduction:** Decreased AD management errors and issues
- **Productivity Gains:** Measurable improvements in administrative efficiency

## 11. Future Roadmap

### 11.1 Near-Term Enhancements (Next 6 months)
- **Advanced Filtering:** More sophisticated search and filter options
- **Batch Operations:** Bulk user and group management capabilities
- **Enhanced Reporting:** Additional report types and customization
- **Audit Trail:** Comprehensive logging of all AD operations

### 11.2 Long-Term Vision (6-12 months)
- **Multi-Domain Support:** Cross-domain and forest-wide operations
- **Automated Tasks:** Scheduled operations and maintenance tasks
- **Integration APIs:** REST API for third-party integration
- **Mobile Companion:** Read-only mobile app for monitoring

## 12. Risk Assessment

### 12.1 Technical Risks
- **PowerShell Dependencies:** Reliance on PowerShell Active Directory module
- **Network Connectivity:** Dependency on stable domain controller connectivity
- **Permission Changes:** Changes to user's AD permissions affecting functionality
- **Windows Updates:** Potential compatibility issues with OS updates

### 12.2 Mitigation Strategies
- **Graceful Degradation:** Fallback modes for limited connectivity
- **Error Handling:** Comprehensive error reporting and recovery
- **Permission Validation:** Real-time validation of user permissions
- **Testing Framework:** Regular compatibility testing with Windows updates

---

## Appendix A: Current API Endpoints

### Main Process IPC Handlers
- `ldap-connect`: Active Directory connection with Kerberos support
- `ldap-search`: OU-scoped Active Directory queries
- `get-system-info`: Local system and application information
- `get-ad-counts`: Domain-wide AD statistics (legacy)
- `get-ou-counts`: OU-specific statistics (current implementation)
- `add-user-to-group`: Real-time group membership addition
- `remove-user-from-group`: Real-time group membership removal
- `update-ad-user`: User property updates in Active Directory
- `reset-ad-password`: User password reset operations
- `toggle-ad-user-account`: Account enable/disable operations

### Remote Management & Inventory
- `test-winrm`: Check WinRM connectivity to target.
- `enable-winrm`: Enable WinRM remotely using PowerShell multi-method approach (no PSExec dependency).
- `install-printer`: Install a network printer on a target.
- `get-computer-inventory`: Live inventory (local CIM or remote CIM over WinRM) returning:
  - `computerName`, `manufacturer`, `model`, `serialNumber`, `processor`, `memory`, `os`, `osVersion`,
  - `ipAddress`, `macAddress`, `lastBootTime`, `currentUser`, `domain`.
- Printer server helpers: `test-printer-server`, `open-printer-server`.

### User Profile Management (NEW)
- `get-user-profiles`: Enumerate user profiles on target computer with protected account filtering:
  - Returns: `Username`, `SID`, `ProfilePath`, `Size`, `Type`
  - Filters out: Administrator, Guest, System accounts, Service accounts
  - Implementation: PowerShell registry queries with WMI fallback
- `delete-user-profiles`: Remove selected user profiles and registry entries:
  - Batch deletion support with safety confirmations
  - Uses `Remove-CimInstance` with Win32_UserProfile class
  - Comprehensive error handling and status reporting

### System Management (NEW)
- `reboot-computer`: Remote computer restart operations:
  - Primary: PowerShell `Restart-Computer` cmdlet
  - Fallback: `shutdown.exe` command with forced restart
  - Safety confirmations and real-time status feedback
- `get-disk-space`: Real-time disk usage monitoring:
  - Returns: Drive letters, total size, free space, used space, percentages
  - Multi-drive support with visual progress indicators
  - Implementation: CIM queries using `Win32_LogicalDisk` class

### Window Controls
- `window-minimize`, `window-maximize`, `window-close`.

## Appendix B: Data Models

### User Object Structure
```javascript
{
  id: "objectGUID or sAMAccountName",
  cn: "Common Name",
  sAMAccountName: "username",
  mail: "email@domain.com",
  displayName: "Display Name",
  title: "Job Title",
  department: "Department",
  description: "AD Description Attribute",
  memberOf: ["Group1", "Group2"],
  userAccountControl: 512,
  // ... additional AD attributes
}
```

### Connection Configuration
```javascript
{
  server: "domain.local",
  port: 636,
  username: "admin@domain.local", 
  password: "encrypted_password",
  parentOU: "OU=Users,DC=domain,DC=local",
  useKerberos: true,
  useSSL: true
}
```

### Computer Inventory Object
```javascript
{
  computerName: "HOST123",
  manufacturer: "Dell Inc.",
  model: "OptiPlex 7090",
  serialNumber: "XXXXXXX",
  processor: "Intel Core i7",
  memory: "32 GB",
  os: "Windows 11 Pro",
  osVersion: "10.0.26100",
  ipAddress: "192.168.1.50",
  macAddress: "00:11:22:33:44:55",
  lastBootTime: "2025-09-07T14:57:36.500-07:00",
  currentUser: "DOMAIN\\user",
  domain: "DOMAIN"
}
```

### User Profile Object (NEW)
```javascript
{
  Username: "john.doe",
  SID: "S-1-5-21-1234567890-1234567890-1234567890-1001",
  ProfilePath: "C:\\Users\\john.doe",
  Size: "Calculating...", // Or actual size in GB
  Type: "Regular User"
}
```

### Disk Space Object (NEW)
```javascript
{
  Drive: "C:",
  TotalSize: "500.00 GB",
  FreeSpace: "125.50 GB",
  UsedSpace: "374.50 GB",
  FreePercent: "25.1%",
  TotalBytes: 537673515008,
  FreeBytes: 134678896640
}
```

---

*This PRD reflects ActV v3.4.1 as of October 2025 and serves as the comprehensive specification for current and planned functionality.*

## 13. Release Notes

### 13.1 Release Notes (v3.2.1) - CURRENT
**Major Feature Enhancements:**

**⚡ Architecture Refactoring (NEW):**
- **Modular Backend Architecture**: Complete refactoring of main.js from 2,207 lines to 79 lines (96% reduction)
- **Functional Handler Separation**: 6 specialized handler modules for improved maintainability
  - `handlers/auth.js` - Authentication and LDAP connections
  - `handlers/users.js` - User management operations
  - `handlers/computers.js` - Computer and printer management
  - `handlers/groups.js` - Group and OU operations
  - `handlers/system.js` - System administration features
  - `handlers/ldap.js` - LDAP search and inventory operations
- **Performance Optimization**: Faster startup times and reduced memory consumption
- **Enhanced Error Isolation**: Better debugging and error handling per functional domain
- **Shared Utilities**: `utils/powershell.js` for common PowerShell operations

**🔧 Enhanced Computer Management:**
- **User Profile Management**: Complete user profile administration with protected account filtering
  - Automatically filters out Administrator, Guest, and system accounts for safety
  - Batch profile deletion with comprehensive safety confirmations
  - Smart WinRM connectivity testing and automated remediation
  - Dual-method profile enumeration (PowerShell registry + WMI fallback)
- **System Reboot Management**: Remote computer restart capabilities with safety confirmations
- **Disk Space Monitoring**: Real-time disk usage visualization with multi-drive support and progress indicators

**🛠️ Technical Improvements:**
- **Eliminated PSExec Dependency**: Replaced with pure PowerShell-based remote operations
- **Enhanced WinRM Enablement**: Multi-method approach with automatic fallbacks
  - Primary: `Invoke-Command` with `winrm quickconfig`
  - Fallback 1: Service control commands (`sc.exe`)
  - Fallback 2: Registry modifications for WinRM configuration
- **Improved Error Handling**: Comprehensive troubleshooting guidance and automated remediation
- **PowerShell Data Type Fixes**: Resolved MI type compatibility issues for stable remote operations

**🔒 Security Enhancements:**
- **Protected Account Filtering**: Comprehensive system account protection
  - SID-based filtering for well-known accounts (S-1-5-18, S-1-5-19, S-1-5-20, RID 500/501)
  - Name-based filtering for service accounts and system profiles
  - Conservative approach with multiple exclusion criteria
- **Enhanced Safety Confirmations**: Multi-level warnings for destructive operations

**🎨 User Interface Improvements:**
- **Enhanced User Profiles Modal**: Clear messaging about filtered accounts with troubleshooting guidance
- **Visual Disk Space Display**: Color-coded progress bars and comprehensive metrics
- **Improved Error Messages**: Context-aware guidance and automated solution suggestions
- **Professional Modal Design**: Consistent styling with improved user experience

**📦 Build & Distribution:**
- **Updated Version**: v3.4.1 (from v3.3.1) following semantic versioning
- **Build Output**: `dist-build/ActV-v3.4.1.exe` (~85MB portable executable)
- **No Installation Required**: Single-file portable deployment maintained
- **Enhanced API Surface**: 6 new IPC handlers for extended functionality

### 13.2 Previous Release Notes (v3.02.01)
- Computer Details uses local CIM for this machine (no WinRM) with accurate Manufacturer/Model/Serial/Memory/IP.
- Safe last-boot time handling (supports DateTime and DMTF formats).
- IPv4 detection hardened with `Get-NetIPAddress` fallback; Domain and MAC wired from live inventory.
- Added Enable WinRM action that tests, enables, and re-tests connectivity.
- Built as a single-file portable .exe via electron-builder; ASAR enabled.
