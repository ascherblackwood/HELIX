# KnowledgePage.ps1 - Knowledge Base page for Act.V PowerShell

function Show-KnowledgePage {
    param([System.Windows.Forms.Control]$Parent)

    $colors = Get-ThemeColors

    # Main container
    $container = New-Object System.Windows.Forms.Panel
    $container.Dock = [System.Windows.Forms.DockStyle]::Fill
    $container.AutoScroll = $true
    $container.BackColor = $colors.Background
    $Parent.Controls.Add($container)

    # Page title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Knowledge Base"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Active Directory administration guides and troubleshooting"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $subtitleLabel.ForeColor = $colors.TextSecondary
    $subtitleLabel.Location = New-Object System.Drawing.Point(30, 70)
    $subtitleLabel.AutoSize = $true
    $container.Controls.Add($subtitleLabel)

    # Search box
    $searchPanel = New-Object System.Windows.Forms.Panel
    $searchPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), 50)
    $searchPanel.Location = New-Object System.Drawing.Point(30, 120)
    $searchPanel.BackColor = $colors.Background
    $container.Controls.Add($searchPanel)

    $searchBox = New-Object System.Windows.Forms.TextBox
    $searchBox.Size = New-Object System.Drawing.Size(400, 30)
    $searchBox.Location = New-Object System.Drawing.Point(0, 10)
    $searchBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    # Note: PlaceholderText not available in older .NET Framework versions
    $searchPanel.Controls.Add($searchBox)

    $searchBtn = New-Object System.Windows.Forms.Button
    $searchBtn.Text = "Search"
    $searchBtn.Size = New-Object System.Drawing.Size(100, 35)
    $searchBtn.Location = New-Object System.Drawing.Point(420, 7)
    $searchBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $searchBtn.BackColor = $colors.Primary
    $searchBtn.ForeColor = [System.Drawing.Color]::White
    $searchBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $searchBtn.FlatAppearance.BorderSize = 0
    $searchBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $searchPanel.Controls.Add($searchBtn)

    # Categories and articles
    $contentPanel = New-Object System.Windows.Forms.Panel
    $contentPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), ($Parent.Height - 220))
    $contentPanel.Location = New-Object System.Drawing.Point(30, 190)
    $contentPanel.BackColor = $colors.Background
    $container.Controls.Add($contentPanel)

    # Create split container for categories and articles
    $splitContainer = New-Object System.Windows.Forms.SplitContainer
    $splitContainer.Dock = [System.Windows.Forms.DockStyle]::Fill
    $splitContainer.SplitterDistance = 250
    $splitContainer.BackColor = $colors.Background
    $contentPanel.Controls.Add($splitContainer)

    # Categories panel (left side)
    $categoriesPanel = $splitContainer.Panel1
    $categoriesPanel.BackColor = $colors.Surface
    $categoriesPanel.Padding = New-Object System.Windows.Forms.Padding(10)

    $categoriesTitle = New-Object System.Windows.Forms.Label
    $categoriesTitle.Text = "Categories"
    $categoriesTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $categoriesTitle.ForeColor = $colors.TextPrimary
    $categoriesTitle.Location = New-Object System.Drawing.Point(10, 10)
    $categoriesTitle.AutoSize = $true
    $categoriesPanel.Controls.Add($categoriesTitle)

    # Categories list
    $categoriesList = New-Object System.Windows.Forms.ListBox
    $categoriesList.Location = New-Object System.Drawing.Point(10, 40)
    $categoriesList.Size = New-Object System.Drawing.Size(220, ($categoriesPanel.Height - 60))
    $categoriesList.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right -bor [System.Windows.Forms.AnchorStyles]::Bottom
    $categoriesList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $categoriesList.BackColor = $colors.Background
    $categoriesList.ForeColor = $colors.TextPrimary

    $categories = @(
        "[SEC] Authentication & Security",
        "[USR] User Management",
        "[PC] Computer Management",
        "[GRP] Group Management",
        "[DC] Domain Controllers",
        "[PS] PowerShell Scripts",
        "[!] Troubleshooting",
        "[RPT] Monitoring & Reports",
        "[REP] Replication",
        "[GPO] GPO Management"
    )

    foreach ($category in $categories) {
        $categoriesList.Items.Add($category)
    }

    $categoriesPanel.Controls.Add($categoriesList)

    # Articles panel (right side)
    $articlesPanel = $splitContainer.Panel2
    $articlesPanel.BackColor = $colors.Background
    $articlesPanel.Padding = New-Object System.Windows.Forms.Padding(10)

    $articlesTitle = New-Object System.Windows.Forms.Label
    $articlesTitle.Text = "Articles"
    $articlesTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $articlesTitle.ForeColor = $colors.TextPrimary
    $articlesTitle.Location = New-Object System.Drawing.Point(10, 10)
    $articlesTitle.AutoSize = $true
    $articlesPanel.Controls.Add($articlesTitle)

    # Articles list
    $articlesList = New-Object System.Windows.Forms.ListView
    $articlesList.Location = New-Object System.Drawing.Point(10, 40)
    $articlesList.Size = New-Object System.Drawing.Size(($articlesPanel.Width - 30), ($articlesPanel.Height - 60))
    $articlesList.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right -bor [System.Windows.Forms.AnchorStyles]::Bottom
    $articlesList.View = [System.Windows.Forms.View]::Details
    $articlesList.FullRowSelect = $true
    $articlesList.GridLines = $true
    $articlesList.MultiSelect = $false
    $articlesList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $articlesList.BackColor = $colors.Surface
    $articlesList.ForeColor = $colors.TextPrimary

    # Add columns
    $articlesList.Columns.Add("Title", 300)
    $articlesList.Columns.Add("Category", 150)
    $articlesList.Columns.Add("Rating", 80)

    $articlesPanel.Controls.Add($articlesList)

    # Knowledge base articles data
    $Script:KnowledgeArticles = @(
        @{ Title = "How to Reset User Passwords"; Category = "User Management"; Content = "Step-by-step guide to reset user passwords in Active Directory"; Rating = "5/5"; Keywords = @("password", "reset", "user") }
        @{ Title = "Troubleshooting Domain Join Issues"; Category = "Troubleshooting"; Content = "Common domain join problems and their solutions"; Rating = "4/5"; Keywords = @("domain", "join", "computer", "troubleshoot") }
        @{ Title = "Managing Group Memberships"; Category = "Group Management"; Content = "Best practices for managing Active Directory groups"; Rating = "5/5"; Keywords = @("group", "membership", "security") }
        @{ Title = "PowerShell AD Commands Cheat Sheet"; Category = "PowerShell Scripts"; Content = "Essential PowerShell commands for AD administration"; Rating = "5/5"; Keywords = @("powershell", "commands", "script", "automation") }
        @{ Title = "Setting up Kerberos Authentication"; Category = "Authentication & Security"; Content = "Configure Kerberos authentication for enhanced security"; Rating = "4/5"; Keywords = @("kerberos", "authentication", "security", "sso") }
        @{ Title = "Monitoring Domain Controller Health"; Category = "Domain Controllers"; Content = "Tools and techniques for monitoring DC performance"; Rating = "4/5"; Keywords = @("domain controller", "monitoring", "health", "performance") }
        @{ Title = "Creating Custom AD Reports"; Category = "Monitoring & Reports"; Content = "Generate custom reports using PowerShell and AD cmdlets"; Rating = "4/5"; Keywords = @("reports", "powershell", "export", "csv") }
        @{ Title = "Fixing Replication Issues"; Category = "Replication"; Content = "Diagnose and resolve Active Directory replication problems"; Rating = "4/5"; Keywords = @("replication", "troubleshoot", "sync", "domain controller") }
        @{ Title = "Group Policy Best Practices"; Category = "GPO Management"; Content = "Guidelines for effective Group Policy implementation"; Rating = "5/5"; Keywords = @("gpo", "group policy", "best practices", "management") }
        @{ Title = "Automating User Provisioning"; Category = "PowerShell Scripts"; Content = "PowerShell scripts for automated user account creation"; Rating = "4/5"; Keywords = @("automation", "user", "provisioning", "script") }
        @{ Title = "Securing Service Accounts"; Category = "Authentication & Security"; Content = "Best practices for managing service accounts securely"; Rating = "5/5"; Keywords = @("service account", "security", "managed service account") }
        @{ Title = "Computer Account Management"; Category = "Computer Management"; Content = "Managing computer accounts in Active Directory"; Rating = "4/5"; Keywords = @("computer", "account", "management", "domain") }
        @{ Title = "LDAP Query Examples"; Category = "PowerShell Scripts"; Content = "Common LDAP queries for AD administration"; Rating = "4/5"; Keywords = @("ldap", "query", "search", "filter") }
        @{ Title = "Backup and Recovery Procedures"; Category = "Domain Controllers"; Content = "AD backup and disaster recovery procedures"; Rating = "5/5"; Keywords = @("backup", "recovery", "disaster", "restore") }
        @{ Title = "Time Synchronization Issues"; Category = "Troubleshooting"; Content = "Resolving time sync problems in AD environments"; Rating = "3/5"; Keywords = @("time", "sync", "ntp", "kerberos") }
    )

    # Event handlers
    $categoriesList.Add_SelectedIndexChanged({
        if ($categoriesList.SelectedIndex -ge 0) {
            $selectedCategory = $categoriesList.SelectedItem.ToString().Substring(6) # Remove prefix
            Load-ArticlesByCategory -Category $selectedCategory -ListView $articlesList
        }
    })

    $searchBtn.Add_Click({
        Search-Articles -SearchText $searchBox.Text -ListView $articlesList
    })

    $searchBox.Add_KeyDown({
        if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Enter) {
            Search-Articles -SearchText $searchBox.Text -ListView $articlesList
        }
    })

    $articlesList.Add_DoubleClick({
        if ($articlesList.SelectedItems.Count -gt 0) {
            $selectedArticle = $articlesList.SelectedItems[0].Tag
            Show-ArticleDialog -Article $selectedArticle -Parent $Script:MainForm
        }
    })

    # Load all articles initially
    Load-AllArticles -ListView $articlesList

    # Auto-select first category
    $categoriesList.SelectedIndex = 0
}

