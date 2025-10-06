# ReportsPage.ps1 - Reports page for Act.V PowerShell

function Show-ReportsPage {
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
    $titleLabel.Text = "Reports"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $colors.TextPrimary
    $titleLabel.Location = New-Object System.Drawing.Point(30, 30)
    $titleLabel.AutoSize = $true
    $container.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "Generate and export Active Directory reports"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $subtitleLabel.ForeColor = $colors.TextSecondary
    $subtitleLabel.Location = New-Object System.Drawing.Point(30, 70)
    $subtitleLabel.AutoSize = $true
    $container.Controls.Add($subtitleLabel)

    # Reports grid
    $reportsPanel = New-Object System.Windows.Forms.Panel
    $reportsPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), 400)
    $reportsPanel.Location = New-Object System.Drawing.Point(30, 120)
    $reportsPanel.BackColor = $colors.Background
    $container.Controls.Add($reportsPanel)

    # Report cards
    $reports = @(
        @{ Title = "User Report"; Description = "Export all users with details"; Action = "users" }
        @{ Title = "Computer Report"; Description = "Export all computers and their status"; Action = "computers" }
        @{ Title = "Group Report"; Description = "Export all groups and memberships"; Action = "groups" }
        @{ Title = "Last Logon Report"; Description = "Users sorted by last logon time"; Action = "lastlogon" }
        @{ Title = "Disabled Accounts"; Description = "All disabled user accounts"; Action = "disabled" }
        @{ Title = "Stale Computers"; Description = "Computers not seen recently"; Action = "stalecomputers" }
        @{ Title = "Group Memberships"; Description = "Detailed group membership report"; Action = "memberships" }
        @{ Title = "OU Structure"; Description = "Organizational Unit hierarchy"; Action = "ou" }
    )

    $cardWidth = 300
    $cardHeight = 140
    $cardSpacing = 25
    $cardsPerRow = 3

    for ($i = 0; $i -lt $reports.Count; $i++) {
        $report = $reports[$i]
        $row = [Math]::Floor($i / $cardsPerRow)
        $col = $i % $cardsPerRow

        $x = $col * ($cardWidth + $cardSpacing)
        $y = $row * ($cardHeight + $cardSpacing)

        # Report card panel
        $card = New-Object System.Windows.Forms.Panel
        $card.Size = New-Object System.Drawing.Size($cardWidth, $cardHeight)
        $card.Location = New-Object System.Drawing.Point($x, $y)
        $card.BackColor = $colors.Surface
        $card.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
        $card.Cursor = [System.Windows.Forms.Cursors]::Hand

        # Title
        $titleCardLabel = New-Object System.Windows.Forms.Label
        $titleCardLabel.Text = $report.Title
        $titleCardLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
        $titleCardLabel.ForeColor = $colors.TextPrimary
        $titleCardLabel.Location = New-Object System.Drawing.Point(20, 20)
        $titleCardLabel.Size = New-Object System.Drawing.Size(240, 30)
        $card.Controls.Add($titleCardLabel)

        # Description
        $descLabel = New-Object System.Windows.Forms.Label
        $descLabel.Text = $report.Description
        $descLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $descLabel.ForeColor = $colors.TextSecondary
        $descLabel.Location = New-Object System.Drawing.Point(20, 55)
        $descLabel.Size = New-Object System.Drawing.Size(240, 50)
        $descLabel.TextAlign = [System.Drawing.ContentAlignment]::TopLeft
        $card.Controls.Add($descLabel)

        # Click handler
        $reportAction = $report.Action
        $card.Add_Click({
            Generate-Report -ReportType $reportAction -StatusLabel $statusLabel
        }.GetNewClosure())

        # Hover effects
        $hoverColor = $colors.SurfaceAlt
        $normalColor = $colors.Surface
        $card.Add_MouseEnter({
            $this.BackColor = $hoverColor
        }.GetNewClosure())

        $card.Add_MouseLeave({
            $this.BackColor = $normalColor
        }.GetNewClosure())

        $reportsPanel.Controls.Add($card)
    }

    # Export options panel
    $exportPanel = New-Object System.Windows.Forms.Panel
    $exportPanel.Size = New-Object System.Drawing.Size(($Parent.Width - 60), 100)
    $exportPanel.Location = New-Object System.Drawing.Point(30, 550)
    $exportPanel.BackColor = $colors.Surface
    $exportPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $container.Controls.Add($exportPanel)

    # Export options title
    $exportTitle = New-Object System.Windows.Forms.Label
    $exportTitle.Text = "Export Options"
    $exportTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $exportTitle.ForeColor = $colors.TextPrimary
    $exportTitle.Location = New-Object System.Drawing.Point(20, 15)
    $exportTitle.AutoSize = $true
    $exportPanel.Controls.Add($exportTitle)

    # Export format selection
    $formatLabel = New-Object System.Windows.Forms.Label
    $formatLabel.Text = "Format:"
    $formatLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $formatLabel.ForeColor = $colors.TextPrimary
    $formatLabel.Location = New-Object System.Drawing.Point(20, 50)
    $formatLabel.AutoSize = $true
    $exportPanel.Controls.Add($formatLabel)

    $formatCombo = New-Object System.Windows.Forms.ComboBox
    $formatCombo.Size = New-Object System.Drawing.Size(120, 25)
    $formatCombo.Location = New-Object System.Drawing.Point(80, 47)
    $formatCombo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $formatCombo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $formatCombo.Items.AddRange(@("CSV", "Excel", "HTML", "JSON"))
    $formatCombo.SelectedIndex = 0
    $exportPanel.Controls.Add($formatCombo)

    # Include headers checkbox
    $headersCheck = New-Object System.Windows.Forms.CheckBox
    $headersCheck.Text = "Include Headers"
    $headersCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $headersCheck.ForeColor = $colors.TextPrimary
    $headersCheck.Location = New-Object System.Drawing.Point(220, 50)
    $headersCheck.AutoSize = $true
    $headersCheck.Checked = $true
    $exportPanel.Controls.Add($headersCheck)

    # Open after export checkbox
    $openCheck = New-Object System.Windows.Forms.CheckBox
    $openCheck.Text = "Open after export"
    $openCheck.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $openCheck.ForeColor = $colors.TextPrimary
    $openCheck.Location = New-Object System.Drawing.Point(350, 50)
    $openCheck.AutoSize = $true
    $openCheck.Checked = $true
    $exportPanel.Controls.Add($openCheck)

    # Status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "Select a report to generate"
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $statusLabel.ForeColor = $colors.TextSecondary
    $statusLabel.Location = New-Object System.Drawing.Point(30, 670)
    $statusLabel.AutoSize = $true
    $container.Controls.Add($statusLabel)

    # Generate report function
    function Generate-Report {
        param(
            [string]$ReportType,
            [System.Windows.Forms.Label]$StatusLabel
        )

        try {
            $StatusLabel.Text = "Generating $ReportType report..."
            $StatusLabel.ForeColor = $colors.TextSecondary
            $Script:MainForm.Refresh()

            $reportData = @()
            $reportTitle = ""

            switch ($ReportType) {
                "users" {
                    $reportTitle = "User Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADUsers -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $reportData = $result.Users
                        }
                    } else {
                        # Demo data
                        $reportData = @(
                            @{ DisplayName = "John Smith"; SamAccountName = "jsmith"; Mail = "john.smith@domain.local"; Title = "IT Manager"; Department = "IT"; UserAccountControl = 512; LastLogon = "2024-01-15 14:30" }
                            @{ DisplayName = "Jane Doe"; SamAccountName = "jdoe"; Mail = "jane.doe@domain.local"; Title = "Marketing Manager"; Department = "Marketing"; UserAccountControl = 512; LastLogon = "2024-01-15 13:45" }
                            @{ DisplayName = "Robert Johnson"; SamAccountName = "rjohnson"; Mail = "robert.johnson@domain.local"; Title = "Software Developer"; Department = "Engineering"; UserAccountControl = 514; LastLogon = "2023-12-20 16:20" }
                        )
                    }
                }
                "computers" {
                    $reportTitle = "Computer Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADComputers -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $reportData = $result.Computers
                        }
                    } else {
                        # Demo data
                        $reportData = @(
                            @{ Name = "DC01"; OperatingSystem = "Windows Server 2022"; OperatingSystemVersion = "10.0.20348"; Description = "Domain Controller"; LastLogonTimestamp = "2024-01-15 14:30" }
                            @{ Name = "WORKSTATION001"; OperatingSystem = "Windows 11 Pro"; OperatingSystemVersion = "10.0.22631"; Description = "User Workstation"; LastLogonTimestamp = "2024-01-15 12:20" }
                        )
                    }
                }
                "groups" {
                    $reportTitle = "Group Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADGroups -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $reportData = $result.Groups
                        }
                    } else {
                        # Demo data
                        $reportData = @(
                            @{ Name = "Domain Admins"; Description = "Designated administrators of the domain"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 5; WhenCreated = "2020-01-15 10:30" }
                            @{ Name = "IT Support"; Description = "IT Support Team"; GroupCategory = "Security"; GroupScope = "Global"; MemberCount = 8; WhenCreated = "2020-03-22 14:15" }
                        )
                    }
                }
                "lastlogon" {
                    $reportTitle = "Last Logon Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADUsers -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $reportData = $result.Users | Sort-Object LastLogon -Descending
                        }
                    } else {
                        # Demo data sorted by last logon
                        $reportData = @(
                            @{ DisplayName = "John Smith"; SamAccountName = "jsmith"; LastLogon = "2024-01-15 14:30"; Department = "IT" }
                            @{ DisplayName = "Jane Doe"; SamAccountName = "jdoe"; LastLogon = "2024-01-15 13:45"; Department = "Marketing" }
                            @{ DisplayName = "Robert Johnson"; SamAccountName = "rjohnson"; LastLogon = "2023-12-20 16:20"; Department = "Engineering" }
                        )
                    }
                }
                "disabled" {
                    $reportTitle = "Disabled Accounts Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADUsers -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $reportData = $result.Users | Where-Object { $_.UserAccountControl -band 2 }
                        }
                    } else {
                        # Demo data - disabled accounts
                        $reportData = @(
                            @{ DisplayName = "Robert Johnson"; SamAccountName = "rjohnson"; Mail = "robert.johnson@domain.local"; UserAccountControl = 514; LastLogon = "2023-12-20 16:20" }
                        )
                    }
                }
                "stalecomputers" {
                    $reportTitle = "Stale Computers Report"
                    if ($Script:IsConnected) {
                        $result = Get-ADComputers -Config $Script:ConnectionConfig
                        if ($result.Success) {
                            $cutoffDate = (Get-Date).AddDays(-90)
                            $reportData = $result.Computers | Where-Object {
                                if ($_.LastLogonTimestamp -and $_.LastLogonTimestamp -ne "Never") {
                                    [DateTime]::Parse($_.LastLogonTimestamp) -lt $cutoffDate
                                } else {
                                    $true
                                }
                            }
                        }
                    } else {
                        # Demo data - stale computers
                        $reportData = @(
                            @{ Name = "OLD-LAPTOP01"; OperatingSystem = "Windows 10 Pro"; LastLogonTimestamp = "2023-10-15 08:30"; Description = "Unused laptop" }
                        )
                    }
                }
                "memberships" {
                    $reportTitle = "Group Memberships Report"
                    $reportData = @(
                        @{ Group = "Domain Admins"; Member = "John Smith"; MemberType = "User" }
                        @{ Group = "IT Support"; Member = "John Smith"; MemberType = "User" }
                        @{ Group = "IT Support"; Member = "Jane Doe"; MemberType = "User" }
                        @{ Group = "Marketing Team"; Member = "Jane Doe"; MemberType = "User" }
                    )
                }
                "ou" {
                    $reportTitle = "OU Structure Report"
                    $reportData = @(
                        @{ OU = "DC=domain,DC=local"; Type = "Domain"; Level = 0 }
                        @{ OU = "OU=Users,DC=domain,DC=local"; Type = "OU"; Level = 1 }
                        @{ OU = "OU=Computers,DC=domain,DC=local"; Type = "OU"; Level = 1 }
                        @{ OU = "OU=IT,OU=Users,DC=domain,DC=local"; Type = "OU"; Level = 2 }
                    )
                }
            }

            if ($reportData.Count -eq 0) {
                $StatusLabel.Text = "No data found for $reportTitle"
                $StatusLabel.ForeColor = $colors.Warning
                return
            }

            # Export report
            $exportResult = Export-ReportData -Data $reportData -Title $reportTitle -Format $formatCombo.Text -IncludeHeaders $headersCheck.Checked

            if ($exportResult.Success) {
                $StatusLabel.Text = "[OK] $reportTitle exported to $($exportResult.FilePath)"
                $StatusLabel.ForeColor = $colors.Success

                if ($openCheck.Checked) {
                    Start-Process $exportResult.FilePath
                }
            } else {
                $StatusLabel.Text = "[X] Export failed: $($exportResult.Error)"
                $StatusLabel.ForeColor = $colors.Error
            }

        } catch {
            $StatusLabel.Text = "[X] Report generation failed: $($_.Exception.Message)"
            $StatusLabel.ForeColor = $colors.Error
            Write-DebugLog "Report generation error" $_.Exception.Message
        }
    }
}

