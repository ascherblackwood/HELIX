# SettingsPage.ps1 - Settings page for Act.V PowerShell

function Show-SettingsPage {
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
    $titleLabel.Text = "Settings"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Configure application preferences and behavior"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $subtitleLabel.ForeColor = $colors.TextSecondary
    $subtitleLabel.Location = New-Object System.Drawing.Point(30, 70)
    $subtitleLabel.AutoSize = $true
    $container.Controls.Add($subtitleLabel)

    # Create tab control for different settings sections
    $tabControl = New-Object System.Windows.Forms.TabControl
    $tabControl.Size = New-Object System.Drawing.Size(($Parent.Width - 60), ($Parent.Height - 150))
    $tabControl.Location = New-Object System.Drawing.Point(30, 120)
    $tabControl.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $container.Controls.Add($tabControl)

    # Appearance tab
    $appearanceTab = New-Object System.Windows.Forms.TabPage
    $appearanceTab.Text = "Appearance"
    $appearanceTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($appearanceTab)

    # Theme selection
    $themeLabel = New-Object System.Windows.Forms.Label
    $themeLabel.Text = "Theme:"
    $themeLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $themeLabel.ForeColor = $colors.TextPrimary
    $themeLabel.Location = New-Object System.Drawing.Point(20, 30)
    $themeLabel.AutoSize = $true
    $appearanceTab.Controls.Add($themeLabel)

    $themeCombo = New-Object System.Windows.Forms.ComboBox
    $themeCombo.Size = New-Object System.Drawing.Size(150, 25)
    $themeCombo.Location = New-Object System.Drawing.Point(20, 60)
    $themeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $themeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $themeCombo.Items.AddRange(@("Auto", "Light", "Dark"))
    $themeCombo.SelectedItem = $Script:CurrentTheme
    $appearanceTab.Controls.Add($themeCombo)

    $themeDesc = New-Object System.Windows.Forms.Label
    $themeDesc.Text = "Auto follows system theme, Light/Dark force specific themes"
    $themeDesc.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $themeDesc.ForeColor = $colors.TextSecondary
    $themeDesc.Location = New-Object System.Drawing.Point(20, 90)
    $themeDesc.Size = New-Object System.Drawing.Size(400, 20)
    $appearanceTab.Controls.Add($themeDesc)

    # Font size
    $fontLabel = New-Object System.Windows.Forms.Label
    $fontLabel.Text = "Font Size:"
    $fontLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $fontLabel.ForeColor = $colors.TextPrimary
    $fontLabel.Location = New-Object System.Drawing.Point(20, 130)
    $fontLabel.AutoSize = $true
    $appearanceTab.Controls.Add($fontLabel)

    $fontSizeCombo = New-Object System.Windows.Forms.ComboBox
    $fontSizeCombo.Size = New-Object System.Drawing.Size(100, 25)
    $fontSizeCombo.Location = New-Object System.Drawing.Point(20, 160)
    $fontSizeCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $fontSizeCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $fontSizeCombo.Items.AddRange(@("Small (9pt)", "Medium (10pt)", "Large (12pt)", "Extra Large (14pt)"))
    $fontSizeCombo.SelectedIndex = 1  # Medium by default
    $appearanceTab.Controls.Add($fontSizeCombo)

    # Connection tab
    $connectionTab = New-Object System.Windows.Forms.TabPage
    $connectionTab.Text = "Connection"
    $connectionTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($connectionTab)

    # Connection timeout
    $timeoutLabel = New-Object System.Windows.Forms.Label
    $timeoutLabel.Text = "Connection Timeout (seconds):"
    $timeoutLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $timeoutLabel.ForeColor = $colors.TextPrimary
    $timeoutLabel.Location = New-Object System.Drawing.Point(20, 30)
    $timeoutLabel.AutoSize = $true
    $connectionTab.Controls.Add($timeoutLabel)

    $timeoutText = New-Object System.Windows.Forms.TextBox
    $timeoutText.Size = New-Object System.Drawing.Size(100, 25)
    $timeoutText.Location = New-Object System.Drawing.Point(20, 60)
    $timeoutText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $timeoutText.Text = "30"
    $connectionTab.Controls.Add($timeoutText)

    # Auto-connect checkbox
    $autoConnectCheck = New-Object System.Windows.Forms.CheckBox
    $autoConnectCheck.Text = "Auto-connect on startup using saved credentials"
    $autoConnectCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $autoConnectCheck.ForeColor = $colors.TextPrimary
    $autoConnectCheck.Location = New-Object System.Drawing.Point(20, 110)
    $autoConnectCheck.Size = New-Object System.Drawing.Size(400, 25)
    $connectionTab.Controls.Add($autoConnectCheck)

    # Remember credentials checkbox
    $rememberCredsCheck = New-Object System.Windows.Forms.CheckBox
    $rememberCredsCheck.Text = "Remember connection credentials (stored securely)"
    $rememberCredsCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $rememberCredsCheck.ForeColor = $colors.TextPrimary
    $rememberCredsCheck.Location = New-Object System.Drawing.Point(20, 150)
    $rememberCredsCheck.Size = New-Object System.Drawing.Size(400, 25)
    $connectionTab.Controls.Add($rememberCredsCheck)

    # Prefer Kerberos checkbox
    $preferKerberosCheck = New-Object System.Windows.Forms.CheckBox
    $preferKerberosCheck.Text = "Prefer Kerberos authentication when available"
    $preferKerberosCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $preferKerberosCheck.ForeColor = $colors.TextPrimary
    $preferKerberosCheck.Location = New-Object System.Drawing.Point(20, 190)
    $preferKerberosCheck.Size = New-Object System.Drawing.Size(400, 25)
    $preferKerberosCheck.Checked = $true
    $connectionTab.Controls.Add($preferKerberosCheck)

    # Logging tab
    $loggingTab = New-Object System.Windows.Forms.TabPage
    $loggingTab.Text = "Logging"
    $loggingTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($loggingTab)

    # Enable logging checkbox
    $enableLoggingCheck = New-Object System.Windows.Forms.CheckBox
    $enableLoggingCheck.Text = "Enable debug logging"
    $enableLoggingCheck.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $enableLoggingCheck.ForeColor = $colors.TextPrimary
    $enableLoggingCheck.Location = New-Object System.Drawing.Point(20, 30)
    $enableLoggingCheck.AutoSize = $true
    $enableLoggingCheck.Checked = $true
    $loggingTab.Controls.Add($enableLoggingCheck)

    # Log level
    $logLevelLabel = New-Object System.Windows.Forms.Label
    $logLevelLabel.Text = "Log Level:"
    $logLevelLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $logLevelLabel.ForeColor = $colors.TextPrimary
    $logLevelLabel.Location = New-Object System.Drawing.Point(20, 70)
    $logLevelLabel.AutoSize = $true
    $loggingTab.Controls.Add($logLevelLabel)

    $logLevelCombo = New-Object System.Windows.Forms.ComboBox
    $logLevelCombo.Size = New-Object System.Drawing.Size(120, 25)
    $logLevelCombo.Location = New-Object System.Drawing.Point(20, 95)
    $logLevelCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $logLevelCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $logLevelCombo.Items.AddRange(@("Error", "Warning", "Info", "Debug", "Verbose"))
    $logLevelCombo.SelectedIndex = 2  # Info by default
    $loggingTab.Controls.Add($logLevelCombo)

    # Clear logs button
    $clearLogsBtn = New-Object System.Windows.Forms.Button
    $clearLogsBtn.Text = "Clear Debug Logs"
    $clearLogsBtn.Size = New-Object System.Drawing.Size(150, 35)
    $clearLogsBtn.Location = New-Object System.Drawing.Point(20, 140)
    $clearLogsBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $clearLogsBtn.BackColor = $colors.Warning
    $clearLogsBtn.ForeColor = [System.Drawing.Color]::White
    $clearLogsBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $clearLogsBtn.FlatAppearance.BorderSize = 0
    $clearLogsBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $loggingTab.Controls.Add($clearLogsBtn)

    # View logs button
    $viewLogsBtn = New-Object System.Windows.Forms.Button
    $viewLogsBtn.Text = "View Debug Logs"
    $viewLogsBtn.Size = New-Object System.Drawing.Size(150, 35)
    $viewLogsBtn.Location = New-Object System.Drawing.Point(180, 140)
    $viewLogsBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $viewLogsBtn.BackColor = $colors.Primary
    $viewLogsBtn.ForeColor = [System.Drawing.Color]::White
    $viewLogsBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $viewLogsBtn.FlatAppearance.BorderSize = 0
    $viewLogsBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $loggingTab.Controls.Add($viewLogsBtn)

    # Advanced tab
    $advancedTab = New-Object System.Windows.Forms.TabPage
    $advancedTab.Text = "Advanced"
    $advancedTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($advancedTab)

    # PowerShell execution policy info
    $psExecutionLabel = New-Object System.Windows.Forms.Label
    $psExecutionLabel.Text = "PowerShell Execution Policy:"
    $psExecutionLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $psExecutionLabel.ForeColor = $colors.TextPrimary
    $psExecutionLabel.Location = New-Object System.Drawing.Point(20, 30)
    $psExecutionLabel.AutoSize = $true
    $advancedTab.Controls.Add($psExecutionLabel)

    $currentPolicy = Get-ExecutionPolicy
    $policyValueLabel = New-Object System.Windows.Forms.Label
    $policyValueLabel.Text = "Current: $currentPolicy"
    $policyValueLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $policyValueLabel.ForeColor = $colors.TextSecondary
    $policyValueLabel.Location = New-Object System.Drawing.Point(20, 60)
    $policyValueLabel.AutoSize = $true
    $advancedTab.Controls.Add($policyValueLabel)

    # Module check
    $moduleLabel = New-Object System.Windows.Forms.Label
    $moduleLabel.Text = "Required Modules:"
    $moduleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $moduleLabel.ForeColor = $colors.TextPrimary
    $moduleLabel.Location = New-Object System.Drawing.Point(20, 100)
    $moduleLabel.AutoSize = $true
    $advancedTab.Controls.Add($moduleLabel)

    $adModuleAvailable = Get-Module -ListAvailable -Name ActiveDirectory
    $adModuleStatus = if ($adModuleAvailable) { "[OK] Installed" } else { "[X] Not Available" }
    $adModuleLabel = New-Object System.Windows.Forms.Label
    $adModuleLabel.Text = "ActiveDirectory: $adModuleStatus"
    $adModuleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $adModuleLabel.ForeColor = if ($adModuleAvailable) { $colors.Success } else { $colors.Error }
    $adModuleLabel.Location = New-Object System.Drawing.Point(20, 130)
    $adModuleLabel.AutoSize = $true
    $advancedTab.Controls.Add($adModuleLabel)

    # Check other useful modules
    $modules = @("ImportExcel", "RSAT")
    $yPos = 160
    foreach ($module in $modules) {
        $available = Get-Module -ListAvailable -Name $module
        $status = if ($available) { "[OK] Available" } else { "[!] Optional" }
        $color = if ($available) { $colors.Success } else { $colors.Warning }

        $moduleStatusLabel = New-Object System.Windows.Forms.Label
        $moduleStatusLabel.Text = "$module`: $status"
        $moduleStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $moduleStatusLabel.ForeColor = $color
        $moduleStatusLabel.Location = New-Object System.Drawing.Point(20, $yPos)
        $moduleStatusLabel.AutoSize = $true
        $advancedTab.Controls.Add($moduleStatusLabel)

        $yPos += 25
    }

    # About tab
    $aboutTab = New-Object System.Windows.Forms.TabPage
    $aboutTab.Text = "About"
    $aboutTab.BackColor = $colors.Background
    $tabControl.TabPages.Add($aboutTab)

    # Application info
    $appNameLabel = New-Object System.Windows.Forms.Label
    $appNameLabel.Text = "Act.V - Active Directory Management Console"
    $appNameLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $appNameLabel.ForeColor = $colors.TextPrimary
    $appNameLabel.Location = New-Object System.Drawing.Point(20, 30)
    $appNameLabel.AutoSize = $true
    $aboutTab.Controls.Add($appNameLabel)

    $versionLabel = New-Object System.Windows.Forms.Label
    $versionLabel.Text = "Version 3.3.1-PowerShell Edition"
    $versionLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $versionLabel.ForeColor = $colors.TextSecondary
    $versionLabel.Location = New-Object System.Drawing.Point(20, 65)
    $versionLabel.AutoSize = $true
    $aboutTab.Controls.Add($versionLabel)

    $descriptionLabel = New-Object System.Windows.Forms.Label
    $descriptionLabel.Text = @"
Pure PowerShell implementation of the Act.V Active Directory Management Console.
Features modern Windows Forms GUI with comprehensive AD administration capabilities.

Built with:
• PowerShell 5.1+
• Windows Forms
• Active Directory PowerShell Module

Copyright © 2025 Act.V Team
"@
    $descriptionLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $descriptionLabel.ForeColor = $colors.TextPrimary
    $descriptionLabel.Location = New-Object System.Drawing.Point(20, 110)
    $descriptionLabel.Size = New-Object System.Drawing.Size(500, 120)
    $aboutTab.Controls.Add($descriptionLabel)

    # System info
    $systemInfoLabel = New-Object System.Windows.Forms.Label
    $systemInfoLabel.Text = "System Information:"
    $systemInfoLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $systemInfoLabel.ForeColor = $colors.TextPrimary
    $systemInfoLabel.Location = New-Object System.Drawing.Point(20, 250)
    $systemInfoLabel.AutoSize = $true
    $aboutTab.Controls.Add($systemInfoLabel)

    $systemDetails = @"
PowerShell Version: $($PSVersionTable.PSVersion)
OS Version: $([System.Environment]::OSVersion.VersionString)
.NET Framework: $([System.Environment]::Version)
Computer Name: $([System.Environment]::MachineName)
User Domain: $([System.Environment]::UserDomainName)
Current User: $([System.Environment]::UserName)
"@

    $systemDetailsLabel = New-Object System.Windows.Forms.Label
    $systemDetailsLabel.Text = $systemDetails
    $systemDetailsLabel.Font = New-Object System.Drawing.Font("Consolas", 9)
    $systemDetailsLabel.ForeColor = $colors.TextSecondary
    $systemDetailsLabel.Location = New-Object System.Drawing.Point(20, 280)
    $systemDetailsLabel.Size = New-Object System.Drawing.Size(500, 120)
    $aboutTab.Controls.Add($systemDetailsLabel)

    # Action buttons at bottom
    $buttonPanel = New-Object System.Windows.Forms.Panel
    $buttonPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), 60)
    $buttonPanel.Location = New-Object System.Drawing.Point(30, ($Parent.Height - 80))
    $buttonPanel.BackColor = $colors.Background
    $container.Controls.Add($buttonPanel)

    # Apply button
    $applyBtn = New-Object System.Windows.Forms.Button
    $applyBtn.Text = "Apply Settings"
    $applyBtn.Size = New-Object System.Drawing.Size(120, 35)
    $applyBtn.Location = New-Object System.Drawing.Point(($buttonPanel.Width - 250), 12)
    $applyBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $applyBtn.BackColor = $colors.Primary
    $applyBtn.ForeColor = [System.Drawing.Color]::White
    $applyBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $applyBtn.FlatAppearance.BorderSize = 0
    $applyBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $buttonPanel.Controls.Add($applyBtn)

    # Reset button
    $resetBtn = New-Object System.Windows.Forms.Button
    $resetBtn.Text = "Reset to Defaults"
    $resetBtn.Size = New-Object System.Drawing.Size(120, 35)
    $resetBtn.Location = New-Object System.Drawing.Point(($buttonPanel.Width - 120), 12)
    $resetBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $resetBtn.BackColor = $colors.SurfaceAlt
    $resetBtn.ForeColor = $colors.TextPrimary
    $resetBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $resetBtn.FlatAppearance.BorderColor = $colors.Border
    $resetBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $buttonPanel.Controls.Add($resetBtn)

    # Status label
    $settingsStatusLabel = New-Object System.Windows.Forms.Label
    $settingsStatusLabel.Text = "Configure settings and click Apply to save changes"
    $settingsStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $settingsStatusLabel.ForeColor = $colors.TextSecondary
    $settingsStatusLabel.Location = New-Object System.Drawing.Point(20, 20)
    $settingsStatusLabel.AutoSize = $true
    $buttonPanel.Controls.Add($settingsStatusLabel)

    # Event handlers
    $themeCombo.Add_SelectedIndexChanged({
        if ($themeCombo.SelectedItem -ne $Script:CurrentTheme) {
            $settingsStatusLabel.Text = "Theme change will take effect after restart"
            $settingsStatusLabel.ForeColor = $colors.Warning
        }
    })

    $clearLogsBtn.Add_Click({
        try {
            $Script:DebugLogs = @()
            $settingsStatusLabel.Text = "Debug logs cleared successfully"
            $settingsStatusLabel.ForeColor = $colors.Success
        } catch {
            $settingsStatusLabel.Text = "Failed to clear logs: $($_.Exception.Message)"
            $settingsStatusLabel.ForeColor = $colors.Error
        }
    })

    $viewLogsBtn.Add_Click({
        Show-DebugLogsDialog -Parent $Script:MainForm
    })

    $applyBtn.Add_Click({
        try {
            # Save settings
            $settings = @{
                Theme = $themeCombo.SelectedItem
                FontSize = $fontSizeCombo.SelectedItem
                ConnectionTimeout = [int]$timeoutText.Text
                AutoConnect = $autoConnectCheck.Checked
                RememberCredentials = $rememberCredsCheck.Checked
                PreferKerberos = $preferKerberosCheck.Checked
                EnableLogging = $enableLoggingCheck.Checked
                LogLevel = $logLevelCombo.SelectedItem
            }

            $configPath = "$PSScriptRoot\ActV-Settings.json"
            $settings | ConvertTo-Json -Depth 3 | Set-Content -Path $configPath

            $settingsStatusLabel.Text = "Settings saved successfully"
            $settingsStatusLabel.ForeColor = $colors.Success

            # Apply theme change if needed
            if ($themeCombo.SelectedItem -ne $Script:CurrentTheme) {
                $Script:CurrentTheme = $themeCombo.SelectedItem
                # Note: Full theme change would require form recreation
                $settingsStatusLabel.Text = "Settings saved - Restart application for theme change"
            }

        } catch {
            $settingsStatusLabel.Text = "Failed to save settings: $($_.Exception.Message)"
            $settingsStatusLabel.ForeColor = $colors.Error
        }
    })

    $resetBtn.Add_Click({
        $confirmResult = [System.Windows.Forms.MessageBox]::Show("Reset all settings to defaults?", "Confirm Reset", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
        if ($confirmResult -eq [System.Windows.Forms.DialogResult]::Yes) {
            # Reset to defaults
            $themeCombo.SelectedItem = "Auto"
            $fontSizeCombo.SelectedIndex = 1
            $timeoutText.Text = "30"
            $autoConnectCheck.Checked = $false
            $rememberCredsCheck.Checked = $false
            $preferKerberosCheck.Checked = $true
            $enableLoggingCheck.Checked = $true
            $logLevelCombo.SelectedIndex = 2

            $settingsStatusLabel.Text = "Settings reset to defaults"
            $settingsStatusLabel.ForeColor = $colors.Success
        }
    })

    # Load saved settings
    Load-SavedSettings -ThemeCombo $themeCombo -FontSizeCombo $fontSizeCombo -TimeoutText $timeoutText -AutoConnectCheck $autoConnectCheck -RememberCredsCheck $rememberCredsCheck -PreferKerberosCheck $preferKerberosCheck -EnableLoggingCheck $enableLoggingCheck -LogLevelCombo $logLevelCombo
}

