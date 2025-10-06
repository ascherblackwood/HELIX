# UsersPage.ps1 - Users management page for Act.V PowerShell

function Show-UsersPage {
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
    $titleLabel.Text = "Users"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Manage Active Directory users"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $subtitleLabel.ForeColor = $colors.TextSecondary
    $subtitleLabel.Location = New-Object System.Drawing.Point(30, 70)
    $subtitleLabel.AutoSize = $true
    $container.Controls.Add($subtitleLabel)

    # Search and action bar
    $actionPanel = New-Object System.Windows.Forms.Panel
    $actionPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), 60)
    $actionPanel.Location = New-Object System.Drawing.Point(30, 120)
    $actionPanel.BackColor = $colors.Background
    $container.Controls.Add($actionPanel)

    # Search textbox
    $searchBox = New-Object System.Windows.Forms.TextBox
    $searchBox.Size = New-Object System.Drawing.Size(400, 30)
    $searchBox.Location = New-Object System.Drawing.Point(0, 15)
    $searchBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    # Note: PlaceholderText not available in older .NET Framework versions
    $actionPanel.Controls.Add($searchBox)

    # Search type dropdown
    $searchTypeCombo = New-Object System.Windows.Forms.ComboBox
    $searchTypeCombo.Size = New-Object System.Drawing.Size(120, 30)
    $searchTypeCombo.Location = New-Object System.Drawing.Point(420, 15)
    $searchTypeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $searchTypeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $searchTypeCombo.Items.AddRange(@("All Fields", "Last Name", "First Name", "Employee ID", "Title", "Description", "Email"))
    $searchTypeCombo.SelectedIndex = 0
    $actionPanel.Controls.Add($searchTypeCombo)

    # Add User button
    $addUserBtn = New-Object System.Windows.Forms.Button
    $addUserBtn.Text = "+ Add User"
    $addUserBtn.Size = New-Object System.Drawing.Size(120, 35)
    $addUserBtn.Location = New-Object System.Drawing.Point(560, 12)
    $addUserBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $addUserBtn.BackColor = $colors.Primary
    $addUserBtn.ForeColor = [System.Drawing.Color]::White
    $addUserBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $addUserBtn.FlatAppearance.BorderSize = 0
    $addUserBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($addUserBtn)

    # Refresh button
    $refreshBtn = New-Object System.Windows.Forms.Button
    $refreshBtn.Text = "Refresh"
    $refreshBtn.Size = New-Object System.Drawing.Size(100, 35)
    $refreshBtn.Location = New-Object System.Drawing.Point(690, 12)
    $refreshBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $refreshBtn.BackColor = $colors.SurfaceAlt
    $refreshBtn.ForeColor = $colors.TextPrimary
    $refreshBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $refreshBtn.FlatAppearance.BorderColor = $colors.Border
    $refreshBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($refreshBtn)

    # Users ListView
    $usersList = New-Object System.Windows.Forms.ListView
    $usersList.Size = New-Object System.Drawing.Size(($Parent.Width - 60), ($Parent.Height - 250))
    $usersList.Location = New-Object System.Drawing.Point(30, 200)
    $usersList.View = [System.Windows.Forms.View]::Details
    $usersList.FullRowSelect = $true
    $usersList.GridLines = $true
    $usersList.MultiSelect = $false
    $usersList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $usersList.BackColor = $colors.Surface
    $usersList.ForeColor = $colors.TextPrimary

    # Add columns
    $usersList.Columns.Add("Name", 200)
    $usersList.Columns.Add("Username", 150)
    $usersList.Columns.Add("Email", 200)
    $usersList.Columns.Add("Title", 150)
    $usersList.Columns.Add("Department", 130)
    $usersList.Columns.Add("Status", 80)
    $usersList.Columns.Add("Last Logon", 130)

    $container.Controls.Add($usersList)

    # Status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = if ($Script:IsConnected) { "Ready - Click Refresh to load users" } else { "Not connected to Active Directory" }
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $statusLabel.ForeColor = $colors.TextSecondary
    $statusLabel.Location = New-Object System.Drawing.Point(30, ($Parent.Height - 30))
    $statusLabel.AutoSize = $true
    $container.Controls.Add($statusLabel)

    # Event handlers
    $searchBox.Add_TextChanged({
        Filter-UsersList -SearchText $searchBox.Text -SearchType $searchTypeCombo.Text -ListView $usersList
    })

    $searchTypeCombo.Add_SelectedIndexChanged({
        Filter-UsersList -SearchText $searchBox.Text -SearchType $searchTypeCombo.Text -ListView $usersList
    })

    $refreshBtn.Add_Click({
        Load-Users -ListView $usersList -StatusLabel $statusLabel
    })

    $addUserBtn.Add_Click({
        Show-AddUserDialog -Parent $Script:MainForm -OnUserAdded {
            Load-Users -ListView $usersList -StatusLabel $statusLabel
        }
    })

    $usersList.Add_DoubleClick({
        if ($usersList.SelectedItems.Count -gt 0) {
            $selectedUser = $usersList.SelectedItems[0]
            Show-UserDetailsDialog -User $selectedUser -Parent $Script:MainForm -OnUserUpdated {
                Load-Users -ListView $usersList -StatusLabel $statusLabel
            }
        }
    })

    # Load initial data if connected
    if ($Script:IsConnected) {
        Load-Users -ListView $usersList -StatusLabel $statusLabel
    }
}

