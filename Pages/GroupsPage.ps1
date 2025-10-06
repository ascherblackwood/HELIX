# GroupsPage.ps1 - Groups management page for Act.V PowerShell

function Show-GroupsPage {
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
    $titleLabel.Text = "Groups"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Manage Active Directory groups and memberships"
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

    # Group type filter
    $typeCombo = New-Object System.Windows.Forms.ComboBox
    $typeCombo.Size = New-Object System.Drawing.Size(120, 30)
    $typeCombo.Location = New-Object System.Drawing.Point(420, 15)
    $typeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $typeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $typeCombo.Items.AddRange(@("All Types", "Security", "Distribution"))
    $typeCombo.SelectedIndex = 0
    $actionPanel.Controls.Add($typeCombo)

    # Add Group button
    $addGroupBtn = New-Object System.Windows.Forms.Button
    $addGroupBtn.Text = "Add Group"
    $addGroupBtn.Size = New-Object System.Drawing.Size(130, 35)
    $addGroupBtn.Location = New-Object System.Drawing.Point(560, 12)
    $addGroupBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $addGroupBtn.BackColor = $colors.Primary
    $addGroupBtn.ForeColor = [System.Drawing.Color]::White
    $addGroupBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $addGroupBtn.FlatAppearance.BorderSize = 0
    $addGroupBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($addGroupBtn)

    # Refresh button
    $refreshBtn = New-Object System.Windows.Forms.Button
    $refreshBtn.Text = "Refresh"
    $refreshBtn.Size = New-Object System.Drawing.Size(100, 35)
    $refreshBtn.Location = New-Object System.Drawing.Point(700, 12)
    $refreshBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $refreshBtn.BackColor = $colors.SurfaceAlt
    $refreshBtn.ForeColor = $colors.TextPrimary
    $refreshBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $refreshBtn.FlatAppearance.BorderColor = $colors.Border
    $refreshBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $actionPanel.Controls.Add($refreshBtn)

    # Groups ListView
    $groupsList = New-Object System.Windows.Forms.ListView
    $groupsList.Size = New-Object System.Drawing.Size(($Parent.Width - 60), ($Parent.Height - 250))
    $groupsList.Location = New-Object System.Drawing.Point(30, 200)
    $groupsList.View = [System.Windows.Forms.View]::Details
    $groupsList.FullRowSelect = $true
    $groupsList.GridLines = $true
    $groupsList.MultiSelect = $false
    $groupsList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $groupsList.BackColor = $colors.Surface
    $groupsList.ForeColor = $colors.TextPrimary

    # Add columns
    $groupsList.Columns.Add("Group Name", 200)
    $groupsList.Columns.Add("Description", 250)
    $groupsList.Columns.Add("Type", 100)
    $groupsList.Columns.Add("Scope", 100)
    $groupsList.Columns.Add("Members", 80)
    $groupsList.Columns.Add("Created", 130)

    $container.Controls.Add($groupsList)

    # Status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = if ($Script:IsConnected) { "Ready - Click Refresh to load groups" } else { "Not connected to Active Directory" }
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $statusLabel.ForeColor = $colors.TextSecondary
    $statusLabel.Location = New-Object System.Drawing.Point(30, ($Parent.Height - 30))
    $statusLabel.AutoSize = $true
    $container.Controls.Add($statusLabel)

    # Context menu for groups
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

    $viewMembersItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $viewMembersItem.Text = "View Members"
    $contextMenu.Items.Add($viewMembersItem)

    $addMemberItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $addMemberItem.Text = "Add Member"
    $contextMenu.Items.Add($addMemberItem)

    $removeMemberItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $removeMemberItem.Text = "➖ Remove Member"
    $contextMenu.Items.Add($removeMemberItem)

    $contextMenu.Items.Add("-") # Separator

    $editDescItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $editDescItem.Text = "Edit Description"
    $contextMenu.Items.Add($editDescItem)

    $contextMenu.Items.Add("-") # Separator

    $deleteGroupItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $deleteGroupItem.Text = "Delete Group"
    $contextMenu.Items.Add($deleteGroupItem)

    $groupsList.ContextMenuStrip = $contextMenu

    # Event handlers
    $searchBox.Add_TextChanged({
        Filter-GroupsList -SearchText $searchBox.Text -TypeFilter $typeCombo.Text -ListView $groupsList
    })

    $typeCombo.Add_SelectedIndexChanged({
        Filter-GroupsList -SearchText $searchBox.Text -TypeFilter $typeCombo.Text -ListView $groupsList
    })

    $refreshBtn.Add_Click({
        Load-Groups -ListView $groupsList -StatusLabel $statusLabel
    })

    $addGroupBtn.Add_Click({
        Show-AddGroupDialog -Parent $Script:MainForm -OnGroupAdded {
            Load-Groups -ListView $groupsList -StatusLabel $statusLabel
        }
    })

    $groupsList.Add_DoubleClick({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $selectedGroup = $groupsList.SelectedItems[0]
            Show-GroupMembersDialog -Group $selectedGroup -Parent $Script:MainForm
        }
    })

    # Context menu events
    $viewMembersItem.Add_Click({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $selectedGroup = $groupsList.SelectedItems[0]
            Show-GroupMembersDialog -Group $selectedGroup -Parent $Script:MainForm
        }
    })

    $addMemberItem.Add_Click({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $groupName = $groupsList.SelectedItems[0].SubItems[0].Text
            Show-AddMemberDialog -GroupName $groupName -Parent $Script:MainForm -OnMemberAdded {
                Load-Groups -ListView $groupsList -StatusLabel $statusLabel
            }
        }
    })

    $removeMemberItem.Add_Click({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $groupName = $groupsList.SelectedItems[0].SubItems[0].Text
            Show-RemoveMemberDialog -GroupName $groupName -Parent $Script:MainForm -OnMemberRemoved {
                Load-Groups -ListView $groupsList -StatusLabel $statusLabel
            }
        }
    })

    $editDescItem.Add_Click({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $selectedGroup = $groupsList.SelectedItems[0]
            $groupName = $selectedGroup.SubItems[0].Text
            $currentDesc = $selectedGroup.SubItems[1].Text
            $newDesc = [Microsoft.VisualBasic.Interaction]::InputBox("Enter new description:", "Edit Description", $currentDesc)
            if ($newDesc -ne "" -and $newDesc -ne $currentDesc) {
                $result = Set-GroupDescription -Config $Script:ConnectionConfig -GroupName $groupName -Description $newDesc
                if ($result.Success) {
                    $statusLabel.Text = $result.Message
                    $selectedGroup.SubItems[1].Text = $newDesc
                } else {
                    $statusLabel.Text = "Error: $($result.Error)"
                }
            }
        }
    })

    $deleteGroupItem.Add_Click({
        if ($groupsList.SelectedItems.Count -gt 0) {
            $groupName = $groupsList.SelectedItems[0].SubItems[0].Text
            $confirmResult = [System.Windows.Forms.MessageBox]::Show("Are you sure you want to delete the group '$groupName'?", "Confirm Delete", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($confirmResult -eq [System.Windows.Forms.DialogResult]::Yes) {
                $result = Remove-ADGroup -Config $Script:ConnectionConfig -GroupName $groupName
                if ($result.Success) {
                    $statusLabel.Text = $result.Message
                    Load-Groups -ListView $groupsList -StatusLabel $statusLabel
                } else {
                    [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
                }
            }
        }
    })

    # Load initial data if connected
    if ($Script:IsConnected) {
        Load-Groups -ListView $groupsList -StatusLabel $statusLabel
    }
}

# Load groups from Active Directory
function Load-Groups {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [System.Windows.Forms.Label]$StatusLabel
    )

    try {
        $StatusLabel.Text = "Loading groups..."
        $ListView.Items.Clear()
        $Script:MainForm.Refresh()

        if (-not $Script:IsConnected) {
            # Load dummy groups for demonstration
            $dummyGroups = @(
                @{ Name = "Domain Admins"; Description = "Designated administrators of the domain"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 5; WhenCreated = "2020-01-15 10:30" }
                @{ Name = "IT Support"; Description = "IT Support Team"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 8; WhenCreated = "2020-03-22 14:15" }
                @{ Name = "All Employees"; Description = "All company employees"; GroupCategory = "Distribution"; GroupScope = "Universal"; MemberCount = 150; WhenCreated = "2020-01-15 10:30" }
                @{ Name = "Marketing Team"; Description = "Marketing Department"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 12; WhenCreated = "2020-05-10 09:20" }
                @{ Name = "VPN Users"; Description = "Users with VPN access"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 45; WhenCreated = "2021-02-18 16:45" }
                @{ Name = "Finance Team"; Description = "Finance Department"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 7; WhenCreated = "2020-04-12 11:30" }
                @{ Name = "Engineering Team"; Description = "Software Engineering Department"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 25; WhenCreated = "2020-06-05 13:10" }
            )

            foreach ($group in $dummyGroups) {
                Add-GroupToListView -ListView $ListView -Group $group
            }

            $Script:Groups = $dummyGroups
            $StatusLabel.Text = "Demo mode - $($dummyGroups.Count) groups loaded"
        } else {
            # Load real groups from AD
            $result = Get-ADGroups -Config $Script:ConnectionConfig

            if ($result.Success) {
                $Script:Groups = $result.Groups
                foreach ($group in $result.Groups) {
                    Add-GroupToListView -ListView $ListView -Group $group
                }
                $StatusLabel.Text = "$($result.Groups.Count) groups loaded"
            } else {
                $StatusLabel.Text = "Error loading groups: $($result.Error)"
            }
        }
    } catch {
        $StatusLabel.Text = "Error loading groups: $($_.Exception.Message)"
        Write-DebugLog "Error loading groups" $_.Exception.Message
    }
}

