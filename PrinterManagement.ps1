#Requires -Version 5.1

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Global variables
$script:mainForm = $null
$script:addServerForm = $null
$script:servers = @(
    @{
        InstitutionName = "Pelican Bay"
        ServerName = "\\pbp01pacfp01"
    }
)

#region Helper Functions

function Get-GradientBrush {
    param(
        [System.Drawing.Rectangle]$Rectangle,
        [System.Drawing.Color]$Color1,
        [System.Drawing.Color]$Color2
    )

    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $Rectangle,
        $Color1,
        $Color2,
        45
    )
    return $brush
}

function Set-RoundedCorners {
    param(
        [System.Windows.Forms.Form]$Form,
        [int]$Radius = 20
    )

    # Create rounded rectangle region
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Form.Width, $Form.Height)
    $diameter = $Radius * 2

    $arc = New-Object System.Drawing.Rectangle($rect.X, $rect.Y, $diameter, $diameter)
    $path.AddArc($arc, 180, 90)

    $arc.X = $rect.Right - $diameter
    $path.AddArc($arc, 270, 90)

    $arc.Y = $rect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)

    $arc.X = $rect.Left
    $path.AddArc($arc, 90, 90)

    $path.CloseFigure()
    $Form.Region = New-Object System.Drawing.Region($path)
}

#endregion

#region Add Server Window