# Load users from Active Directory
function Load-Users {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [System.Windows.Forms.Label]$StatusLabel
    )

    try {
        $StatusLabel.Text = "Loading users..."
        $ListView.Items.Clear()
        $Script:MainForm.Refresh()

        if (-not $Script:IsConnected) {
            # Load dummy users for demonstration
            $dummyUsers = @(
                @{ DisplayName = "John Smith"; SamAccountName = "jsmith"; Mail = "john.smith@domain.local"; Title = "IT Manager"; Department = "IT"; UserAccountControl = 512; LastLogon = "2024-01-15 14:30" }
                @{ DisplayName = "Jane Doe"; SamAccountName = "jdoe"; Mail = "jane.doe@domain.local"; Title = "Marketing Manager"; Department = "Marketing"; UserAccountControl = 512; LastLogon = "2024-01-15 13:45" }
                @{ DisplayName = "Robert Johnson"; SamAccountName = "rjohnson"; Mail = "robert.johnson@domain.local"; Title = "Software Developer"; Department = "Engineering"; UserAccountControl = 514; LastLogon = "2023-12-20 16:20" }
                @{ DisplayName = "Alice Brown"; SamAccountName = "abrown"; Mail = "alice.brown@domain.local"; Title = "HR Director"; Department = "HR"; UserAccountControl = 512; LastLogon = "2024-01-14 17:00" }
                @{ DisplayName = "Charles Wilson"; SamAccountName = "cwilson"; Mail = "charles.wilson@domain.local"; Title = "Sales Rep"; Department = "Sales"; UserAccountControl = 512; LastLogon = "2024-01-15 12:15" }
            )

            foreach ($user in $dummyUsers) {
                Add-UserToListView -ListView $ListView -User $user
            }

            $Script:Users = $dummyUsers
            $StatusLabel.Text = "Demo mode - $($dummyUsers.Count) users loaded"
        } else {
            # Load real users from AD
            $result = Get-ADUsers -Config $Script:ConnectionConfig

            if ($result.Success) {
                $Script:Users = $result.Users
                foreach ($user in $result.Users) {
                    Add-UserToListView -ListView $ListView -User $user
                }
                $StatusLabel.Text = "$($result.Users.Count) users loaded"
            } else {
                $StatusLabel.Text = "Error loading users: $($result.Error)"
            }
        }
    } catch {
        $StatusLabel.Text = "Error loading users: $($_.Exception.Message)"
        Write-DebugLog "Error loading users" $_.Exception.Message
    }
}