# Load saved settings from file
function Load-SavedSettings {
    param(
        $ThemeCombo,
        $FontSizeCombo,
        $TimeoutText,
        $AutoConnectCheck,
        $RememberCredsCheck,
        $PreferKerberosCheck,
        $EnableLoggingCheck,
        $LogLevelCombo
    )

    try {
        $configPath = "$PSScriptRoot\ActV-Settings.json"
        if (Test-Path $configPath) {
            $settings = Get-Content -Path $configPath | ConvertFrom-Json

            if ($settings.Theme) { $ThemeCombo.SelectedItem = $settings.Theme }
            if ($settings.FontSize) { $FontSizeCombo.SelectedItem = $settings.FontSize }
            if ($settings.ConnectionTimeout) { $TimeoutText.Text = $settings.ConnectionTimeout }
            if ($settings.PSObject.Properties['AutoConnect']) { $AutoConnectCheck.Checked = $settings.AutoConnect }
            if ($settings.PSObject.Properties['RememberCredentials']) { $RememberCredsCheck.Checked = $settings.RememberCredentials }
            if ($settings.PSObject.Properties['PreferKerberos']) { $PreferKerberosCheck.Checked = $settings.PreferKerberos }
            if ($settings.PSObject.Properties['EnableLogging']) { $EnableLoggingCheck.Checked = $settings.EnableLogging }
            if ($settings.LogLevel) { $LogLevelCombo.SelectedItem = $settings.LogLevel }
        }
    } catch {
        Write-DebugLog "Failed to load saved settings" $_.Exception.Message
    }
}