# Load articles by category
function Load-ArticlesByCategory {
    param(
        [string]$Category,
        [System.Windows.Forms.ListView]$ListView
    )

    $ListView.Items.Clear()

    $filteredArticles = $Script:KnowledgeArticles | Where-Object { $_.Category -eq $Category }

    foreach ($article in $filteredArticles) {
        $item = New-Object System.Windows.Forms.ListViewItem($article.Title)
        $item.SubItems.Add($article.Category)
        $item.SubItems.Add($article.Rating)
        $item.Tag = $article
        $ListView.Items.Add($item)
    }
}

# Load all articles
function Load-AllArticles {
    param([System.Windows.Forms.ListView]$ListView)

    $ListView.Items.Clear()

    foreach ($article in $Script:KnowledgeArticles) {
        $item = New-Object System.Windows.Forms.ListViewItem($article.Title)
        $item.SubItems.Add($article.Category)
        $item.SubItems.Add($article.Rating)
        $item.Tag = $article
        $ListView.Items.Add($item)
    }
}

# Search articles
function Search-Articles {
    param(
        [string]$SearchText,
        [System.Windows.Forms.ListView]$ListView
    )

    if (-not $SearchText.Trim()) {
        Load-AllArticles -ListView $ListView
        return
    }

    $ListView.Items.Clear()
    $searchLower = $SearchText.ToLower()

    $filteredArticles = $Script:KnowledgeArticles | Where-Object {
        ($_.Title.ToLower().Contains($searchLower)) -or
        ($_.Content.ToLower().Contains($searchLower)) -or
        ($_.Category.ToLower().Contains($searchLower)) -or
        ($_.Keywords | Where-Object { $_.ToLower().Contains($searchLower) })
    }

    foreach ($article in $filteredArticles) {
        $item = New-Object System.Windows.Forms.ListViewItem($article.Title)
        $item.SubItems.Add($article.Category)
        $item.SubItems.Add($article.Rating)
        $item.Tag = $article
        $ListView.Items.Add($item)
    }
}