# Add user to ListView
function Add-UserToListView {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [hashtable]$User
    )

    $status = if ($User.UserAccountControl -band 2) { "Disabled" } else { "Active" }

    $item = New-Object System.Windows.Forms.ListViewItem($User.DisplayName)
    $item.SubItems.Add($User.SamAccountName)
    $item.SubItems.Add($User.Mail)
    $item.SubItems.Add($User.Title)
    $item.SubItems.Add($User.Department)
    $item.SubItems.Add($status)
    $item.SubItems.Add($User.LastLogon)
    $item.Tag = $User

    # Color coding based on status
    $colors = Get-ThemeColors
    if ($status -eq "Disabled") {
        $item.ForeColor = $colors.Error
    }

    $ListView.Items.Add($item)
}

# Filter users list
function Filter-UsersList {
    param(
        [string]$SearchText,
        [string]$SearchType,
        [System.Windows.Forms.ListView]$ListView
    )

    if (-not $SearchText.Trim()) {
        # Show all users
        $ListView.Items.Clear()
        foreach ($user in $Script:Users) {
            Add-UserToListView -ListView $ListView -User $user
        }
        return
    }

    $searchLower = $SearchText.ToLower()
    $filteredUsers = @()

    foreach ($user in $Script:Users) {
        $match = $false

        switch ($SearchType) {
            "Last Name" { $match = $user.DisplayName.Split(' ')[-1].ToLower().Contains($searchLower) }
            "First Name" { $match = $user.DisplayName.Split(' ')[0].ToLower().Contains($searchLower) }
            "Employee ID" { $match = $user.EmployeeID -and $user.EmployeeID.ToLower().Contains($searchLower) }
            "Title" { $match = $user.Title -and $user.Title.ToLower().Contains($searchLower) }
            "Description" { $match = $user.Description -and $user.Description.ToLower().Contains($searchLower) }
            "Email" { $match = $user.Mail -and $user.Mail.ToLower().Contains($searchLower) }
            default {
                # All Fields
                $match = ($user.DisplayName -and $user.DisplayName.ToLower().Contains($searchLower)) -or
                        ($user.SamAccountName -and $user.SamAccountName.ToLower().Contains($searchLower)) -or
                        ($user.Mail -and $user.Mail.ToLower().Contains($searchLower)) -or
                        ($user.Title -and $user.Title.ToLower().Contains($searchLower)) -or
                        ($user.Department -and $user.Department.ToLower().Contains($searchLower)) -or
                        ($user.Description -and $user.Description.ToLower().Contains($searchLower))
            }
        }

        if ($match) {
            $filteredUsers += $user
        }
    }

    $ListView.Items.Clear()
    foreach ($user in $filteredUsers) {
        Add-UserToListView -ListView $ListView -User $user
    }
}