# Add group to ListView
function Add-GroupToListView {
    param(
        [System.Windows.Forms.ListView]$ListView,
        [hashtable]$Group
    )

    $item = New-Object System.Windows.Forms.ListViewItem($Group.Name)
    $item.SubItems.Add($Group.Description)
    $item.SubItems.Add($Group.GroupCategory)
    $item.SubItems.Add($Group.GroupScope)
    $item.SubItems.Add($Group.MemberCount)
    $item.SubItems.Add($Group.WhenCreated)
    $item.Tag = $Group

    # Color coding based on type
    $colors = Get-ThemeColors
    if ($Group.GroupCategory -eq "Distribution") {
        $item.ForeColor = $colors.Primary
    }

    $ListView.Items.Add($item)
}

# Filter groups list
function Filter-GroupsList {
    param(
        [string]$SearchText,
        [string]$TypeFilter,
        [System.Windows.Forms.ListView]$ListView
    )

    $ListView.Items.Clear()
    $filteredGroups = $Script:Groups

    # Apply type filter
    if ($TypeFilter -ne "All Types") {
        $filteredGroups = $filteredGroups | Where-Object { $_.GroupCategory -eq $TypeFilter }
    }

    # Apply search filter
    if ($SearchText.Trim()) {
        $searchLower = $SearchText.ToLower()
        $filteredGroups = $filteredGroups | Where-Object {
            ($_.Name -and $_.Name.ToLower().Contains($searchLower)) -or
            ($_.Description -and $_.Description.ToLower().Contains($searchLower)) -or
            ($_.GroupCategory -and $_.GroupCategory.ToLower().Contains($searchLower)) -or
            ($_.GroupScope -and $_.GroupScope.ToLower().Contains($searchLower))
        }
    }

    foreach ($group in $filteredGroups) {
        Add-GroupToListView -ListView $ListView -Group $group
    }
}