function Show-AddServerWindow {
    $addServerForm = New-Object System.Windows.Forms.Form
    $addServerForm.Text = "Add New Server"
    $addServerForm.Size = New-Object System.Drawing.Size(300, 300)
    $addServerForm.StartPosition = "CenterParent"
    $addServerForm.FormBorderStyle = "None"
    $addServerForm.BackColor = [System.Drawing.Color]::FromArgb(149, 151, 152)

    # Set rounded corners
    Set-RoundedCorners -Form $addServerForm -Radius 20

    # Create a panel for gradient background
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Size = $addServerForm.ClientSize
    $panel.Location = New-Object System.Drawing.Point(0, 0)

    # Paint event for gradient
    $panel.Add_Paint({
        param($sender, $e)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $sender.Width, $sender.Height)
        $color1 = [System.Drawing.Color]::FromArgb(149, 151, 152)
        $color2 = [System.Drawing.Color]::FromArgb(42, 135, 140)
        $brush = Get-GradientBrush -Rectangle $rect -Color1 $color1 -Color2 $color2
        $e.Graphics.FillRectangle($brush, $rect)
        $brush.Dispose()
    })

    $addServerForm.Controls.Add($panel)

    # Title bar (draggable)
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Add New Server"
    $titleLabel.Size = New-Object System.Drawing.Size(260, 40)
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.Font = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    $titleLabel.TextAlign = "MiddleCenter"
    $titleLabel.BackColor = [System.Drawing.Color]::Transparent

    # Make draggable
    $isDragging = $false
    $dragCursor = New-Object System.Drawing.Point

    $titleLabel.Add_MouseDown({
        param($sender, $e)
        $script:isDragging = $true
        $script:dragCursor = New-Object System.Drawing.Point($e.X, $e.Y)
        $titleLabel.Cursor = [System.Windows.Forms.Cursors]::SizeAll
    })

    $titleLabel.Add_MouseMove({
        param($sender, $e)
        if ($script:isDragging) {
            $newLocation = $addServerForm.Location
            $newLocation.X += $e.X - $script:dragCursor.X
            $newLocation.Y += $e.Y - $script:dragCursor.Y
            $addServerForm.Location = $newLocation
        }
    })

    $titleLabel.Add_MouseUp({
        $script:isDragging = $false
        $titleLabel.Cursor = [System.Windows.Forms.Cursors]::Arrow
    })

    $panel.Controls.Add($titleLabel)

    # Institution Name Label
    $institutionLabel = New-Object System.Windows.Forms.Label
    $institutionLabel.Text = "Institution Name:"
    $institutionLabel.Size = New-Object System.Drawing.Size(260, 20)
    $institutionLabel.Location = New-Object System.Drawing.Point(20, 70)
    $institutionLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $institutionLabel.BackColor = [System.Drawing.Color]::Transparent
    $panel.Controls.Add($institutionLabel)

    # Institution Name TextBox
    $institutionTextBox = New-Object System.Windows.Forms.TextBox
    $institutionTextBox.Size = New-Object System.Drawing.Size(260, 25)
    $institutionTextBox.Location = New-Object System.Drawing.Point(20, 95)
    $institutionTextBox.Font = New-Object System.Drawing.Font("Arial", 10)
    $panel.Controls.Add($institutionTextBox)

    # Server Name Label
    $serverLabel = New-Object System.Windows.Forms.Label
    $serverLabel.Text = "Server Name:"
    $serverLabel.Size = New-Object System.Drawing.Size(260, 20)
    $serverLabel.Location = New-Object System.Drawing.Point(20, 130)
    $serverLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $serverLabel.BackColor = [System.Drawing.Color]::Transparent
    $panel.Controls.Add($serverLabel)

    # Server Name TextBox
    $serverTextBox = New-Object System.Windows.Forms.TextBox
    $serverTextBox.Size = New-Object System.Drawing.Size(260, 25)
    $serverTextBox.Location = New-Object System.Drawing.Point(20, 155)
    $serverTextBox.Font = New-Object System.Drawing.Font("Arial", 10)
    $panel.Controls.Add($serverTextBox)

    # Save Button
    $saveButton = New-Object System.Windows.Forms.Button
    $saveButton.Text = "Save"
    $saveButton.Size = New-Object System.Drawing.Size(120, 35)
    $saveButton.Location = New-Object System.Drawing.Point(20, 210)
    $saveButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $saveButton.BackColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
    $saveButton.ForeColor = [System.Drawing.Color]::White
    $saveButton.FlatStyle = "Flat"
    $saveButton.FlatAppearance.BorderSize = 0

    $saveButton.Add_Click({
        $institutionName = $institutionTextBox.Text.Trim()
        $serverName = $serverTextBox.Text.Trim()

        if ([string]::IsNullOrWhiteSpace($institutionName) -or [string]::IsNullOrWhiteSpace($serverName)) {
            [System.Windows.Forms.MessageBox]::Show("Both fields are required!", "Error", "OK", "Warning")
            return
        }

        # Ensure server name starts with \\
        if (-not $serverName.StartsWith("\\")) {
            $serverName = "\\$serverName"
        }

        # Add server to list
        $script:servers += @{
            InstitutionName = $institutionName
            ServerName = $serverName
        }

        # Add to dropdown
        $script:printServerDropdown.Items.Insert($script:printServerDropdown.Items.Count - 1, $institutionName)
        $script:printServerDropdown.SelectedItem = $institutionName

        $addServerForm.Close()
    })

    $panel.Controls.Add($saveButton)

    # Cancel Button
    $cancelButton = New-Object System.Windows.Forms.Button
    $cancelButton.Text = "Cancel"
    $cancelButton.Size = New-Object System.Drawing.Size(120, 35)
    $cancelButton.Location = New-Object System.Drawing.Point(160, 210)
    $cancelButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $cancelButton.BackColor = [System.Drawing.Color]::FromArgb(255, 76, 76)
    $cancelButton.ForeColor = [System.Drawing.Color]::White
    $cancelButton.FlatStyle = "Flat"
    $cancelButton.FlatAppearance.BorderSize = 0

    $cancelButton.Add_Click({
        $addServerForm.Close()
    })

    $panel.Controls.Add($cancelButton)

    # Show form as modal dialog
    $addServerForm.ShowDialog() | Out-Null
    $addServerForm.Dispose()
}

#endregion

#region Main Window