# Get users from Active Directory
function Get-ADUsers {
    param([hashtable]$Config)

    try {
        $env = @{}
        $useCredentials = $false

        if ($Config.Username -and $Config.Password) {
            $env['ACTV_USER'] = $Config.Username
            $env['ACTV_PASS'] = $Config.Password
            $useCredentials = $true
        }

        $serverParam = if ($Config.Server.Contains('.')) { "-Server `"$($Config.Server)`"" } else { "" }
        $authParam = if ($useCredentials) { "-Credential `$ACTV_CRED -AuthType Negotiate" } else { "-AuthType Negotiate" }
        $searchBase = if ($Config.ParentOU) { "-SearchBase `"$($Config.ParentOU)`"" } else { "" }

        $getUsersCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$users = Get-ADUser -Filter * $serverParam $authParam $searchBase -Properties DisplayName, Mail, Title, Department, Description, LastLogonTimestamp, UserAccountControl -ErrorAction Stop

    `$result = @()
    foreach (`$user in `$users) {
        `$lastLogon = if (`$user.LastLogonTimestamp) { [DateTime]::FromFileTime(`$user.LastLogonTimestamp).ToString("yyyy-MM-dd HH:mm") } else { "Never" }

        `$userObj = @{
            DisplayName = `$user.DisplayName
            SamAccountName = `$user.SamAccountName
            Mail = `$user.Mail
            Title = `$user.Title
            Department = `$user.Department
            Description = `$user.Description
            UserAccountControl = `$user.UserAccountControl
            LastLogon = `$lastLogon
            DistinguishedName = `$user.DistinguishedName
        }
        `$result += `$userObj
    }

    `$result | ConvertTo-Json -Depth 3

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $getUsersCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "^\[" -or $result -match "^\{") {
            try {
                $users = $result | ConvertFrom-Json
                if (-not $users) { $users = @() }
                if ($users -isnot [array]) { $users = @($users) }

                return @{ Success = $true; Users = $users }
            } catch {
                return @{ Success = $false; Error = "Failed to parse user data: $($_.Exception.Message)" }
            }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Show Add User dialog
function Show-AddUserDialog {
    param(
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnUserAdded
    )

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Add New User"
    $dialog.Size = New-Object System.Drawing.Size(500, 600)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $dialog.MaximizeBox = $false
    $dialog.MinimizeBox = $false
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Create New User"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Form fields
    $yPos = 70

    # Username
    $userLabel = New-Object System.Windows.Forms.Label
    $userLabel.Text = "Username:"
    $userLabel.Location = New-Object System.Drawing.Point(20, $yPos)
    $userLabel.AutoSize = $true
    $userLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($userLabel)

    $userText = New-Object System.Windows.Forms.TextBox
    $userText.Size = New-Object System.Drawing.Size(200, 25)
    $userText.Location = New-Object System.Drawing.Point(20, ($yPos + 20))
    $dialog.Controls.Add($userText)

    # First Name
    $firstLabel = New-Object System.Windows.Forms.Label
    $firstLabel.Text = "First Name:"
    $firstLabel.Location = New-Object System.Drawing.Point(250, $yPos)
    $firstLabel.AutoSize = $true
    $firstLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($firstLabel)

    $firstText = New-Object System.Windows.Forms.TextBox
    $firstText.Size = New-Object System.Drawing.Size(200, 25)
    $firstText.Location = New-Object System.Drawing.Point(250, ($yPos + 20))
    $dialog.Controls.Add($firstText)

    $yPos += 70

    # Last Name
    $lastLabel = New-Object System.Windows.Forms.Label
    $lastLabel.Text = "Last Name:"
    $lastLabel.Location = New-Object System.Drawing.Point(20, $yPos)
    $lastLabel.AutoSize = $true
    $lastLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($lastLabel)

    $lastText = New-Object System.Windows.Forms.TextBox
    $lastText.Size = New-Object System.Drawing.Size(200, 25)
    $lastText.Location = New-Object System.Drawing.Point(20, ($yPos + 20))
    $dialog.Controls.Add($lastText)

    # Email
    $emailLabel = New-Object System.Windows.Forms.Label
    $emailLabel.Text = "Email:"
    $emailLabel.Location = New-Object System.Drawing.Point(250, $yPos)
    $emailLabel.AutoSize = $true
    $emailLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($emailLabel)

    $emailText = New-Object System.Windows.Forms.TextBox
    $emailText.Size = New-Object System.Drawing.Size(200, 25)
    $emailText.Location = New-Object System.Drawing.Point(250, ($yPos + 20))
    $dialog.Controls.Add($emailText)

    $yPos += 70

    # Password
    $passLabel = New-Object System.Windows.Forms.Label
    $passLabel.Text = "Password:"
    $passLabel.Location = New-Object System.Drawing.Point(20, $yPos)
    $passLabel.AutoSize = $true
    $passLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($passLabel)

    $passText = New-Object System.Windows.Forms.TextBox
    $passText.Size = New-Object System.Drawing.Size(200, 25)
    $passText.Location = New-Object System.Drawing.Point(20, ($yPos + 20))
    $passText.UseSystemPasswordChar = $true
    $dialog.Controls.Add($passText)

    # Generate password button
    $genPassBtn = New-Object System.Windows.Forms.Button
    $genPassBtn.Text = "Generate"
    $genPassBtn.Size = New-Object System.Drawing.Size(80, 25)
    $genPassBtn.Location = New-Object System.Drawing.Point(230, ($yPos + 20))
    $genPassBtn.BackColor = $colors.SurfaceAlt
    $genPassBtn.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($genPassBtn)

    $yPos += 70

    # Title
    $titleFieldLabel = New-Object System.Windows.Forms.Label
    $titleFieldLabel.Text = "Title:"
    $titleFieldLabel.Location = New-Object System.Drawing.Point(20, $yPos)
    $titleFieldLabel.AutoSize = $true
    $titleFieldLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($titleFieldLabel)

    $titleText = New-Object System.Windows.Forms.TextBox
    $titleText.Size = New-Object System.Drawing.Size(200, 25)
    $titleText.Location = New-Object System.Drawing.Point(20, ($yPos + 20))
    $dialog.Controls.Add($titleText)

    # Department
    $deptLabel = New-Object System.Windows.Forms.Label
    $deptLabel.Text = "Department:"
    $deptLabel.Location = New-Object System.Drawing.Point(250, $yPos)
    $deptLabel.AutoSize = $true
    $deptLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($deptLabel)

    $deptText = New-Object System.Windows.Forms.TextBox
    $deptText.Size = New-Object System.Drawing.Size(200, 25)
    $deptText.Location = New-Object System.Drawing.Point(250, ($yPos + 20))
    $dialog.Controls.Add($deptText)

    $yPos += 70

    # Description
    $descLabel = New-Object System.Windows.Forms.Label
    $descLabel.Text = "Description:"
    $descLabel.Location = New-Object System.Drawing.Point(20, $yPos)
    $descLabel.AutoSize = $true
    $descLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($descLabel)

    $descText = New-Object System.Windows.Forms.TextBox
    $descText.Size = New-Object System.Drawing.Size(430, 25)
    $descText.Location = New-Object System.Drawing.Point(20, ($yPos + 20))
    $dialog.Controls.Add($descText)

    $yPos += 70

    # Buttons
    $createBtn = New-Object System.Windows.Forms.Button
    $createBtn.Text = "Create User"
    $createBtn.Size = New-Object System.Drawing.Size(100, 35)
    $createBtn.Location = New-Object System.Drawing.Point(250, $yPos)
    $createBtn.BackColor = $colors.Primary
    $createBtn.ForeColor = [System.Drawing.Color]::White
    $createBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $createBtn.FlatAppearance.BorderSize = 0
    $dialog.Controls.Add($createBtn)

    $cancelBtn = New-Object System.Windows.Forms.Button
    $cancelBtn.Text = "Cancel"
    $cancelBtn.Size = New-Object System.Drawing.Size(100, 35)
    $cancelBtn.Location = New-Object System.Drawing.Point(360, $yPos)
    $cancelBtn.BackColor = $colors.SurfaceAlt
    $cancelBtn.ForeColor = $colors.TextPrimary
    $cancelBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $cancelBtn.FlatAppearance.BorderColor = $colors.Border
    $dialog.Controls.Add($cancelBtn)

    # Event handlers
    $genPassBtn.Add_Click({
        $passText.Text = New-SecurePassword -Length 12
    })

    $createBtn.Add_Click({
        try {
            # Validate required fields
            if (-not $userText.Text.Trim() -or -not $firstText.Text.Trim() -or -not $lastText.Text.Trim() -or -not $passText.Text) {
                [System.Windows.Forms.MessageBox]::Show("Please fill in all required fields (Username, First Name, Last Name, Password)", "Validation Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                return
            }

            # Create user
            $userData = @{
                Username = $userText.Text.Trim()
                FirstName = $firstText.Text.Trim()
                LastName = $lastText.Text.Trim()
                Email = $emailText.Text.Trim()
                Password = $passText.Text
                Title = $titleText.Text.Trim()
                Department = $deptText.Text.Trim()
                Description = $descText.Text.Trim()
            }

            $result = New-ADUser -Config $Script:ConnectionConfig -UserData $userData

            if ($result.Success) {
                [System.Windows.Forms.MessageBox]::Show($result.Message, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                $dialog.DialogResult = [System.Windows.Forms.DialogResult]::OK
                $dialog.Close()
                if ($OnUserAdded) { & $OnUserAdded }
            } else {
                [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Error creating user: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    })

    $cancelBtn.Add_Click({
        $dialog.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
        $dialog.Close()
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}

# Create new AD user
function New-ADUser {
    param(
        [hashtable]$Config,
        [hashtable]$UserData
    )

    try {
        if (-not $Script:IsConnected) {
            return @{ Success = $false; Error = "Not connected to Active Directory" }
        }

        $env = @{}
        $useCredentials = $false

        if ($Config.Username -and $Config.Password) {
            $env['ACTV_USER'] = $Config.Username
            $env['ACTV_PASS'] = $Config.Password
            $useCredentials = $true
        }

        $serverParam = if ($Config.Server.Contains('.')) { "-Server `"$($Config.Server)`"" } else { "" }
        $authParam = if ($useCredentials) { "-Credential `$ACTV_CRED -AuthType Negotiate" } else { "-AuthType Negotiate" }

        # Determine OU path
        $ouPath = if ($Config.ParentOU) { $Config.ParentOU } else { "CN=Users,DC=$($Config.Server.Replace('.', ',DC='))" }

        $createUserCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$userProps = @{
        Name = "$($UserData.FirstName) $($UserData.LastName)"
        SamAccountName = "$($UserData.Username)"
        GivenName = "$($UserData.FirstName)"
        Surname = "$($UserData.LastName)"
        DisplayName = "$($UserData.FirstName) $($UserData.LastName)"
        UserPrincipalName = "$($UserData.Username)@$($Config.Server)"
        Path = "$ouPath"
        AccountPassword = (ConvertTo-SecureString "$($UserData.Password)" -AsPlainText -Force)
        Enabled = `$true
        PasswordNeverExpires = `$false
        CannotChangePassword = `$false
    }

    if ("$($UserData.Email)") { `$userProps.EmailAddress = "$($UserData.Email)" }
    if ("$($UserData.Title)") { `$userProps.Title = "$($UserData.Title)" }
    if ("$($UserData.Department)") { `$userProps.Department = "$($UserData.Department)" }
    if ("$($UserData.Description)") { `$userProps.Description = "$($UserData.Description)" }

    New-ADUser $serverParam $authParam @userProps -ErrorAction Stop
    Write-Output "User $($UserData.Username) created successfully"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $createUserCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "created successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Show User Details dialog
function Show-UserDetailsDialog {
    param(
        [System.Windows.Forms.ListViewItem]$User,
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnUserUpdated
    )

    $colors = Get-ThemeColors
    $userData = $User.Tag

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "User Details - $($userData.DisplayName)"
    $dialog.Size = New-Object System.Drawing.Size(600, 700)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
    $dialog.BackColor = $colors.Background

    # Create tab control for different sections
    $tabControl = New-Object System.Windows.Forms.TabControl
    $tabControl.Dock = [System.Windows.Forms.DockStyle]::Fill
    $tabControl.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $dialog.Controls.Add($tabControl)

    # General tab
    $generalTab = New-Object System.Windows.Forms.TabPage
    $generalTab.Text = "General"
    $generalTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($generalTab)

    # Display user information
    $yPos = 20
    $fields = @(
        @{ Label = "Display Name"; Value = $userData.DisplayName }
        @{ Label = "Username"; Value = $userData.SamAccountName }
        @{ Label = "Email"; Value = $userData.Mail }
        @{ Label = "Title"; Value = $userData.Title }
        @{ Label = "Department"; Value = $userData.Department }
        @{ Label = "Description"; Value = $userData.Description }
        @{ Label = "Last Logon"; Value = $userData.LastLogon }
    )

    foreach ($field in $fields) {
        $label = New-Object System.Windows.Forms.Label
        $label.Text = "$($field.Label):"
        $label.Location = New-Object System.Drawing.Point(20, $yPos)
        $label.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
        $label.ForeColor = $colors.TextPrimary
        $label.AutoSize = $true
        $generalTab.Controls.Add($label)

        $value = New-Object System.Windows.Forms.Label
        $value.Text = $field.Value
        $value.Location = New-Object System.Drawing.Point(150, $yPos)
        $value.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $value.ForeColor = $colors.TextSecondary
        $value.AutoSize = $true
        $generalTab.Controls.Add($value)

        $yPos += 30
    }

    # Actions tab
    $actionsTab = New-Object System.Windows.Forms.TabPage
    $actionsTab.Text = "Actions"
    $actionsTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($actionsTab)

    # Action buttons
    $btnY = 30
    $btnWidth = 200
    $btnHeight = 35

    # Reset Password button
    $resetPassBtn = New-Object System.Windows.Forms.Button
    $resetPassBtn.Text = "Reset Password"
    $resetPassBtn.Size = New-Object System.Drawing.Size($btnWidth, $btnHeight)
    $resetPassBtn.Location = New-Object System.Drawing.Point(30, $btnY)
    $resetPassBtn.BackColor = $colors.Warning
    $resetPassBtn.ForeColor = [System.Drawing.Color]::White
    $resetPassBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $resetPassBtn.FlatAppearance.BorderSize = 0
    $actionsTab.Controls.Add($resetPassBtn)

    $btnY += 50

    # Enable/Disable Account button
    $isDisabled = $userData.UserAccountControl -band 2
    $toggleAccountBtn = New-Object System.Windows.Forms.Button
    $toggleAccountBtn.Text = if ($isDisabled) { "Enable Account" } else { "Disable Account" }
    $toggleAccountBtn.Size = New-Object System.Drawing.Size($btnWidth, $btnHeight)
    $toggleAccountBtn.Location = New-Object System.Drawing.Point(30, $btnY)
    $toggleAccountBtn.BackColor = if ($isDisabled) { $colors.Success } else { $colors.Error }
    $toggleAccountBtn.ForeColor = [System.Drawing.Color]::White
    $toggleAccountBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $toggleAccountBtn.FlatAppearance.BorderSize = 0
    $actionsTab.Controls.Add($toggleAccountBtn)

    $btnY += 50

    # Edit Description button
    $editDescBtn = New-Object System.Windows.Forms.Button
    $editDescBtn.Text = "Edit Description"
    $editDescBtn.Size = New-Object System.Drawing.Size($btnWidth, $btnHeight)
    $editDescBtn.Location = New-Object System.Drawing.Point(30, $btnY)
    $editDescBtn.BackColor = $colors.Primary
    $editDescBtn.ForeColor = [System.Drawing.Color]::White
    $editDescBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $editDescBtn.FlatAppearance.BorderSize = 0
    $actionsTab.Controls.Add($editDescBtn)

    # Action result label
    $actionResult = New-Object System.Windows.Forms.Label
    $actionResult.Text = ""
    $actionResult.Location = New-Object System.Drawing.Point(30, 200)
    $actionResult.Size = New-Object System.Drawing.Size(500, 100)
    $actionResult.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $actionResult.ForeColor = $colors.TextSecondary
    $actionsTab.Controls.Add($actionResult)

    # Event handlers
    $resetPassBtn.Add_Click({
        $result = Reset-UserPassword -Config $Script:ConnectionConfig -Username $userData.SamAccountName
        if ($result.Success) {
            $actionResult.Text = "$($result.Message)`nTemporary password: $($result.TempPassword)"
            $actionResult.ForeColor = $colors.Success
        } else {
            $actionResult.Text = "Error: $($result.Error)"
            $actionResult.ForeColor = $colors.Error
        }
    })

    $toggleAccountBtn.Add_Click({
        $enable = $isDisabled
        $result = Set-UserAccountStatus -Config $Script:ConnectionConfig -Username $userData.SamAccountName -Enable $enable
        if ($result.Success) {
            $actionResult.Text = $result.Message
            $actionResult.ForeColor = $colors.Success
            $toggleAccountBtn.Text = if ($enable) { "Disable Account" } else { "Enable Account" }
            $toggleAccountBtn.BackColor = if ($enable) { $colors.Error } else { $colors.Success }
            $isDisabled = -not $enable
            if ($OnUserUpdated) { & $OnUserUpdated }
        } else {
            $actionResult.Text = "Error: $($result.Error)"
            $actionResult.ForeColor = $colors.Error
        }
    })

    $editDescBtn.Add_Click({
        $newDesc = [Microsoft.VisualBasic.Interaction]::InputBox("Enter new description:", "Edit Description", $userData.Description)
        if ($newDesc -ne "" -and $newDesc -ne $userData.Description) {
            $result = Set-UserField -Config $Script:ConnectionConfig -Username $userData.SamAccountName -Field "Description" -Value $newDesc
            if ($result.Success) {
                $actionResult.Text = $result.Message
                $actionResult.ForeColor = $colors.Success
                $userData.Description = $newDesc
                if ($OnUserUpdated) { & $OnUserUpdated }
            } else {
                $actionResult.Text = "Error: $result.Error"
                $actionResult.ForeColor = $colors.Error
            }
        }
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}

# Reset user password
function Reset-UserPassword {
    param(
        [hashtable]$Config,
        [string]$Username
    )

    try {
        if (-not $Script:IsConnected) {
            return @{ Success = $false; Error = "Not connected to Active Directory" }
        }

        $tempPassword = New-SecurePassword -Length 12
        $env = @{}
        $useCredentials = $false

        if ($Config.Username -and $Config.Password) {
            $env['ACTV_USER'] = $Config.Username
            $env['ACTV_PASS'] = $Config.Password
            $useCredentials = $true
        }

        $serverParam = if ($Config.Server.Contains('.')) { "-Server `"$($Config.Server)`"" } else { "" }
        $authParam = if ($useCredentials) { "-Credential `$ACTV_CRED -AuthType Negotiate" } else { "-AuthType Negotiate" }

        $resetPasswordCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$SecurePassword = ConvertTo-SecureString "$tempPassword" -AsPlainText -Force
    Set-ADAccountPassword -Identity "$Username" -NewPassword `$SecurePassword $serverParam $authParam -ErrorAction Stop

    # Set change password at next logon
    Set-ADUser -Identity "$Username" -ChangePasswordAtLogon `$true $serverParam $authParam -ErrorAction Stop

    Write-Output "Password reset successfully for user $Username"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $resetPasswordCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "Password reset successfully") {
            return @{ Success = $true; Message = $result; TempPassword = $tempPassword }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Set user account status (enable/disable)
function Set-UserAccountStatus {
    param(
        [hashtable]$Config,
        [string]$Username,
        [bool]$Enable
    )

    try {
        if (-not $Script:IsConnected) {
            return @{ Success = $false; Error = "Not connected to Active Directory" }
        }

        $env = @{}
        $useCredentials = $false

        if ($Config.Username -and $Config.Password) {
            $env['ACTV_USER'] = $Config.Username
            $env['ACTV_PASS'] = $Config.Password
            $useCredentials = $true
        }

        $serverParam = if ($Config.Server.Contains('.')) { "-Server `"$($Config.Server)`"" } else { "" }
        $authParam = if ($useCredentials) { "-Credential `$ACTV_CRED -AuthType Negotiate" } else { "-AuthType Negotiate" }
        $action = if ($Enable) { "enabled" } else { "disabled" }
        $enableValue = if ($Enable) { "`$true" } else { "`$false" }

        $toggleAccountCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    Set-ADUser -Identity "$Username" -Enabled $enableValue $serverParam $authParam -ErrorAction Stop
    Write-Output "Account $action for user $Username"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $toggleAccountCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "Account $action") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Set user field value
function Set-UserField {
    param(
        [hashtable]$Config,
        [string]$Username,
        [string]$Field,
        [string]$Value
    )

    try {
        if (-not $Script:IsConnected) {
            return @{ Success = $false; Error = "Not connected to Active Directory" }
        }

        $env = @{}
        $useCredentials = $false

        if ($Config.Username -and $Config.Password) {
            $env['ACTV_USER'] = $Config.Username
            $env['ACTV_PASS'] = $Config.Password
            $useCredentials = $true
        }

        $serverParam = if ($Config.Server.Contains('.')) { "-Server `"$($Config.Server)`"" } else { "" }
        $authParam = if ($useCredentials) { "-Credential `$ACTV_CRED -AuthType Negotiate" } else { "-AuthType Negotiate" }

        $setFieldCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    Set-ADUser -Identity "$Username" -$Field "$Value" $serverParam $authParam -ErrorAction Stop
    Write-Output "User $Username $Field updated successfully"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $setFieldCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "updated successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}