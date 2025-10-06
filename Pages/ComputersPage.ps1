# ComputersPage.ps1 - Computer management page for Act.V PowerShell

function Show-ComputersPage {
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
    $titleLabel.Text = "Computers"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Manage Active Directory computers and remote access"
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

    # Add Computer button
    $addComputerBtn = New-Object System.Windows.Forms.Button
    $addComputerBtn.Text = "Add Computer"
    $addComputerBtn.Size = New-Object System.Drawing.Size(140, 35)
    $addComputerBtn.Location = New-Object System.Drawing.Point(420, 12)
    $addComputerBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $addComputerBtn.BackColor = $colors.Primary
    $addComputerBtn.ForeColor = [System.Drawing.Color]::White
    $addComputerBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $addComputerBtn.FlatAppearance.BorderSize = 0
    $addComputerBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($addComputerBtn)

    # Refresh button
    $refreshBtn = New-Object System.Windows.Forms.Button
    $refreshBtn.Text = "Refresh"
    $refreshBtn.Size = New-Object System.Drawing.Size(100, 35)
    $refreshBtn.Location = New-Object System.Drawing.Point(570, 12)
    $refreshBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $refreshBtn.BackColor = $colors.SurfaceAlt
    $refreshBtn.ForeColor = $colors.TextPrimary
    $refreshBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $refreshBtn.FlatAppearance.BorderColor = $colors.Border
    $refreshBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($refreshBtn)

    # Remote Tools button
    $remoteToolsBtn = New-Object System.Windows.Forms.Button
    $remoteToolsBtn.Text = "Remote Tools"
    $remoteToolsBtn.Size = New-Object System.Drawing.Size(120, 35)
    $remoteToolsBtn.Location = New-Object System.Drawing.Point(680, 12)
    $remoteToolsBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $remoteToolsBtn.BackColor = $colors.SurfaceAlt
    $remoteToolsBtn.ForeColor = $colors.TextPrimary
    $remoteToolsBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $remoteToolsBtn.FlatAppearance.BorderColor = $colors.Border
    $remoteToolsBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($remoteToolsBtn)

    # Computers ListView
    $computersList = New-Object System.Windows.Forms.ListView
    $computersList.Size = New-Object System.Drawing.Size(($Parent.Width - 60), ($Parent.Height - 250))
    $computersList.Location = New-Object System.Drawing.Point(30, 200)
    $computersList.View = [System.Windows.Forms.View]::Details
    $computersList.FullRowSelect = $true
    $computersList.GridLines = $true
    $computersList.MultiSelect = $false
    $computersList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $computersList.BackColor = $colors.Surface
    $computersList.ForeColor = $colors.TextPrimary

    # Add columns
    $computersList.Columns.Add("Computer Name", 180)
    $computersList.Columns.Add("Operating System", 200)
    $computersList.Columns.Add("OS Version", 120)
    $computersList.Columns.Add("Description", 200)
    $computersList.Columns.Add("Last Logon", 130)
    $computersList.Columns.Add("Status", 80)

    $container.Controls.Add($computersList)

    # Status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = if ($Script:IsConnected) { "Ready - Click Refresh to load computers" } else { "Not connected to Active Directory" }
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $statusLabel.ForeColor = $colors.TextSecondary
    $statusLabel.Location = New-Object System.Drawing.Point(30, ($Parent.Height - 30))
    $statusLabel.AutoSize = $true
    $container.Controls.Add($statusLabel)

    # Context menu for computers
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

    $remoteDesktopItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $remoteDesktopItem.Text = "Remote Desktop"
    $contextMenu.Items.Add($remoteDesktopItem)

    $openCDriveItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $openCDriveItem.Text = "Open C$ Drive"
    $contextMenu.Items.Add($openCDriveItem)

    $testWinRMItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $testWinRMItem.Text = "Test WinRM"
    $contextMenu.Items.Add($testWinRMItem)

    $enableWinRMItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $enableWinRMItem.Text = "Enable WinRM"
    $contextMenu.Items.Add($enableWinRMItem)

    $contextMenu.Items.Add("-") # Separator

    $editDescItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $editDescItem.Text = "Edit Description"
    $contextMenu.Items.Add($editDescItem)

    $computersList.ContextMenuStrip = $contextMenu

    # Event handlers
    $searchBox.Add_TextChanged({
        Filter-ComputersList -SearchText $searchBox.Text -ListView $computersList
    })

    $refreshBtn.Add_Click({
        Load-Computers -ListView $computersList -StatusLabel $statusLabel
    })

    $addComputerBtn.Add_Click({
        Show-AddComputerDialog -Parent $Script:MainForm -OnComputerAdded {
            Load-Computers -ListView $computersList -StatusLabel $statusLabel
        }
    })

    $remoteToolsBtn.Add_Click({
        Show-RemoteToolsDialog -Parent $Script:MainForm
    })

    $computersList.Add_DoubleClick({
        if ($computersList.SelectedItems.Count -gt 0) {
            $selectedComputer = $computersList.SelectedItems[0]
            $computerName = $selectedComputer.SubItems[0].Text
            Start-RemoteDesktop -ComputerName $computerName
        }
    })

    # Context menu events
    $remoteDesktopItem.Add_Click({
        if ($computersList.SelectedItems.Count -gt 0) {
            $computerName = $computersList.SelectedItems[0].SubItems[0].Text
            Start-RemoteDesktop -ComputerName $computerName
        }
    })

    $openCDriveItem.Add_Click({
        if ($computersList.SelectedItems.Count -gt 0) {
            $computerName = $computersList.SelectedItems[0].SubItems[0].Text
            Open-ComputerCDrive -ComputerName $computerName -StatusLabel $statusLabel
        }
    })

    $testWinRMItem.Add_Click({
        if ($computersList.SelectedItems.Count -gt 0) {
            $computerName = $computersList.SelectedItems[0].SubItems[0].Text
            Test-WinRMConnectivity -ComputerName $computerName -StatusLabel $statusLabel
        }
    })

    $enableWinRMItem.Add_Click({
        if ($computersList.SelectedItems.Count -gt 0) {
            $computerName = $computersList.SelectedItems[0].SubItems[0].Text
            Enable-WinRMRemotely -ComputerName $computerName -StatusLabel $statusLabel
        }
    })

    $editDescItem.Add_Click({
        if ($computersList.SelectedItems.Count -gt 0) {
            $selectedComputer = $computersList.SelectedItems[0]
            $computerName = $selectedComputer.SubItems[0].Text
            $currentDesc = $selectedComputer.SubItems[3].Text
            $newDesc = [Microsoft.VisualBasic.Interaction]::InputBox("Enter new description:", "Edit Description", $currentDesc)
            if ($newDesc -ne "" -and $newDesc -ne $currentDesc) {
                $result = Set-ComputerDescription -Config $Script:ConnectionConfig -ComputerName $computerName -Description $newDesc
                if ($result.Success) {
                    $statusLabel.Text = $result.Message
                    $selectedComputer.SubItems[3].Text = $newDesc
                } else {
                    $statusLabel.Text = "Error: $($result.Error)"
                }
            }
        }
    })

    # Load initial data if connected
    if ($Script:IsConnected) {
        Load-Computers -ListView $computersList -StatusLabel $statusLabel
    }
}