# Show article dialog
function Show-ArticleDialog {
    param(
        [hashtable]$Article,
        [System.Windows.Forms.Form]$Parent
    )

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = $Article.Title
    $dialog.Size = New-Object System.Drawing.Size(800, 600)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = $Article.Title
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.Size = New-Object System.Drawing.Size(740, 40)
    $dialog.Controls.Add($titleLabel)

    # Category and rating
    $metaLabel = New-Object System.Windows.Forms.Label
    $metaLabel.Text = "Category: $($Article.Category) | Rating: $($Article.Rating)"
    $metaLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $metaLabel.ForeColor = $colors.TextSecondary
    $metaLabel.Location = New-Object System.Drawing.Point(20, 65)
    $metaLabel.AutoSize = $true
    $dialog.Controls.Add($metaLabel)

    # Content based on article type
    $contentText = Get-ArticleContent -Article $Article

    # Content text box
    $contentTextBox = New-Object System.Windows.Forms.TextBox
    $contentTextBox.Location = New-Object System.Drawing.Point(20, 100)
    $contentTextBox.Size = New-Object System.Drawing.Size(740, 400)
    $contentTextBox.Multiline = $true
    $contentTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $contentTextBox.ReadOnly = $true
    $contentTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
    $contentTextBox.BackColor = $colors.Surface
    $contentTextBox.ForeColor = $colors.TextPrimary
    $contentTextBox.Text = $contentText
    $dialog.Controls.Add($contentTextBox)

    # Close button
    $closeBtn = New-Object System.Windows.Forms.Button
    $closeBtn.Text = "Close"
    $closeBtn.Size = New-Object System.Drawing.Size(100, 35)
    $closeBtn.Location = New-Object System.Drawing.Point(660, 520)
    $closeBtn.BackColor = $colors.SurfaceAlt
    $closeBtn.ForeColor = $colors.TextPrimary
    $closeBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $closeBtn.FlatAppearance.BorderColor = $colors.Border
    $dialog.Controls.Add($closeBtn)

    $closeBtn.Add_Click({
        $dialog.Close()
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}

# Get detailed article content
function Get-ArticleContent {
    param([hashtable]$Article)

    switch ($Article.Title) {
        "How to Reset User Passwords" {
            return @"
RESETTING USER PASSWORDS IN ACTIVE DIRECTORY

Overview:
This guide covers the process of resetting user passwords in Active Directory using both GUI tools and PowerShell commands.

Prerequisites:
- Administrative privileges in Active Directory
- Access to Active Directory Users and Computers (ADUC) or PowerShell

Method 1: Using Active Directory Users and Computers
1. Open Active Directory Users and Computers (dsa.msc)
2. Navigate to the user's organizational unit
3. Right-click on the user account
4. Select "Reset Password"
5. Enter the new password and confirm
6. Check "User must change password at next logon" if required
7. Click OK

Method 2: Using PowerShell
# Reset password for a single user
Set-ADAccountPassword -Identity "username" -NewPassword (ConvertTo-SecureString "NewPassword123!" -AsPlainText -Force)

# Force password change at next logon
Set-ADUser -Identity "username" -ChangePasswordAtLogon `$true

# Reset multiple users from CSV
Import-Csv "users.csv" | ForEach-Object {
    Set-ADAccountPassword -Identity `$_.Username -NewPassword (ConvertTo-SecureString `$_.NewPassword -AsPlainText -Force)
}

Method 3: Using Act.V PowerShell Application
1. Navigate to the Users page
2. Double-click on the user account
3. Go to the Actions tab
4. Click "Reset Password"
5. Copy the temporary password provided
6. Provide the password to the user

Best Practices:
- Use complex passwords meeting domain policy requirements
- Force users to change passwords on first logon
- Document password resets for security auditing
- Consider using temporary passwords that expire quickly

Troubleshooting:
- Ensure you have "Reset password" permissions
- Check if the account is locked and unlock if necessary
- Verify domain connectivity
- Check for password policy violations

Security Considerations:
- Always use secure methods to communicate new passwords
- Consider using self-service password reset solutions
- Audit password reset activities regularly
- Implement strong password policies
"@
        }
        "PowerShell AD Commands Cheat Sheet" {
            return @"
POWERSHELL ACTIVE DIRECTORY COMMANDS CHEAT SHEET

Import Active Directory Module:
Import-Module ActiveDirectory

USER MANAGEMENT:
# Get user information
Get-ADUser -Identity "username" -Properties *
Get-ADUser -Filter "Name -like '*Smith*'" -Properties DisplayName,EmailAddress

# Create new user
New-ADUser -Name "John Doe" -GivenName "John" -Surname "Doe" -SamAccountName "jdoe" -UserPrincipalName "jdoe@domain.local" -Path "OU=Users,DC=domain,DC=local" -AccountPassword (ConvertTo-SecureString "Password123!" -AsPlainText -Force) -Enabled `$true

# Modify user properties
Set-ADUser -Identity "username" -Description "IT Manager" -Department "IT"

# Reset password
Set-ADAccountPassword -Identity "username" -NewPassword (ConvertTo-SecureString "NewPassword123!" -AsPlainText -Force)

# Enable/Disable account
Enable-ADAccount -Identity "username"
Disable-ADAccount -Identity "username"

# Unlock account
Unlock-ADAccount -Identity "username"

GROUP MANAGEMENT:
# Get group information
Get-ADGroup -Identity "GroupName" -Properties *
Get-ADGroupMember -Identity "GroupName"

# Create new group
New-ADGroup -Name "IT Support" -GroupScope Global -GroupCategory Security -Path "OU=Groups,DC=domain,DC=local"

# Add user to group
Add-ADGroupMember -Identity "GroupName" -Members "username"

# Remove user from group
Remove-ADGroupMember -Identity "GroupName" -Members "username"

COMPUTER MANAGEMENT:
# Get computer information
Get-ADComputer -Identity "ComputerName" -Properties *
Get-ADComputer -Filter "OperatingSystem -like '*Windows 10*'" -Properties OperatingSystem

# Create computer account
New-ADComputer -Name "WORKSTATION01" -Path "OU=Computers,DC=domain,DC=local"

# Test computer connectivity
Test-ComputerSecureChannel -Server "DomainController"

ORGANIZATIONAL UNIT MANAGEMENT:
# Get OU information
Get-ADOrganizationalUnit -Filter * -Properties *

# Create new OU
New-ADOrganizationalUnit -Name "IT Department" -Path "DC=domain,DC=local"

DOMAIN INFORMATION:
# Get domain information
Get-ADDomain
Get-ADDomainController

# Get forest information
Get-ADForest

SEARCH AND FILTERING:
# Find users who haven't logged on in 90 days
`$date = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonTimestamp -lt `$date} -Properties LastLogonTimestamp

# Find disabled accounts
Get-ADUser -Filter {Enabled -eq `$false} -Properties *

# Find computers not seen in 30 days
`$cutoff = (Get-Date).AddDays(-30)
Get-ADComputer -Filter {LastLogonTimestamp -lt `$cutoff} -Properties LastLogonTimestamp

# Find empty groups
Get-ADGroup -Filter * | Where-Object {-not (Get-ADGroupMember -Identity `$_.SamAccountName)}

BULK OPERATIONS:
# Import users from CSV
Import-Csv "users.csv" | ForEach-Object {
    New-ADUser -Name "`$(`$_.FirstName) `$(`$_.LastName)" -GivenName `$_.FirstName -Surname `$_.LastName -SamAccountName `$_.Username -UserPrincipalName "`$(`$_.Username)@domain.local" -Path `$_.OU -AccountPassword (ConvertTo-SecureString `$_.Password -AsPlainText -Force) -Enabled `$true
}

# Export users to CSV
Get-ADUser -Filter * -Properties DisplayName,EmailAddress,Department | Export-Csv "users.csv" -NoTypeInformation

# Mass password reset
Import-Csv "password_reset.csv" | ForEach-Object {
    Set-ADAccountPassword -Identity `$_.Username -NewPassword (ConvertTo-SecureString `$_.NewPassword -AsPlainText -Force)
    Set-ADUser -Identity `$_.Username -ChangePasswordAtLogon `$true
}

REPORTING:
# Generate user report
Get-ADUser -Filter * -Properties * | Select-Object Name,SamAccountName,EmailAddress,Department,LastLogonTimestamp,Enabled | Export-Csv "user_report.csv" -NoTypeInformation

# Generate group membership report
Get-ADGroup -Filter * | ForEach-Object {
    `$group = `$_.Name
    Get-ADGroupMember -Identity `$_ | ForEach-Object {
        [PSCustomObject]@{
            Group = `$group
            Member = `$_.Name
            ObjectClass = `$_.ObjectClass
        }
    }
} | Export-Csv "group_membership_report.csv" -NoTypeInformation

REMOTE EXECUTION:
# Execute commands on remote computers
Invoke-Command -ComputerName "RemotePC" -ScriptBlock {
    Get-Service | Where-Object {`$_.Status -eq "Stopped"}
}

# Copy files to remote computers
Copy-Item "C:\Scripts\file.txt" -Destination "\\RemotePC\C$\Temp\"

ERROR HANDLING:
# Use try-catch blocks
try {
    Get-ADUser -Identity "nonexistent" -ErrorAction Stop
} catch {
    Write-Error "User not found: `$(`$_.Exception.Message)"
}
"@
        }
        "Troubleshooting Domain Join Issues" {
            return @"
TROUBLESHOOTING DOMAIN JOIN ISSUES

Common Domain Join Problems and Solutions

PROBLEM 1: "The specified domain either does not exist or could not be contacted"

Possible Causes:
- DNS configuration issues
- Network connectivity problems
- Domain controller unavailable
- Firewall blocking required ports

Solutions:
1. Verify DNS settings:
   - Check that the computer's DNS server points to domain controller
   - Test DNS resolution: nslookup domain.local
   - Verify DNS records: nslookup -type=SRV _ldap._tcp.domain.local

2. Test network connectivity:
   ping domain-controller.domain.local
   telnet domain-controller.domain.local 389

3. Check required ports (Windows Firewall):
   - DNS: 53 (TCP/UDP)
   - Kerberos: 88 (TCP/UDP)
   - LDAP: 389 (TCP/UDP)
   - LDAPS: 636 (TCP)
   - Global Catalog: 3268 (TCP)
   - RPC Endpoint Mapper: 135 (TCP)

PROBLEM 2: "Access is denied" or "Logon failure"

Possible Causes:
- Incorrect credentials
- Account doesn't have domain join permissions
- Computer account already exists

Solutions:
1. Verify user credentials have domain join rights
2. Check if computer account already exists in AD
3. Use account with "Add workstations to domain" permission
4. Delete existing computer account if necessary:
   Get-ADComputer -Identity "ComputerName" | Remove-ADComputer

PROBLEM 3: "The trust relationship between this workstation and the primary domain failed"

Possible Causes:
- Computer account password out of sync
- Time synchronization issues
- Corrupted trust relationship

Solutions:
1. Test secure channel:
   Test-ComputerSecureChannel

2. Reset computer account:
   Test-ComputerSecureChannel -Repair

3. Re-join domain:
   Remove-Computer -UnjoinDomainCredential `$cred -Restart
   Add-Computer -DomainName "domain.local" -Credential `$cred -Restart

PROBLEM 4: Time synchronization issues

Solutions:
1. Configure time service:
   w32tm /config /manualpeerlist:"domain-controller.domain.local" /syncfromflags:manual
   w32tm /config /reliable:yes
   net stop w32time && net start w32time
   w32tm /resync

2. Verify time difference (should be < 5 minutes):
   w32tm /query /status

PROBLEM 5: SPN (Service Principal Name) issues

Solutions:
1. Check for duplicate SPNs:
   setspn -X

2. Register SPNs if missing:
   setspn -A HOST/computername.domain.local computername
   setspn -A HOST/computername computername

DIAGNOSTIC COMMANDS:

# Test domain controller connectivity
nltest /dsgetdc:domain.local

# Check domain trust
nltest /query /domain:domain.local

# Verify Kerberos tickets
klist

# Check DNS configuration
ipconfig /all
nslookup domain.local

# Test LDAP connectivity
ldp.exe (LDAP browser)

# Check event logs
Get-WinEvent -LogName System | Where-Object {`$_.Id -eq 1054}
Get-WinEvent -LogName "Microsoft-Windows-User Device Registration/Admin"

POWERSHELL DOMAIN JOIN:
# Join domain with PowerShell
`$credential = Get-Credential
Add-Computer -DomainName "domain.local" -Credential `$credential -Restart

# Join specific OU
Add-Computer -DomainName "domain.local" -OUPath "OU=Workstations,DC=domain,DC=local" -Credential `$credential -Restart

# Remove from domain
Remove-Computer -UnjoinDomainCredential `$credential -WorkgroupName "WORKGROUP" -Restart

PREVENTION TIPS:
1. Use DHCP to automatically configure DNS settings
2. Ensure proper time synchronization setup
3. Document domain join procedures
4. Create dedicated service accounts for domain joining
5. Monitor domain controller health regularly
6. Keep Windows updates current
7. Use Group Policy to manage time settings

ADVANCED TROUBLESHOOTING:
1. Enable debug logging:
   netsh trace start capture=yes provider=Microsoft-Windows-Kernel-Network

2. Check Kerberos authentication:
   klist purge
   kinit username@DOMAIN.LOCAL

3. Use dcdiag for domain controller health:
   dcdiag /v /c /d /e /s:domain-controller

4. Network packet capture:
   netsh trace start capture=yes tracefile=trace.etl provider=Microsoft-Windows-TCPIP

5. Registry checks:
   HKLM\SYSTEM\CurrentControlSet\Services\Netlogon\Parameters
   HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
"@
        }
        default {
            return @"
ARTICLE: $($Article.Title)

Category: $($Article.Category)
Rating: $($Article.Rating)

$($Article.Content)

This is a knowledge base article providing guidance and best practices for Active Directory administration.

For more detailed information and step-by-step procedures, please refer to the official Microsoft documentation or contact your system administrator.

Keywords: $($Article.Keywords -join ', ')
"@
        }
    }
}