# Helix - Active Directory Management Tool

**Version 3.4.2** | A modern desktop application for managing Active Directory environments

---

## What is Helix?

Helix (Active Vector) is a Windows desktop application that makes it easy for IT administrators to manage users, computers, and groups in Active Directory. Think of it as a user-friendly control panel for your company's network resources.

Instead of using complex command-line tools or multiple different programs, Helix brings everything you need into one modern, easy-to-use interface.

---

## Who is this for?

- **IT Administrators** managing Windows networks
- **Help Desk Technicians** supporting users and resetting passwords
- **System Administrators** overseeing specific departments or organizational units
- **Compliance Officers** generating reports and auditing access

---

## What can Helix do?

### 👥 User Management
- View all users in your organization
- Create new user accounts
- Reset passwords when users forget them
- Enable or disable accounts
- Update user information (email, phone, department, etc.)
- Manage group memberships (which teams/groups users belong to)

### 💻 Computer Management
- View all computers on your network
- Check computer status and system information
- Manage user profiles on computers
- Restart computers remotely
- Check disk space usage
- Enable remote management features

### 👪 Group Management
- View and create groups
- Add or remove users from groups
- Manage permissions and access control

### 📊 Reports
- Generate Excel reports with just one click
- Export user directories
- Create computer inventory lists
- Analyze group memberships
- All reports download as ready-to-use Excel files

### 🔧 Quick Access Tools
- **ADUC**: Launch Active Directory Users and Computers
- **Group Policy Manager**: Manage network policies
- **PowerShell**: Direct access to advanced tools
- **Printer Installation**: Set up network printers remotely

---

## Key Features

### ✨ Easy to Use
- Modern, clean interface that's intuitive to navigate
- No technical jargon - everything is clearly labeled
- Real-time search and filtering to find what you need quickly

### 🔒 Secure
- Uses your existing Active Directory credentials
- Supports Kerberos authentication for enhanced security
- Credentials stored only in memory, never written to disk
- All connections use secure protocols

### 📦 Portable
- Single executable file (~85MB)
- No installation required - just download and run
- Carry it on a USB drive if needed
- No configuration files left behind

### ⚡ Fast
- Instant search results
- Quick access to common tasks
- Optimized for performance

### 🎯 Targeted Management
- Focus on specific departments or organizational units
- See only the users and computers you're responsible for
- Avoid accidentally modifying resources outside your scope

---

## How to Get Started

### Prerequisites
- Windows 10 or Windows Server 2016 (or newer)
- Domain account with appropriate permissions
- Network access to your domain controllers
- PowerShell with Active Directory module installed

### Running Helix
1. Download `Helix-v3.4.2.exe`
2. Double-click to launch (no installation needed)
3. Click "Settings" in the left sidebar
4. Enter your domain controller information:
   - **Server**: Your domain name (e.g., `company.local`)
   - **Username**: Your admin account
   - **Password**: Your password
   - **Parent OU** (optional): Focus on a specific department
5. Click "Test Connection" to verify
6. Click "Connect" when the test succeeds

That's it! You're ready to start managing your Active Directory.

---

## Common Tasks

### Reset a User's Password
1. Click "Users" in the left sidebar
2. Search for the user by name
3. Click on the user to open their details
4. Click "Reset Password"
5. Enter the new password
6. Done!

### Create a New User Account
1. Go to "Users"
2. Click "Create User" button
3. Fill in the required information (name, username, email)
4. Set an initial password
5. Click "Create"

### Generate a User Report
1. Click "Reports" in the left sidebar
2. Choose a report type (e.g., "User Directory Export")
3. Click "Generate"
4. The Excel file downloads automatically

### Check Computer Disk Space
1. Go to "Computers"
2. Search for the computer
3. Click on it to open details
4. View disk space information in real-time

---

## Why Helix Instead of Built-in Tools?

| Helix | Traditional Tools |
|------|------------------|
| ✅ Modern, clean interface | ❌ Complex, dated interfaces |
| ✅ All tasks in one place | ❌ Multiple separate programs |
| ✅ One-click Excel reports | ❌ Manual data export and formatting |
| ✅ Real-time search | ❌ Slow, manual browsing |
| ✅ No installation needed | ❌ Complex setup and dependencies |
| ✅ Works on any Windows PC | ❌ Requires specific server versions |

---

## System Requirements

**Minimum:**
- Windows 10 or Windows Server 2016+
- 4GB RAM (8GB recommended)
- 200MB free disk space
- Network connectivity to domain controllers
- PowerShell 5.0 or higher with Active Directory module

**Recommended:**
- Windows 11 or Windows Server 2022
- 8GB+ RAM
- SSD storage
- Gigabit network connection

---

## Troubleshooting

### "Cannot connect to Active Directory"
- Verify your domain controller name is correct
- Check that you have network connectivity
- Ensure your username and password are correct
- Confirm the Active Directory module is installed

### "Permission denied" errors
- Make sure your account has the necessary permissions
- Contact your IT administrator to grant appropriate access
- Try running as a different user with admin rights

### Application won't launch
- Ensure you're running on a supported Windows version
- Check that PowerShell 5.0+ is installed
- Try running as administrator

### Remote computer features not working
- WinRM must be enabled on target computers
- Use the "Enable WinRM" button in computer details
- Verify firewall rules allow remote management

---

## Support & Feedback

Found a bug? Have a feature request? Want to provide feedback?

- **Issues**: Report bugs at the project repository
- **Documentation**: Full technical documentation available in `Helix_PRD.md`
- **Updates**: Check for new versions regularly

---

## License & Credits

**Helix v3.4.2**
Built with Electron, React, and PowerShell
© 2025 Helix Team

---

## Version History

### v3.4.2 (Current)
- Added Group Policy Management Console launcher
- Enhanced GPMC path detection for RSAT installations
- Improved credential caching for administrative tools
- Better error handling for profile management
- Fixed version consistency across all UI elements

### v3.4.1
- User profile management with protected account filtering
- System reboot management
- Real-time disk space monitoring
- Enhanced WinRM enablement
- Eliminated PSExec dependency

### v3.3.1
- Modular backend architecture (96% code reduction)
- Performance optimizations
- Enhanced security features
- Improved error isolation

---

**Ready to simplify your Active Directory management? Download Helix and get started today!**