# Load computers from Active Directory
function Load-Computers {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [System.Windows.Forms.Label]$StatusLabel
    )

    try {
        $StatusLabel.Text = "Loading computers..."
        $ListView.Items.Clear()
        $Script:MainForm.Refresh()

        if (-not $Script:IsConnected) {
            # Load dummy computers for demonstration
            $dummyComputers = @(
                @{ Name = "DC01"; OperatingSystem = "Windows Server 2022"; OperatingSystemVersion = "10.0.20348"; Description = "Domain Controller"; LastLogonTimestamp = "2024-01-15 14:30"; DNSHostName = "dc01.domain.local" }
                @{ Name = "FILESERVER01"; OperatingSystem = "Windows Server 2019"; OperatingSystemVersion = "10.0.17763"; Description = "File Server"; LastLogonTimestamp = "2024-01-15 13:45"; DNSHostName = "fileserver01.domain.local" }
                @{ Name = "WORKSTATION001"; OperatingSystem = "Windows 11 Pro"; OperatingSystemVersion = "10.0.22631"; Description = "User Workstation"; LastLogonTimestamp = "2024-01-15 12:20"; DNSHostName = "workstation001.domain.local" }
                @{ Name = "LAPTOP-USER02"; OperatingSystem = "Windows 10 Pro"; OperatingSystemVersion = "10.0.19044"; Description = "Mobile Laptop"; LastLogonTimestamp = "2024-01-14 16:45"; DNSHostName = "laptop-user02.domain.local" }
                @{ Name = "PRINTSERVER"; OperatingSystem = "Windows Server 2016"; OperatingSystemVersion = "10.0.14393"; Description = "Print Server"; LastLogonTimestamp = "2024-01-15 11:30"; DNSHostName = "printserver.domain.local" }
            )

            foreach ($computer in $dummyComputers) {
                Add-ComputerToListView -ListView $ListView -Computer $computer
            }

            $Script:Computers = $dummyComputers
            $StatusLabel.Text = "Demo mode - $($dummyComputers.Count) computers loaded"
        } else {
            # Load real computers from AD
            $result = Get-ADComputers -Config $Script:ConnectionConfig

            if ($result.Success) {
                $Script:Computers = $result.Computers
                foreach ($computer in $result.Computers) {
                    Add-ComputerToListView -ListView $ListView -Computer $computer
                }
                $StatusLabel.Text = "$($result.Computers.Count) computers loaded"
            } else {
                $StatusLabel.Text = "Error loading computers: $($result.Error)"
            }
        }
    } catch {
        $StatusLabel.Text = "Error loading computers: $($_.Exception.Message)"
        Write-DebugLog "Error loading computers" $_.Exception.Message
    }
}