# Show debug logs dialog
function Show-DebugLogsDialog {
    param([System.Windows.Forms.Form]$Parent)

    $colors = Get-ThemeColors

    # Create dialog
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = "Debug Logs"
    $dialog.Size = New-Object System.Drawing.Size(800, 600)
    $dialog.StartPosition = 'CenterParent'
    $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
    $dialog.BackColor = $colors.Background

    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Debug Logs"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.AutoSize = $true
    $dialog.Controls.Add($titleLabel)

    # Logs text box
    $logsTextBox = New-Object System.Windows.Forms.TextBox
    $logsTextBox.Location = New-Object System.Drawing.Point(20, 60)
    $logsTextBox.Size = New-Object System.Drawing.Size(740, 450)
    $logsTextBox.Multiline = $true
    $logsTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $logsTextBox.ReadOnly = $true
    $logsTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $logsTextBox.BackColor = $colors.Surface
    $logsTextBox.ForeColor = $colors.TextPrimary

    # Load debug logs
    if ($Script:DebugLogs.Count -gt 0) {
        $logsTextBox.Text = $Script:DebugLogs -join "`r`n"
        $logsTextBox.SelectionStart = $logsTextBox.Text.Length
        $logsTextBox.ScrollToCaret()
    } else {
        $logsTextBox.Text = "No debug logs available"
    }

    $dialog.Controls.Add($logsTextBox)

    # Export button
    $exportBtn = New-Object System.Windows.Forms.Button
    $exportBtn.Text = "Export to File"
    $exportBtn.Size = New-Object System.Drawing.Size(120, 35)
    $exportBtn.Location = New-Object System.Drawing.Point(520, 525)
    $exportBtn.BackColor = $colors.Primary
    $exportBtn.ForeColor = [System.Drawing.Color]::White
    $exportBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $exportBtn.FlatAppearance.BorderSize = 0
    $dialog.Controls.Add($exportBtn)

    # Close button
    $closeBtn = New-Object System.Windows.Forms.Button
    $closeBtn.Text = "Close"
    $closeBtn.Size = New-Object System.Drawing.Size(100, 35)
    $closeBtn.Location = New-Object System.Drawing.Point(660, 525)
    $closeBtn.BackColor = $colors.SurfaceAlt
    $closeBtn.ForeColor = $colors.TextPrimary
    $closeBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $closeBtn.FlatAppearance.BorderColor = $colors.Border
    $dialog.Controls.Add($closeBtn)

    # Event handlers
    $exportBtn.Add_Click({
        try {
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $fileName = "ActV_DebugLogs_$timestamp.txt"
            $desktopPath = [Environment]::GetFolderPath("Desktop")
            $filePath = Join-Path $desktopPath $fileName

            $logsTextBox.Text | Set-Content -Path $filePath
            [System.Windows.Forms.MessageBox]::Show("Debug logs exported to $filePath", "Export Complete", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Failed to export logs: $($_.Exception.Message)", "Export Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    })

    $closeBtn.Add_Click({
        $dialog.Close()
    })

    # Show dialog
    $dialog.ShowDialog($Parent)
}