function Show-MainWindow {
    $script:mainForm = New-Object System.Windows.Forms.Form
    $script:mainForm.Text = "Printer Management"
    $script:mainForm.Size = New-Object System.Drawing.Size(400, 650)
    $script:mainForm.StartPosition = "CenterScreen"
    $script:mainForm.FormBorderStyle = "None"
    $script:mainForm.BackColor = [System.Drawing.Color]::FromArgb(149, 151, 152)

    # Set rounded corners
    Set-RoundedCorners -Form $script:mainForm -Radius 20

    # Create a panel for gradient background
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Size = $script:mainForm.ClientSize
    $panel.Location = New-Object System.Drawing.Point(0, 0)

    # Paint event for gradient
    $panel.Add_Paint({
        param($sender, $e)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $sender.Width, $sender.Height)
        $color1 = [System.Drawing.Color]::FromArgb(149, 151, 152)
        $color2 = [System.Drawing.Color]::FromArgb(42, 135, 140)
        $brush = Get-GradientBrush -Rectangle $rect -Color1 $color1 -Color2 $color2
        $e.Graphics.FillRectangle($brush, $rect)
        $brush.Dispose()
    })

    $script:mainForm.Controls.Add($panel)

    # Title bar (draggable)
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "Printer Management"
    $titleLabel.Size = New-Object System.Drawing.Size(360, 40)
    $titleLabel.Location = New-Object System.Drawing.Point(20, 20)
    $titleLabel.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    $titleLabel.TextAlign = "MiddleCenter"
    $titleLabel.BackColor = [System.Drawing.Color]::Transparent

    # Make draggable
    $isDragging = $false
    $dragCursor = New-Object System.Drawing.Point

    $titleLabel.Add_MouseDown({
        param($sender, $e)
        $script:isDragging = $true
        $script:dragCursor = New-Object System.Drawing.Point($e.X, $e.Y)
        $titleLabel.Cursor = [System.Windows.Forms.Cursors]::SizeAll
    })

    $titleLabel.Add_MouseMove({
        param($sender, $e)
        if ($script:isDragging) {
            $newLocation = $script:mainForm.Location
            $newLocation.X += $e.X - $script:dragCursor.X
            $newLocation.Y += $e.Y - $script:dragCursor.Y
            $script:mainForm.Location = $newLocation
        }
    })

    $titleLabel.Add_MouseUp({
        $script:isDragging = $false
        $titleLabel.Cursor = [System.Windows.Forms.Cursors]::Arrow
    })

    $panel.Controls.Add($titleLabel)

    # Print Server Label
    $serverLabel = New-Object System.Windows.Forms.Label
    $serverLabel.Text = "Select a Print Server:"
    $serverLabel.Size = New-Object System.Drawing.Size(340, 20)
    $serverLabel.Location = New-Object System.Drawing.Point(30, 80)
    $serverLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $serverLabel.BackColor = [System.Drawing.Color]::Transparent
    $panel.Controls.Add($serverLabel)

    # Print Server Dropdown
    $script:printServerDropdown = New-Object System.Windows.Forms.ComboBox
    $script:printServerDropdown.Size = New-Object System.Drawing.Size(340, 25)
    $script:printServerDropdown.Location = New-Object System.Drawing.Point(30, 105)
    $script:printServerDropdown.Font = New-Object System.Drawing.Font("Arial", 10)
    $script:printServerDropdown.DropDownStyle = "DropDownList"

    # Populate dropdown
    foreach ($server in $script:servers) {
        $script:printServerDropdown.Items.Add($server.InstitutionName) | Out-Null
    }
    $script:printServerDropdown.Items.Add("+ Add New Server") | Out-Null
    $script:printServerDropdown.SelectedIndex = 0

    $script:printServerDropdown.Add_SelectedIndexChanged({
        if ($script:printServerDropdown.SelectedItem -eq "+ Add New Server") {
            Show-AddServerWindow
            # Reset to first item after adding
            if ($script:printServerDropdown.Items.Count -gt 1) {
                $script:printServerDropdown.SelectedIndex = 0
            }
        }
    })

    $panel.Controls.Add($script:printServerDropdown)

    # Search Label
    $searchLabel = New-Object System.Windows.Forms.Label
    $searchLabel.Text = "Search Printer:"
    $searchLabel.Size = New-Object System.Drawing.Size(340, 20)
    $searchLabel.Location = New-Object System.Drawing.Point(30, 145)
    $searchLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $searchLabel.BackColor = [System.Drawing.Color]::Transparent
    $panel.Controls.Add($searchLabel)

    # Search TextBox
    $searchTextBox = New-Object System.Windows.Forms.TextBox
    $searchTextBox.Size = New-Object System.Drawing.Size(230, 25)
    $searchTextBox.Location = New-Object System.Drawing.Point(30, 170)
    $searchTextBox.Font = New-Object System.Drawing.Font("Arial", 10)
    $panel.Controls.Add($searchTextBox)

    # Search Button
    $searchButton = New-Object System.Windows.Forms.Button
    $searchButton.Text = "Search"
    $searchButton.Size = New-Object System.Drawing.Size(100, 25)
    $searchButton.Location = New-Object System.Drawing.Point(270, 170)
    $searchButton.Font = New-Object System.Drawing.Font("Arial", 10)
    $searchButton.BackColor = [System.Drawing.Color]::White
    $searchButton.FlatStyle = "Flat"

    # Search button click handler
    $searchButton.Add_Click({
        $selectedIndex = $script:printServerDropdown.SelectedIndex

        if ($selectedIndex -eq -1 -or $script:printServerDropdown.SelectedItem -eq "+ Add New Server") {
            [System.Windows.Forms.MessageBox]::Show("Please select a valid server.", "Error", "OK", "Warning")
            return
        }

        $selectedServer = $script:servers[$selectedIndex].ServerName
        $searchQuery = $searchTextBox.Text.Trim().ToLower()

        # Clear current list
        $printersListBox.Items.Clear()
        $printersListBox.Items.Add("Loading...") | Out-Null
        $script:mainForm.Refresh()

        try {
            $printers = Get-Printer -ComputerName $selectedServer -ErrorAction Stop | Select-Object -ExpandProperty Name

            $printersListBox.Items.Clear()

            if ($searchQuery) {
                $filteredPrinters = $printers | Where-Object { $_ -like "*$searchQuery*" }
            } else {
                $filteredPrinters = $printers
            }

            if ($filteredPrinters) {
                foreach ($printer in $filteredPrinters) {
                    $printersListBox.Items.Add($printer) | Out-Null
                }
            } else {
                $printersListBox.Items.Add("No printers found") | Out-Null
            }
        } catch {
            $printersListBox.Items.Clear()
            $printersListBox.Items.Add("Failed to load printers") | Out-Null
            [System.Windows.Forms.MessageBox]::Show("Error fetching printers: $($_.Exception.Message)", "Error", "OK", "Error")
        }
    })

    $panel.Controls.Add($searchButton)

    # Printers Label
    $printersLabel = New-Object System.Windows.Forms.Label
    $printersLabel.Text = "Available Printers:"
    $printersLabel.Size = New-Object System.Drawing.Size(340, 20)
    $printersLabel.Location = New-Object System.Drawing.Point(30, 215)
    $printersLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $printersLabel.BackColor = [System.Drawing.Color]::Transparent
    $panel.Controls.Add($printersLabel)

    # Printers ListBox
    $printersListBox = New-Object System.Windows.Forms.ListBox
    $printersListBox.Size = New-Object System.Drawing.Size(340, 250)
    $printersListBox.Location = New-Object System.Drawing.Point(30, 240)
    $printersListBox.Font = New-Object System.Drawing.Font("Arial", 10)
    $panel.Controls.Add($printersListBox)

    # Install Button
    $installButton = New-Object System.Windows.Forms.Button
    $installButton.Text = "Install Selected Printer"
    $installButton.Size = New-Object System.Drawing.Size(220, 40)
    $installButton.Location = New-Object System.Drawing.Point(30, 520)
    $installButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $installButton.BackColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
    $installButton.ForeColor = [System.Drawing.Color]::White
    $installButton.FlatStyle = "Flat"
    $installButton.FlatAppearance.BorderSize = 0

    $installButton.Add_Click({
        if ($printersListBox.SelectedIndex -eq -1 -or
            $printersListBox.SelectedItem -eq "No printers found" -or
            $printersListBox.SelectedItem -eq "Failed to load printers" -or
            $printersListBox.SelectedItem -eq "Loading...") {
            [System.Windows.Forms.MessageBox]::Show("Please select a valid printer to install.", "Error", "OK", "Warning")
            return
        }

        $selectedIndex = $script:printServerDropdown.SelectedIndex
        $selectedServer = $script:servers[$selectedIndex].ServerName
        $selectedPrinter = $printersListBox.SelectedItem
        $printerPath = "$selectedServer\$selectedPrinter"

        try {
            Start-Process -FilePath "rundll32" -ArgumentList "printui.dll,PrintUIEntry /in /n`"$printerPath`"" -Wait -NoNewWindow
            [System.Windows.Forms.MessageBox]::Show("Printer `"$selectedPrinter`" installed successfully!", "Success", "OK", "Information")
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Failed to install printer: $($_.Exception.Message)", "Error", "OK", "Error")
        }
    })

    $panel.Controls.Add($installButton)

    # Exit Button
    $exitButton = New-Object System.Windows.Forms.Button
    $exitButton.Text = "Exit"
    $exitButton.Size = New-Object System.Drawing.Size(110, 40)
    $exitButton.Location = New-Object System.Drawing.Point(260, 520)
    $exitButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $exitButton.BackColor = [System.Drawing.Color]::FromArgb(255, 76, 76)
    $exitButton.ForeColor = [System.Drawing.Color]::White
    $exitButton.FlatStyle = "Flat"
    $exitButton.FlatAppearance.BorderSize = 0

    $exitButton.Add_Click({
        $script:mainForm.Close()
    })

    $panel.Controls.Add($exitButton)

    # Show form
    [void]$script:mainForm.ShowDialog()
    $script:mainForm.Dispose()
}

#endregion

#region Main Entry Point

# Run the main window
Show-MainWindow

#endregion