# Add computer to ListView
function Add-ComputerToListView {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [hashtable]$Computer
    )

    $status = "Online" # Default status, could be enhanced with ping test

    $item = New-Object System.Windows.Forms.ListViewItem($Computer.Name)
    $item.SubItems.Add($Computer.OperatingSystem)
    $item.SubItems.Add($Computer.OperatingSystemVersion)
    $item.SubItems.Add($Computer.Description)
    $item.SubItems.Add($Computer.LastLogonTimestamp)
    $item.SubItems.Add($status)
    $item.Tag = $Computer

    $ListView.Items.Add($item)
}

# Filter computers list
function Filter-ComputersList {
    param(
        [string]$SearchText,
        [System.Windows.Forms.ListView]$ListView
    )

    if (-not $SearchText.Trim()) {
        # Show all computers
        $ListView.Items.Clear()
        foreach ($computer in $Script:Computers) {
            Add-ComputerToListView -ListView $ListView -Computer $computer
        }
        return
    }

    $searchLower = $SearchText.ToLower()
    $filteredComputers = @()

    foreach ($computer in $Script:Computers) {
        $match = ($computer.Name -and $computer.Name.ToLower().Contains($searchLower)) -or
                ($computer.OperatingSystem -and $computer.OperatingSystem.ToLower().Contains($searchLower)) -or
                ($computer.Description -and $computer.Description.ToLower().Contains($searchLower)) -or
                ($computer.DNSHostName -and $computer.DNSHostName.ToLower().Contains($searchLower))

        if ($match) {
            $filteredComputers += $computer
        }
    }

    $ListView.Items.Clear()
    foreach ($computer in $filteredComputers) {
        Add-ComputerToListView -ListView $ListView -Computer $computer
    }
}

