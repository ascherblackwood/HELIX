# AdminPage.ps1 - Admin/Connection page for Act.V PowerShell

function Show-AdminPage {
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
    $titleLabel.Text = "Active Directory Connection"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Configure your Active Directory connection settings"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $subtitleLabel.ForeColor = $colors.TextSecondary
    $subtitleLabel.Location = New-Object System.Drawing.Point(30, 70)
    $subtitleLabel.AutoSize = $true
    $container.Controls.Add($subtitleLabel)

    # Connection status panel
    $statusPanel = New-Object System.Windows.Forms.Panel
    $statusPanel.Size = New-Object System.Drawing.Size(800, 80)
    $statusPanel.Location = New-Object System.Drawing.Point(30, 120)
    $statusPanel.BackColor = $colors.Surface
    $statusPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $container.Controls.Add($statusPanel)

    $statusIcon = New-Object System.Windows.Forms.Label
    $statusIcon.Text = if ($Script:IsConnected) { "[OK]" } else { "[X]" }
    $statusIcon.Font = New-Object System.Drawing.Font("Segoe UI", 16)
    $statusIcon.Location = New-Object System.Drawing.Point(20, 25)
    $statusIcon.AutoSize = $true
    $statusPanel.Controls.Add($statusIcon)

    $statusText = New-Object System.Windows.Forms.Label
    $statusText.Text = if ($Script:IsConnected) { "Connected to Active Directory" } else { "Not connected to Active Directory" }
    $statusText.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $statusText.ForeColor = if ($Script:IsConnected) { $colors.Success } else { $colors.Error }
    $statusText.Location = New-Object System.Drawing.Point(60, 25)
    $statusText.AutoSize = $true
    $statusPanel.Controls.Add($statusText)

    # Connection form panel
    $formPanel = New-Object System.Windows.Forms.Panel
    $formPanel.Size = New-Object System.Drawing.Size(800, 500)
    $formPanel.Location = New-Object System.Drawing.Point(30, 220)
    $formPanel.BackColor = $colors.Surface
    $formPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $container.Controls.Add($formPanel)

    # Form title
    $formTitle = New-Object System.Windows.Forms.Label
    $formTitle.Text = "Connection Settings"
    $formTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $formTitle.ForeColor = $colors.TextPrimary
    $formTitle.Location = New-Object System.Drawing.Point(30, 25)
    $formTitle.AutoSize = $true
    $formPanel.Controls.Add($formTitle)

    # Server field
    $serverLabel = New-Object System.Windows.Forms.Label
    $serverLabel.Text = "Domain Controller / Server:"
    $serverLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $serverLabel.ForeColor = $colors.TextPrimary
    $serverLabel.Location = New-Object System.Drawing.Point(30, 80)
    $serverLabel.AutoSize = $true
    $formPanel.Controls.Add($serverLabel)

    $serverText = New-Object System.Windows.Forms.TextBox
    $serverText.Size = New-Object System.Drawing.Size(350, 30)
    $serverText.Location = New-Object System.Drawing.Point(30, 105)
    $serverText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $serverText.Text = $Script:ConnectionConfig.Server
    $formPanel.Controls.Add($serverText)

    # Port field
    $portLabel = New-Object System.Windows.Forms.Label
    $portLabel.Text = "Port:"
    $portLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $portLabel.ForeColor = $colors.TextPrimary
    $portLabel.Location = New-Object System.Drawing.Point(400, 80)
    $portLabel.AutoSize = $true
    $formPanel.Controls.Add($portLabel)

    $portText = New-Object System.Windows.Forms.TextBox
    $portText.Size = New-Object System.Drawing.Size(120, 30)
    $portText.Location = New-Object System.Drawing.Point(400, 105)
    $portText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $portText.Text = if ($Script:ConnectionConfig.Port) { $Script:ConnectionConfig.Port } else { "389" }
    $formPanel.Controls.Add($portText)

    # Username field
    $userLabel = New-Object System.Windows.Forms.Label
    $userLabel.Text = "Username:"
    $userLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $userLabel.ForeColor = $colors.TextPrimary
    $userLabel.Location = New-Object System.Drawing.Point(30, 160)
    $userLabel.AutoSize = $true
    $formPanel.Controls.Add($userLabel)

    $userText = New-Object System.Windows.Forms.TextBox
    $userText.Size = New-Object System.Drawing.Size(350, 30)
    $userText.Location = New-Object System.Drawing.Point(30, 185)
    $userText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $userText.Text = $Script:ConnectionConfig.Username
    $formPanel.Controls.Add($userText)

    # Password field
    $passLabel = New-Object System.Windows.Forms.Label
    $passLabel.Text = "Password:"
    $passLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $passLabel.ForeColor = $colors.TextPrimary
    $passLabel.Location = New-Object System.Drawing.Point(400, 160)
    $passLabel.AutoSize = $true
    $formPanel.Controls.Add($passLabel)

    $passText = New-Object System.Windows.Forms.TextBox
    $passText.Size = New-Object System.Drawing.Size(350, 30)
    $passText.Location = New-Object System.Drawing.Point(400, 185)
    $passText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $passText.UseSystemPasswordChar = $true
    $formPanel.Controls.Add($passText)

    # Parent OU field
    $ouLabel = New-Object System.Windows.Forms.Label
    $ouLabel.Text = "Parent OU (Optional):"
    $ouLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $ouLabel.ForeColor = $colors.TextPrimary
    $ouLabel.Location = New-Object System.Drawing.Point(30, 240)
    $ouLabel.AutoSize = $true
    $formPanel.Controls.Add($ouLabel)

    $ouText = New-Object System.Windows.Forms.TextBox
    $ouText.Size = New-Object System.Drawing.Size(720, 30)
    $ouText.Location = New-Object System.Drawing.Point(30, 265)
    $ouText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $ouText.Text = $Script:ConnectionConfig.ParentOU
    # Note: PlaceholderText not available in older .NET Framework versions
    $formPanel.Controls.Add($ouText)

    # SSL checkbox
    $sslCheck = New-Object System.Windows.Forms.CheckBox
    $sslCheck.Text = "Use SSL/TLS (LDAPS)"
    $sslCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $sslCheck.ForeColor = $colors.TextPrimary
    $sslCheck.Location = New-Object System.Drawing.Point(30, 320)
    $sslCheck.AutoSize = $true
    $sslCheck.Checked = $Script:ConnectionConfig.UseSSL
    $formPanel.Controls.Add($sslCheck)

    # Kerberos checkbox
    $kerberosCheck = New-Object System.Windows.Forms.CheckBox
    $kerberosCheck.Text = "Use Kerberos Authentication"
    $kerberosCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $kerberosCheck.ForeColor = $colors.TextPrimary
    $kerberosCheck.Location = New-Object System.Drawing.Point(280, 320)
    $kerberosCheck.AutoSize = $true
    $kerberosCheck.Checked = $Script:ConnectionConfig.UseKerberos
    $formPanel.Controls.Add($kerberosCheck)

    # Connect button
    $connectBtn = New-Object System.Windows.Forms.Button
    $connectBtn.Text = "Test Connection"
    $connectBtn.Size = New-Object System.Drawing.Size(150, 40)
    $connectBtn.Location = New-Object System.Drawing.Point(30, 370)
    $connectBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $connectBtn.BackColor = $colors.Primary
    $connectBtn.ForeColor = [System.Drawing.Color]::White
    $connectBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $connectBtn.FlatAppearance.BorderSize = 0
    $connectBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $formPanel.Controls.Add($connectBtn)

    # Save Settings button
    $saveBtn = New-Object System.Windows.Forms.Button
    $saveBtn.Text = "Save Settings"
    $saveBtn.Size = New-Object System.Drawing.Size(150, 40)
    $saveBtn.Location = New-Object System.Drawing.Point(200, 370)
    $saveBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $saveBtn.BackColor = $colors.SurfaceAlt
    $saveBtn.ForeColor = $colors.TextPrimary
    $saveBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $saveBtn.FlatAppearance.BorderColor = $colors.Border
    $saveBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $formPanel.Controls.Add($saveBtn)

    # Launch ADUC button
    $aducBtn = New-Object System.Windows.Forms.Button
    $aducBtn.Text = "Launch ADUC"
    $aducBtn.Size = New-Object System.Drawing.Size(150, 40)
    $aducBtn.Location = New-Object System.Drawing.Point(360, 330)
    $aducBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $aducBtn.BackColor = $colors.SurfaceAlt
    $aducBtn.ForeColor = $colors.TextPrimary
    $aducBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $aducBtn.FlatAppearance.BorderColor = $colors.Border
    $aducBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $formPanel.Controls.Add($aducBtn)

    # Status label for connection attempts
    $connectionStatus = New-Object System.Windows.Forms.Label
    $connectionStatus.Text = ""
    $connectionStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $connectionStatus.ForeColor = $colors.TextSecondary
    $connectionStatus.Location = New-Object System.Drawing.Point(20, 390)
    $connectionStatus.Size = New-Object System.Drawing.Size(730, 60)
    $formPanel.Controls.Add($connectionStatus)

    # Event handlers
    $connectBtn.Add_Click({
        try {
            $connectionStatus.Text = "Testing connection..."
            $connectionStatus.ForeColor = $colors.TextSecondary
            $Script:MainForm.Refresh()

            # Build connection config
            $config = @{
                Server = $serverText.Text.Trim()
                Port = [int]$portText.Text
                Username = $userText.Text.Trim()
                Password = $passText.Text
                ParentOU = $ouText.Text.Trim()
                UseSSL = $sslCheck.Checked
                UseKerberos = $kerberosCheck.Checked
            }

            # Test LDAP connection
            $result = Test-ADConnection -Config $config

            if ($result.Success) {
                $Script:ConnectionConfig = $config
                $Script:IsConnected = $true
                $connectionStatus.Text = "[OK] $($result.Message)"
                $connectionStatus.ForeColor = $colors.Success

                # Update status panel
                $statusIcon.Text = "[OK]"
                $statusText.Text = "Connected to Active Directory"
                $statusText.ForeColor = $colors.Success
            } else {
                $connectionStatus.Text = "[X] $($result.Error)"
                $connectionStatus.ForeColor = $colors.Error
            }
        } catch {
            $connectionStatus.Text = "[X] Connection test failed: $($_.Exception.Message)"
            $connectionStatus.ForeColor = $colors.Error
        }
    })

    $saveBtn.Add_Click({
        try {
            # Save settings to config file
            $config = @{
                Server = $serverText.Text.Trim()
                Port = [int]$portText.Text
                Username = $userText.Text.Trim()
                ParentOU = $ouText.Text.Trim()
                UseSSL = $sslCheck.Checked
                UseKerberos = $kerberosCheck.Checked
            }

            $configPath = "$PSScriptRoot\ActV-Config.json"
            $config | ConvertTo-Json -Depth 3 | Set-Content -Path $configPath

            $connectionStatus.Text = "[OK] Settings saved successfully"
            $connectionStatus.ForeColor = $colors.Success
        } catch {
            $connectionStatus.Text = "[X] Failed to save settings: $($_.Exception.Message)"
            $connectionStatus.ForeColor = $colors.Error
        }
    })

    $aducBtn.Add_Click({
        try {
            $connectionStatus.Text = "Launching Active Directory Users and Computers..."
            $connectionStatus.ForeColor = $colors.TextSecondary

            if ($Script:ConnectionConfig.Username -and $Script:ConnectionConfig.Password) {
                # Launch with alternate credentials
                $result = Start-ADUC -Config $Script:ConnectionConfig
            } else {
                # Launch with current credentials
                Start-Process "mmc.exe" -ArgumentList "dsa.msc"
                $result = @{ Success = $true; Message = "ADUC launched with current credentials" }
            }

            if ($result.Success) {
                $connectionStatus.Text = "[OK] $($result.Message)"
                $connectionStatus.ForeColor = $colors.Success
            } else {
                $connectionStatus.Text = "[X] $($result.Error)"
                $connectionStatus.ForeColor = $colors.Error
            }
        } catch {
            $connectionStatus.Text = "[X] Failed to launch ADUC: $($_.Exception.Message)"
            $connectionStatus.ForeColor = $colors.Error
        }
    })

    # Load saved settings on startup
    try {
        $configPath = "$PSScriptRoot\ActV-Config.json"
        if (Test-Path $configPath) {
            $savedConfig = Get-Content -Path $configPath | ConvertFrom-Json
            $serverText.Text = $savedConfig.Server
            $portText.Text = $savedConfig.Port
            $userText.Text = $savedConfig.Username
            $ouText.Text = $savedConfig.ParentOU
            $sslCheck.Checked = $savedConfig.UseSSL
            $kerberosCheck.Checked = $savedConfig.UseKerberos
        }
    } catch {
        Write-DebugLog "Failed to load saved config" $_.Exception.Message
    }
}