# Export report data to file
function Export-ReportData {
    param(
        [array]$Data,
        [string]$Title,
        [string]$Format,
        [bool]$IncludeHeaders
    )

    try {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $baseFileName = "$Title-$timestamp"
        $desktopPath = [Environment]::GetFolderPath("Desktop")

        switch ($Format) {
            "CSV" {
                $filePath = Join-Path $desktopPath "$baseFileName.csv"

                if ($Data.Count -gt 0) {
                    # Convert hashtables to objects for proper CSV export
                    $objects = $Data | ForEach-Object {
                        New-Object PSObject -Property $_
                    }

                    if ($IncludeHeaders) {
                        $objects | Export-Csv -Path $filePath -NoTypeInformation
                    } else {
                        $objects | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 | Set-Content $filePath
                    }
                }
            }
            "Excel" {
                $filePath = Join-Path $desktopPath "$baseFileName.xlsx"

                # Since we can't guarantee Excel COM object availability, export as CSV with .xlsx extension
                # In a full implementation, you'd use Import-Excel module or COM objects
                if ($Data.Count -gt 0) {
                    $objects = $Data | ForEach-Object {
                        New-Object PSObject -Property $_
                    }
                    $objects | Export-Csv -Path $filePath -NoTypeInformation
                }
            }
            "HTML" {
                $filePath = Join-Path $desktopPath "$baseFileName.html"

                $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>$Title</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2563eb; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .timestamp { color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>$Title</h1>
    <p class="timestamp">Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
"@

                if ($Data.Count -gt 0) {
                    $html += "<table>"

                    # Add headers
                    if ($IncludeHeaders) {
                        $html += "<tr>"
                        $firstItem = $Data[0]
                        foreach ($key in $firstItem.Keys) {
                            $html += "<th>$key</th>"
                        }
                        $html += "</tr>"
                    }

                    # Add data rows
                    foreach ($row in $Data) {
                        $html += "<tr>"
                        foreach ($key in $row.Keys) {
                            $value = $row[$key]
                            $html += "<td>$value</td>"
                        }
                        $html += "</tr>"
                    }

                    $html += "</table>"
                } else {
                    $html += "<p>No data available</p>"
                }

                $html += @"
</body>
</html>
"@

                $html | Set-Content $filePath -Encoding UTF8
            }
            "JSON" {
                $filePath = Join-Path $desktopPath "$baseFileName.json"

                $jsonData = @{
                    Title = $Title
                    GeneratedOn = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
                    RecordCount = $Data.Count
                    Data = $Data
                }

                $jsonData | ConvertTo-Json -Depth 10 | Set-Content $filePath -Encoding UTF8
            }
        }

        return @{ Success = $true; FilePath = $filePath }

    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}