# Get computers from Active Directory
function Get-ADComputers {
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

        $getComputersCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$computers = Get-ADComputer -Filter * $serverParam $authParam $searchBase -Properties Name, OperatingSystem, OperatingSystemVersion, Description, LastLogonTimestamp, DNSHostName -ErrorAction Stop

    `$result = @()
    foreach (`$computer in `$computers) {
        `$lastLogon = if (`$computer.LastLogonTimestamp) { [DateTime]::FromFileTime(`$computer.LastLogonTimestamp).ToString("yyyy-MM-dd HH:mm") } else { "Never" }

        `$computerObj = @{
            Name = `$computer.Name
            OperatingSystem = `$computer.OperatingSystem
            OperatingSystemVersion = `$computer.OperatingSystemVersion
            Description = `$computer.Description
            LastLogonTimestamp = `$lastLogon
            DNSHostName = `$computer.DNSHostName
            DistinguishedName = `$computer.DistinguishedName
        }
        `$result += `$computerObj
    }

    `$result | ConvertTo-Json -Depth 3

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $getComputersCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "^\[" -or $result -match "^\{") {
            try {
                $computers = $result | ConvertFrom-Json
                if (-not $computers) { $computers = @() }
                if ($computers -isnot [array]) { $computers = @($computers) }

                return @{ Success = $true; Computers = $computers }
            } catch {
                return @{ Success = $false; Error = "Failed to parse computer data: $($_.Exception.Message)" }
            }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Show Add Computer dialog
function Show-AddComputerDialog {
    param(
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnComputerAdded
    )

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Add New Computer"
    $dialog.Size = New-Object System.Drawing.Size(450, 300)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $dialog.MaximizeBox = $false
    $dialog.MinimizeBox = $false
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Create New Computer Account"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Computer Name
    $nameLabel = New-Object System.Windows.Forms.Label
    $nameLabel.Text = "Computer Name:"
    $nameLabel.Location = New-Object System.Drawing.Point(20, 80)
    $nameLabel.AutoSize = $true
    $nameLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($nameLabel)

    $nameText = New-Object System.Windows.Forms.TextBox
    $nameText.Size = New-Object System.Drawing.Size(380, 25)
    $nameText.Location = New-Object System.Drawing.Point(20, 105)
    $nameText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $dialog.Controls.Add($nameText)

    # Description
    $descLabel = New-Object System.Windows.Forms.Label
    $descLabel.Text = "Description (Optional):"
    $descLabel.Location = New-Object System.Drawing.Point(20, 150)
    $descLabel.AutoSize = $true
    $descLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($descLabel)

    $descText = New-Object System.Windows.Forms.TextBox
    $descText.Size = New-Object System.Drawing.Size(380, 25)
    $descText.Location = New-Object System.Drawing.Point(20, 175)
    $descText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $dialog.Controls.Add($descText)

    # Buttons
    $createBtn = New-Object System.Windows.Forms.Button
    $createBtn.Text = "Create Computer"
    $createBtn.Size = New-Object System.Drawing.Size(120, 35)
    $createBtn.Location = New-Object System.Drawing.Point(200, 220)
    $createBtn.BackColor = $colors.Primary
    $createBtn.ForeColor = [System.Drawing.Color]::White
    $createBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $createBtn.FlatAppearance.BorderSize = 0
    $dialog.Controls.Add($createBtn)

    $cancelBtn = New-Object System.Windows.Forms.Button
    $cancelBtn.Text = "Cancel"
    $cancelBtn.Size = New-Object System.Drawing.Size(100, 35)
    $cancelBtn.Location = New-Object System.Drawing.Point(330, 220)
    $cancelBtn.BackColor = $colors.SurfaceAlt
    $cancelBtn.ForeColor = $colors.TextPrimary
    $cancelBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $cancelBtn.FlatAppearance.BorderColor = $colors.Border
    $dialog.Controls.Add($cancelBtn)

    # Event handlers
    $createBtn.Add_Click({
        try {
            if (-not $nameText.Text.Trim()) {
                [System.Windows.Forms.MessageBox]::Show("Please enter a computer name", "Validation Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                return
            }

            $computerData = @{
                ComputerName = $nameText.Text.Trim()
                Description = $descText.Text.Trim()
            }

            $result = New-ADComputer -Config $Script:ConnectionConfig -ComputerData $computerData

            if ($result.Success) {
                [System.Windows.Forms.MessageBox]::Show($result.Message, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                $dialog.DialogResult = [System.Windows.Forms.DialogResult]::OK
                $dialog.Close()
                if ($OnComputerAdded) { & $OnComputerAdded }
            } else {
                [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Error creating computer: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    })

    $cancelBtn.Add_Click({
        $dialog.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
        $dialog.Close()
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}

# Create new AD computer
function New-ADComputer {
    param(
        [hashtable]$Config,
        [hashtable]$ComputerData
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
        $ouPath = if ($Config.ParentOU) { $Config.ParentOU } else { "CN=Computers,DC=$($Config.Server.Replace('.', ',DC='))" }

        $createComputerCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$computerProps = @{
        Name = "$($ComputerData.ComputerName.ToUpper())"
        SamAccountName = "$($ComputerData.ComputerName.ToUpper())`$"
        Path = "$ouPath"
        Enabled = `$true
    }

    if ("$($ComputerData.Description)") { `$computerProps.Description = "$($ComputerData.Description)" }

    New-ADComputer $serverParam $authParam @computerProps -ErrorAction Stop
    Write-Output "Computer $($ComputerData.ComputerName) created successfully"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $createComputerCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "created successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Set computer description