# Test Active Directory connection
function Test-ADConnection {
    param([hashtable]$Config)

    try {
        if (-not $Config.Server) {
            return @{ Success = $false; Error = "Server is required" }
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
        $searchBase = if ($Config.ParentOU) { "-SearchBase `"$($Config.ParentOU)`"" } else { "" }

        $testCommand = @"
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    `$null = Get-ADUser -Filter * $serverParam $authParam $searchBase -ResultSetSize 1 -ErrorAction Stop
    Write-Output "Connected successfully using $($Config.Server)"
} catch {
    Write-Error `$_.Exception.Message
}
"@

        $result = Invoke-PowerShellCommand -Command $testCommand -Environment $env -UseCredentials:$useCredentials

        if ($result -match "Connected successfully") {
            return @{ Success = $true; Message = $result }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Launch ADUC with alternate credentials
function Start-ADUC {
    param([hashtable]$Config)

    try {
        if ($Config.Username -and $Config.Password) {
            $env = @{
                'ACTV_USER' = $Config.Username
                'ACTV_PASS' = $Config.Password
            }

            $psScript = @'
try {
    $ErrorActionPreference = 'Stop'
    $sec = ConvertTo-SecureString $env:ACTV_PASS -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential ($env:ACTV_USER, $sec)
    Start-Process -FilePath mmc.exe -ArgumentList 'dsa.msc' -Credential $cred
    'OK'
} catch {
    "ERROR: $($_.Exception.Message)"
}
'@

            $result = Invoke-PowerShellCommand -Command $psScript -Environment $env

            if ($result -eq 'OK') {
                return @{ Success = $true; Message = "ADUC launched with alternate credentials" }
            } else {
                return @{ Success = $false; Error = $result.Replace("ERROR: ", "") }
            }
        } else {
            return @{ Success = $false; Error = "Username and password required for alternate credentials" }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}