# Get groups from Active Directory
function Get-ADGroups {
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

        $getGroupsCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$groups = Get-ADGroup -Filter * $serverParam $authParam $searchBase -Properties Name, Description, GroupCategory, GroupScope, Members, WhenCreated -ErrorAction Stop

    `$result = @()
    foreach (`$group in `$groups) {
        `$memberCount = if (`$group.Members) { `$group.Members.Count } else { 0 }
        `$whenCreated = if (`$group.WhenCreated) { `$group.WhenCreated.ToString("yyyy-MM-dd HH:mm") } else { "Unknown" }

        `$groupObj = @{
            Name = `$group.Name
            Description = `$group.Description
            GroupCategory = `$group.GroupCategory
            GroupScope = `$group.GroupScope
            MemberCount = `$memberCount
            WhenCreated = `$whenCreated
            DistinguishedName = `$group.DistinguishedName
            Members = `$group.Members
        }
        `$result += `$groupObj
    }

    `$result | ConvertTo-Json -Depth 3

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $getGroupsCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "^\[" -or $result -match "^\{") {
            try {
                $groups = $result | ConvertFrom-Json
                if (-not $groups) { $groups = @() }
                if ($groups -isnot [array]) { $groups = @($groups) }

                return @{ Success = $true; Groups = $groups }
            } catch {
                return @{ Success = $false; Error = "Failed to parse group data: $($_.Exception.Message)" }
            }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Show Add Group dialog
function Show-AddGroupDialog {
    param(
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnGroupAdded
    )

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Add New Group"
    $dialog.Size = New-Object System.Drawing.Size(450, 350)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $dialog.MaximizeBox = $false
    $dialog.MinimizeBox = $false
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Create New Group"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Group Name
    $nameLabel = New-Object System.Windows.Forms.Label
    $nameLabel.Text = "Group Name:"
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
    $descLabel.Text = "Description:"
    $descLabel.Location = New-Object System.Drawing.Point(20, 150)
    $descLabel.AutoSize = $true
    $descLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($descLabel)

    $descText = New-Object System.Windows.Forms.TextBox
    $descText.Size = New-Object System.Drawing.Size(380, 25)
    $descText.Location = New-Object System.Drawing.Point(20, 175)
    $descText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $dialog.Controls.Add($descText)

    # Group Type
    $typeLabel = New-Object System.Windows.Forms.Label
    $typeLabel.Text = "Group Type:"
    $typeLabel.Location = New-Object System.Drawing.Point(20, 220)
    $typeLabel.AutoSize = $true
    $typeLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($typeLabel)

    $typeCombo = New-Object System.Windows.Forms.ComboBox
    $typeCombo.Size = New-Object System.Drawing.Size(150, 25)
    $typeCombo.Location = New-Object System.Drawing.Point(20, 245)
    $typeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $typeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $typeCombo.Items.AddRange(@("Security", "Distribution"))
    $typeCombo.SelectedIndex = 0
    $dialog.Controls.Add($typeCombo)

    # Group Scope
    $scopeLabel = New-Object System.Windows.Forms.Label
    $scopeLabel.Text = "Group Scope:"
    $scopeLabel.Location = New-Object System.Drawing.Point(200, 220)
    $scopeLabel.AutoSize = $true
    $scopeLabel.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($scopeLabel)

    $scopeCombo = New-Object System.Windows.Forms.ComboBox
    $scopeCombo.Size = New-Object System.Drawing.Size(150, 25)
    $scopeCombo.Location = New-Object System.Drawing.Point(200, 245)
    $scopeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $scopeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $scopeCombo.Items.AddRange(@("Global", "DomainLocal", "Universal"))
    $scopeCombo.SelectedIndex = 0
    $dialog.Controls.Add($scopeCombo)

    # Buttons
    $createBtn = New-Object System.Windows.Forms.Button
    $createBtn.Text = "Create Group"
    $createBtn.Size = New-Object System.Drawing.Size(120, 35)
    $createBtn.Location = New-Object System.Drawing.Point(200, 290)
    $createBtn.BackColor = $colors.Primary
    $createBtn.ForeColor = [System.Drawing.Color]::White
    $createBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $createBtn.FlatAppearance.BorderSize = 0
    $dialog.Controls.Add($createBtn)

    $cancelBtn = New-Object System.Windows.Forms.Button
    $cancelBtn.Text = "Cancel"
    $cancelBtn.Size = New-Object System.Drawing.Size(100, 35)
    $cancelBtn.Location = New-Object System.Drawing.Point(330, 290)
    $cancelBtn.BackColor = $colors.SurfaceAlt
    $cancelBtn.ForeColor = $colors.TextPrimary
    $cancelBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $cancelBtn.FlatAppearance.BorderColor = $colors.Border
    $dialog.Controls.Add($cancelBtn)

    # Event handlers
    $createBtn.Add_Click({
        try {
            if (-not $nameText.Text.Trim()) {
                [System.Windows.Forms.MessageBox]::Show("Please enter a group name", "Validation Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                return
            }

            $groupData = @{
                GroupName = $nameText.Text.Trim()
                Description = $descText.Text.Trim()
                Type = $typeCombo.Text
                Scope = $scopeCombo.Text
            }

            $result = New-ADGroupObject -Config $Script:ConnectionConfig -GroupData $groupData

            if ($result.Success) {
                [System.Windows.Forms.MessageBox]::Show($result.Message, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                $dialog.DialogResult = [System.Windows.Forms.DialogResult]::OK
                $dialog.Close()
                if ($OnGroupAdded) { & $OnGroupAdded }
            } else {
                [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Error creating group: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    })

    $cancelBtn.Add_Click({
        $dialog.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
        $dialog.Close()
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}

# Create new AD group
function New-ADGroupObject {
    param(
        [hashtable]$Config,
        [hashtable]$GroupData
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

        $createGroupCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    `$props = @{
        Name = "$($GroupData.GroupName)"
        SamAccountName = "$($GroupData.GroupName)"
        GroupCategory = "$($GroupData.Type)"
        GroupScope = "$($GroupData.Scope)"
        Path = "$ouPath"
    }
    if ("$($GroupData.Description)") { `$props.Description = "$($GroupData.Description)" }

    New-ADGroup $serverParam $authParam @props -ErrorAction Stop
    Write-Output "Group $($GroupData.GroupName) created successfully"

} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $createGroupCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "created successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Set group description
function Set-GroupDescription {
    param(
        [hashtable]$Config,
        [string]$GroupName,
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
    Set-ADGroup $serverParam $authParam -Identity "$GroupName" -Description "$Description" -ErrorAction Stop
    Write-Output "Group description updated successfully"
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

# Remove AD group
function Remove-ADGroup {
    param(
        [hashtable]$Config,
        [string]$GroupName
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

        $removeGroupCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Remove-ADGroup $serverParam $authParam -Identity "$GroupName" -Confirm:`$false -ErrorAction Stop
    Write-Output "Group $GroupName deleted successfully"
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $removeGroupCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "deleted successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Show Group Members dialog
function Show-GroupMembersDialog {
    param(
        [System.Windows.Forms.ListViewItem]$Group,
        [System.Windows.Forms.Form]$Parent
    )

    $colors = Get-ThemeColors
    $groupData = $Group.Tag

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Group Members - $($groupData.Name)"
    $dialog.Size = New-Object System.Drawing.Size(600, 500)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Members of $($groupData.Name)"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Members list
    $membersList = New-Object System.Windows.Forms.ListBox
    $membersList.Size = New-Object System.Drawing.Size(550, 350)
    $membersList.Location = New-Object System.Drawing.Point(20, 60)
    $membersList.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $membersList.BackColor = $colors.Surface
    $membersList.ForeColor = $colors.TextPrimary
    $dialog.Controls.Add($membersList)

    # Load members
    if ($Script:IsConnected) {
        # Load real members from AD
        $members = Get-GroupMembers -Config $Script:ConnectionConfig -GroupName $groupData.Name
        foreach ($member in $members) {
            $membersList.Items.Add($member)
        }
    } else {
        # Demo members
        $demoMembers = @("John Smith", "Jane Doe", "Robert Johnson", "Alice Brown", "Charles Wilson")
        foreach ($member in $demoMembers) {
            $membersList.Items.Add($member)
        }
    }

    # Close button
    $closeBtn = New-Object System.Windows.Forms.Button
    $closeBtn.Text = "Close"
    $closeBtn.Size = New-Object System.Drawing.Size(100, 35)
    $closeBtn.Location = New-Object System.Drawing.Point(470, 420)
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

# Get group members
function Get-GroupMembers {
    param(
        [hashtable]$Config,
        [string]$GroupName
    )

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

        $getMembersCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    `$members = Get-ADGroupMember $serverParam $authParam -Identity "$GroupName" -ErrorAction Stop
    `$members | ForEach-Object { `$_.Name }
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $getMembersCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -and -not $result.StartsWith("ERROR")) {
            return $result -split "`n" | Where-Object { $_.Trim() }
        } else {
            return @()
        }
    } catch {
        return @()
    }
}

# Show Add Member dialog (simplified - would need user picker in full implementation)
function Show-AddMemberDialog {
    param(
        [string]$GroupName,
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnMemberAdded
    )

    $memberName = [Microsoft.VisualBasic.Interaction]::InputBox("Enter username to add to group:", "Add Member to $GroupName", "")
    if ($memberName) {
        $result = Add-GroupMember -Config $Script:ConnectionConfig -GroupName $GroupName -MemberName $memberName
        if ($result.Success) {
            [System.Windows.Forms.MessageBox]::Show($result.Message, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            if ($OnMemberAdded) { & $OnMemberAdded }
        } else {
            [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    }
}

# Show Remove Member dialog (simplified - would need member picker in full implementation)
function Show-RemoveMemberDialog {
    param(
        [string]$GroupName,
        [System.Windows.Forms.Form]$Parent,
        [scriptblock]$OnMemberRemoved
    )

    $memberName = [Microsoft.VisualBasic.Interaction]::InputBox("Enter username to remove from group:", "Remove Member from $GroupName", "")
    if ($memberName) {
        $result = Remove-GroupMember -Config $Script:ConnectionConfig -GroupName $GroupName -MemberName $memberName
        if ($result.Success) {
            [System.Windows.Forms.MessageBox]::Show($result.Message, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            if ($OnMemberRemoved) { & $OnMemberRemoved }
        } else {
            [System.Windows.Forms.MessageBox]::Show($result.Error, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    }
}

# Add member to group
function Add-GroupMember {
    param(
        [hashtable]$Config,
        [string]$GroupName,
        [string]$MemberName
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

        $addMemberCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Add-ADGroupMember $serverParam $authParam -Identity "$GroupName" -Members "$MemberName" -ErrorAction Stop
    Write-Output "User $MemberName added to group $GroupName successfully"
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $addMemberCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "added to group.*successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Remove member from group
function Remove-GroupMember {
    param(
        [hashtable]$Config,
        [string]$GroupName,
        [string]$MemberName
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

        $removeMemberCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Remove-ADGroupMember $serverParam $authParam -Identity "$GroupName" -Members "$MemberName" -Confirm:`$false -ErrorAction Stop
    Write-Output "User $MemberName removed from group $GroupName successfully"
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $removeMemberCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "removed from group.*successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}