function Set-ComputerDescription {
    param(
        [hashtable]$Config,
        [string]$ComputerName,
        [string]$Description
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

        $setDescCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Set-ADComputer $serverParam $authParam -Identity "$ComputerName" -Description "$Description" -ErrorAction Stop
    Write-Output "Computer description updated successfully"
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $setDescCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "updated successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Remote Desktop functions
function Start-RemoteDesktop {
    param([string]$ComputerName)

    try {
        Start-Process "mstsc" -ArgumentList "/v:$ComputerName"
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to start Remote Desktop: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
}

function Open-ComputerCDrive {
    param(
        [string]$ComputerName,
        [System.Windows.Forms.Label]$StatusLabel
    )

    try {
        $uncPath = "\\$ComputerName\C$"
        Start-Process "explorer" -ArgumentList $uncPath
        $StatusLabel.Text = "Opened $uncPath in Explorer"
    } catch {
        $StatusLabel.Text = "Failed to open C$ drive: $($_.Exception.Message)"
    }
}

function Test-WinRMConnectivity {
    param(
        [string]$ComputerName,
        [System.Windows.Forms.Label]$StatusLabel
    )

    $StatusLabel.Text = "Testing WinRM connectivity to $ComputerName..."

    try {
        $testCommand = "Test-WSMan -ComputerName $ComputerName -ErrorAction Stop"
        $result = Invoke-PowerShellCommand -Command $testCommand

        if ($result -match "wsmid") {
            $StatusLabel.Text = "[OK] WinRM is accessible on $ComputerName"
        } else {
            $StatusLabel.Text = "[X] WinRM not accessible on $ComputerName"
        }
    } catch {
        $StatusLabel.Text = "[X] WinRM test failed: $($_.Exception.Message)"
    }
}

function Enable-WinRMRemotely {
    param(
        [string]$ComputerName,
        [System.Windows.Forms.Label]$StatusLabel
    )

    $StatusLabel.Text = "Attempting to enable WinRM on $ComputerName..."

    try {
        $enableCommand = @"
try {
    `$computerName = '$ComputerName'

    # Try using Invoke-Command to enable WinRM remotely
    try {
        `$result = Invoke-Command -ComputerName `$computerName -ScriptBlock {
            try {
                winrm quickconfig -q -force
                if (`$LASTEXITCODE -eq 0) {
                    return "WinRM configured successfully"
                } else {
                    return "WinRM configuration failed with exit code: `$LASTEXITCODE"
                }
            } catch {
                return "Error: `$(`$_.Exception.Message)"
            }
        } -ErrorAction Stop
        Write-Output "SUCCESS: `$result"
    } catch {
        # Try using sc command to start WinRM service
        try {
            `$scResult = sc.exe \\`$computerName config WinRM start= auto
            if (`$LASTEXITCODE -eq 0) {
                `$startResult = sc.exe \\`$computerName start WinRM
                if (`$LASTEXITCODE -eq 0) {
                    Write-Output "SUCCESS: WinRM service started via sc command"
                } else {
                    Write-Output "ERROR: Failed to start WinRM service"
                }
            } else {
                Write-Output "ERROR: Failed to configure WinRM service"
            }
        } catch {
            Write-Output "ERROR: All methods failed. Computer may not be accessible or you may lack administrative privileges. Original error: `$(`$_.Exception.Message)"
        }
    }
} catch {
    Write-Output "ERROR: `$(`$_.Exception.Message)"
}
"@

        $result = Invoke-PowerShellCommand -Command $enableCommand

        if ($result -match "SUCCESS:") {
            $StatusLabel.Text = "[OK] $($result.Replace('SUCCESS: ', ''))"
        } else {
            $StatusLabel.Text = "[X] $($result.Replace('ERROR: ', ''))"
        }
    } catch {
        $StatusLabel.Text = "[X] Enable WinRM failed: $($_.Exception.Message)"
    }
}

# Show Remote Tools dialog
function Show-RemoteToolsDialog {
    param([System.Windows.Forms.Form]$Parent)

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Remote Tools"
    $dialog.Size = New-Object System.Drawing.Size(500, 400)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Remote Administration Tools"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Computer name input
    $compLabel = New-Object System.Windows.Forms.Label
    $compLabel.Text = "Computer Name:"
    $compLabel.Location = New-Object System.Drawing.Point(20, 70)
    $compLabel.AutoSize = $true
    $compLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($compLabel)

    $compText = New-Object System.Windows.Forms.TextBox
    $compText.Size = New-Object System.Drawing.Size(300, 25)
    $compText.Location = New-Object System.Drawing.Point(20, 95)
    $compText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $dialog.Controls.Add($compText)

    # Tool buttons
    $yPos = 140
    $btnWidth = 200
    $btnHeight = 35

    $tools = @(
        @{ Text = "Remote Desktop"; Action = { Start-RemoteDesktop -ComputerName $compText.Text } }
        @{ Text = "Open C$ Drive"; Action = { Start-Process "explorer" -ArgumentList "\\$($compText.Text)\C$" } }
        @{ Text = "Test WinRM"; Action = { Test-WinRMConnectivity -ComputerName $compText.Text -StatusLabel $statusLabel } }
        @{ Text = "Enable WinRM"; Action = { Enable-WinRMRemotely -ComputerName $compText.Text -StatusLabel $statusLabel } }
        @{ Text = "Computer Management"; Action = { Start-Process "compmgmt.msc" -ArgumentList "/computer:$($compText.Text)" } }
        @{ Text = "Event Viewer"; Action = { Start-Process "eventvwr.msc" -ArgumentList "/computer:$($compText.Text)" } }
        @{ Text = "Services"; Action = { Start-Process "services.msc" -ArgumentList "/computer:$($compText.Text)" } }
        @{ Text = "Registry Editor"; Action = { Start-Process "regedit" -ArgumentList "/m \\$($compText.Text)" } }
    )

    foreach ($tool in $tools) {
        $btn = New-Object System.Windows.Forms.Button
        $btn.Text = $tool.Text
        $btn.Size = New-Object System.Drawing.Size($btnWidth, $btnHeight)
        $btn.Location = New-Object System.Drawing.Point(20, $yPos)
        $btn.BackColor = $colors.Primary
        $btn.ForeColor = [System.Drawing.Color]::White
        $btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
        $btn.FlatAppearance.BorderSize = 0
        $btn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $btn.Cursor = [System.Windows.Forms.Cursors]::Hand

        $action = $tool.Action
        $btn.Add_Click({
            try {
                if (-not $compText.Text.Trim()) {
                    [System.Windows.Forms.MessageBox]::Show("Please enter a computer name", "Input Required", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                    return
                }
                & $action
            } catch {
                [System.Windows.Forms.MessageBox]::Show("Error: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        }.GetNewClosure())

        $dialog.Controls.Add($btn)
        $yPos += 40
    }

    # Status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "Enter a computer name and select a tool"
    $statusLabel.Location = New-Object System.Drawing.Point(250, 95)
    $statusLabel.Size = New-Object System.Drawing.Size(200, 100)
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $statusLabel.ForeColor = $colors.TextSecondary
    $dialog.Controls.Add($statusLabel)

    # Show dialog
    $dialog.ShowDialog($Parent)
}