const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { executePowerShell, ensureKerberosIfRequired } = require(path.join(__dirname, '..', 'utils', 'powershell'));

/**
 * Register computer management-related IPC handlers
 */
function registerComputerHandlers() {
  console.log('=== REGISTERING COMPUTER HANDLERS ===');
  // Create AD Computer
  ipcMain.handle('create-ad-computer', async (event, config, computerData) => {
    console.log('Creating AD computer:', computerData.computerName);

    if (!config?.server) {
      return { success: false, error: 'Invalid connection configuration (server required)' };
    }
    if (!config.useKerberos && !config.kerberosOnly && !config.username) {
      return { success: false, error: 'Username is required when not using Kerberos' };
    }

    if (!computerData.computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    try {
      await ensureKerberosIfRequired(config);
      const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
      const credEnv = (!config.useKerberos && !config.kerberosOnly && config.username && config.password)
        ? { ACTV_USER: String(config.username), ACTV_PASS: String(config.password) }
        : undefined;
      const authParam = credEnv ? '-Credential $ACTV_CRED -AuthType Negotiate' : '-AuthType Negotiate';

      // Determine OU path - use parentOU if set, otherwise use default Computers container
      let ouPath = 'CN=Computers';
      if (config.parentOU && config.parentOU.trim() !== '') {
        ouPath = config.parentOU;
      } else {
        // Get domain DN for default path
        ouPath = `CN=Computers,${config.server.split('.').map(part => `DC=${part}`).join(',')}`;
      }

      console.log('Creating computer with OU path:', ouPath);
      console.log('Server param:', serverParam);

      const createComputerCommand = `
        try {
          Import-Module ActiveDirectory -ErrorAction Stop

          # Prepare computer properties
          $computerProps = @{
            Name = "${computerData.computerName.toUpperCase()}"
            SamAccountName = "${computerData.computerName.toUpperCase()}$"
            Path = "${ouPath}"
            Enabled = $true
          }

          # Add optional properties if provided
          ${computerData.description ? `$computerProps.Description = "${computerData.description}"` : ''}

          # Create the computer
          New-ADComputer ${serverParam} ${authParam} @computerProps -ErrorAction Stop

          # Add computer to groups if specified
          ${computerData.selectedGroups && computerData.selectedGroups.length > 0 ? `
          $groupNames = @(${computerData.selectedGroups.map(g => `"${g.name || g}"`).join(', ')})
          foreach ($groupName in $groupNames) {
            try {
              Add-ADGroupMember -Identity $groupName -Members "${computerData.computerName.toUpperCase()}$" ${serverParam} ${authParam} -ErrorAction Stop
            } catch {
              Write-Host "Warning: Failed to add computer to group $($groupName): $($_.Exception.Message)"
            }
          }` : ''}

          Write-Host "SUCCESS: Computer ${computerData.computerName.toUpperCase()} created successfully"

        } catch {
          Write-Host "ERROR: $($_.Exception.Message)"
          exit 1
        }
      `;

      console.log('Executing PowerShell command for computer creation...');
      const result = await executePowerShell(createComputerCommand, { env: credEnv, useCredentialPrelude: true });
      console.log('PowerShell result:', result);

      if (result.includes('SUCCESS:')) {
        return {
          success: true,
          message: `Computer ${computerData.computerName} created successfully`,
          computer: {
            cn: computerData.computerName.toUpperCase(),
            computerName: computerData.computerName.toUpperCase(),
            description: computerData.description || '',
            operatingSystem: 'Unknown',
            operatingSystemVersion: 'Unknown',
            lastLogonTimestamp: null,
            userAccountControl: 4096,
            location: '',
            dNSHostName: `${computerData.computerName.toLowerCase()}.${config.server}`,
            distinguishedName: `CN=${computerData.computerName.toUpperCase()},${ouPath}`,
            whenCreated: new Date().toISOString(),
            whenChanged: new Date().toISOString(),
            memberOf: computerData.selectedGroups || []
          }
        };
      } else {
        return {
          success: false,
          error: result || 'Failed to create computer'
        };
      }

    } catch (error) {
      console.error('Create computer error:', error);
      return {
        success: false,
        error: `Failed to create computer: ${error.message}`
      };
    }
  });

  // Update AD Computer (e.g., Description)
  ipcMain.handle('update-ad-computer', async (event, config, computerData) => {
    console.log('Updating AD computer:', computerData?.computerName, 'field:', computerData?.field);

    if (!config || !config.server) {
      return { success: false, error: 'Invalid connection configuration. Server is required.' };
    }
    if (!config.useKerberos && !config.kerberosOnly && !config.username) {
      return { success: false, error: 'Username is required when not using Kerberos' };
    }
    if (!computerData?.computerName || !computerData?.field || computerData.value === undefined) {
      return { success: false, error: 'Computer name, field, and value are required' };
    }

    try {
      await ensureKerberosIfRequired(config);
      const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
      const credEnv = (!config.useKerberos && !config.kerberosOnly && config.username && config.password)
        ? { ACTV_USER: String(config.username), ACTV_PASS: String(config.password) }
        : undefined;
      const authParam = credEnv ? '-Credential $ACTV_CRED -AuthType Negotiate' : '-AuthType Negotiate';

      // Only support description for now
      const field = String(computerData.field).toLowerCase();
      let setCommand = '';
      if (field === 'description') {
        const val = String(computerData.value).replace(/`/g, '``').replace(/"/g, '\"');
        setCommand = `Set-ADComputer ${serverParam} ${authParam} -Identity "${computerData.computerName}" -Description "${val}" -ErrorAction Stop`;
      } else {
        return { success: false, error: `Unsupported field: ${computerData.field}` };
      }

      const ps = `
        try {
          Import-Module ActiveDirectory -ErrorAction Stop
          ${setCommand}
          Write-Output "OK"
        } catch {
          Write-Error $_.Exception.Message
        }
      `;
        const result = await executePowerShell(ps, { env: credEnv, useCredentialPrelude: true });
      if (result.includes('OK')) {
        return { success: true, message: 'Computer updated' };
      }
      return { success: false, error: result || 'Failed to update computer' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Test WinRM Connectivity
  ipcMain.handle('test-winrm', async (event, computerName) => {
    return new Promise((resolve) => {
      const process = spawn('powershell', [
        '-Command',
        `Test-WSMan -ComputerName ${computerName} -ErrorAction SilentlyContinue`
      ]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output.includes('wsmid')) {
          resolve({ success: true, message: 'WinRM is accessible' });
        } else {
          resolve({
            success: false,
            error: `WinRM not accessible: ${errorOutput || 'Connection failed'}`
          });
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000);
    });
  });

  // Enable WinRM Remotely using PowerShell
  ipcMain.handle('enable-winrm', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $computerName = '${computerName}'

        # Method 1: Try using Invoke-Command to enable WinRM remotely
        try {
          $result = Invoke-Command -ComputerName $computerName -ScriptBlock {
            try {
              winrm quickconfig -q -force
              if ($LASTEXITCODE -eq 0) {
                return "WinRM configured successfully"
              } else {
                return "WinRM configuration failed with exit code: $LASTEXITCODE"
              }
            } catch {
              return "Error: $($_.Exception.Message)"
            }
          } -ErrorAction Stop
          Write-Output "SUCCESS: $result"
        } catch {
          # Method 2: Try using sc command to start WinRM service
          try {
            $scResult = sc.exe \\\\$computerName config WinRM start= auto
            if ($LASTEXITCODE -eq 0) {
              $startResult = sc.exe \\\\$computerName start WinRM
              if ($LASTEXITCODE -eq 0) {
                Write-Output "SUCCESS: WinRM service started via sc command"
              } else {
                Write-Output "ERROR: Failed to start WinRM service"
              }
            } else {
              Write-Output "ERROR: Failed to configure WinRM service"
            }
          } catch {
            # Method 3: Try using reg command to enable WinRM
            try {
              reg add "\\\\$computerName\\HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WSMAN\\Service" /v allow_unencrypted /t REG_DWORD /d 1 /f
              reg add "\\\\$computerName\\HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WinRM\\Service" /v AllowAutoConfig /t REG_DWORD /d 1 /f
              Write-Output "SUCCESS: WinRM registry settings updated"
            } catch {
              Write-Output "ERROR: All methods failed. Computer may not be accessible or you may lack administrative privileges. Original error: $($_.Exception.Message)"
            }
          }
        }
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('SUCCESS:')) {
        return { success: true, message: output.substring(8).trim() };
      } else {
        return { success: false, error: output.substring(6).trim() || 'Failed to enable WinRM' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Install Printer using PowerShell and PSExec
  ipcMain.handle('install-printer', async (event, computerName, printerIP, printerName) => {
    return new Promise((resolve) => {
      // PowerShell script to install network printer
      const psScript = `
        try {
          # Add printer port
          Add-PrinterPort -Name "IP_${printerIP}" -PrinterHostAddress "${printerIP}" -ErrorAction Stop

          # Add printer (using generic driver)
          Add-Printer -Name "${printerName}" -DriverName "Generic / Text Only" -PortName "IP_${printerIP}" -ErrorAction Stop

          Write-Output "SUCCESS: Printer ${printerName} installed successfully"
        } catch {
          Write-Output "ERROR: $($_.Exception.Message)"
        }
      `;

      // Use PSExec to run PowerShell script remotely
      const process = spawn('psexec', [
        `\\\\${computerName}`,
        '-s',
        'powershell',
        '-Command',
        psScript
      ]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (output.includes('SUCCESS')) {
          resolve({
            success: true,
            message: `Printer ${printerName} installed successfully on ${computerName}`
          });
        } else {
          resolve({
            success: false,
            error: `Installation failed: ${errorOutput || output}`
          });
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: 'Printer installation timeout' });
      }, 60000);
    });
  });

  // Check if PSExec is available
  ipcMain.handle('check-psexec', async () => {
    // Return that PSExec is not required - we use PowerShell alternatives
    return {
      available: false,
      message: 'PSExec not required - Using PowerShell alternatives for remote operations'
    };
  });

  // Test Printer Server Connection
  ipcMain.handle('test-printer-server', async (event, serverPath) => {
    return new Promise((resolve) => {
      // Use net view to test printer server connection
      const process = spawn('net', ['view', serverPath]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Count printers in the output
          const printerCount = (output.match(/Print/gi) || []).length;
          resolve({
            success: true,
            message: `Connected to ${serverPath}`,
            printers: printerCount
          });
        } else {
          resolve({
            success: false,
            error: `Cannot connect to ${serverPath}: ${errorOutput || 'Server not accessible'}`
          });
        }
      });

      process.on('error', () => {
        resolve({
          success: false,
          error: `Failed to test connection to ${serverPath}`
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: 'Connection test timeout' });
      }, 10000);
    });
  });

  // Open Printer Server in Windows Explorer
  ipcMain.handle('open-printer-server', async (event, serverPath) => {
    return new Promise((resolve) => {
      // Use explorer.exe to open the UNC path
      const process = spawn('explorer', [serverPath]);

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: `Opened ${serverPath} in Explorer` });
        } else {
          resolve({ success: false, error: `Failed to open ${serverPath}` });
        }
      });

      process.on('error', () => {
        resolve({ success: false, error: `Failed to open ${serverPath}` });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: 'Open server timeout' });
      }, 5000);
    });
  });

  // Open Computer C$ Administrative Share
  ipcMain.handle('open-computer-c-drive', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    return new Promise((resolve) => {
      // Build UNC path to C$ administrative share
      const uncPath = `\\\\${computerName}\\C$`;

      // Use explorer.exe to open the administrative share
      const process = spawn('explorer', [uncPath]);

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: `Opened ${uncPath} in Explorer` });
        } else {
          resolve({ success: false, error: `Failed to open ${uncPath}. Check if you have administrative access to ${computerName}` });
        }
      });

      process.on('error', (error) => {
        resolve({ success: false, error: `Failed to open ${uncPath}: ${error.message}` });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: 'Open C$ share timeout' });
      }, 5000);
    });
  });

  // Connect to Computer via RDP
  ipcMain.handle('connect-rdp', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    return new Promise((resolve) => {
      // Use mstsc to start RDP connection
      const process = spawn('mstsc', [`/v:${computerName}`]);

      process.on('close', (code) => {
        resolve({ success: true, message: `RDP connection initiated to ${computerName}` });
      });

      process.on('error', (error) => {
        resolve({ success: false, error: `Failed to start RDP connection: ${error.message}` });
      });

      // Resolve immediately since mstsc will open in a new window
      setTimeout(() => {
        resolve({ success: true, message: `RDP connection initiated to ${computerName}` });
      }, 1000);
    });
  });

  // Delete AD Computer
  console.log('Registering delete-ad-computer handler...');
  ipcMain.handle('delete-ad-computer', async (event, config, computerData) => {
    console.log('=== DELETE COMPUTER HANDLER CALLED ===');
    console.log('Computer to delete:', computerData?.computerName);
    console.log('Config received:', !!config);
    console.log('Config server:', config?.server);
    console.log('Config username:', config?.username ? 'PRESENT' : 'MISSING');

    if (!computerData?.computerName) {
      console.log('ERROR: No computer name provided');
      return { success: false, error: 'No computer name provided' };
    }

    if (!config || !config.server) {
      console.log('ERROR: No server configuration');
      return { success: false, error: 'Invalid connection configuration. Server is required.' };
    }

    try {
      console.log('Setting up AD connection parameters...');

      // Setup authentication parameters similar to other working handlers
      await ensureKerberosIfRequired(config);
      const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
      const credEnv = (!config.useKerberos && !config.kerberosOnly && config.username && config.password)
        ? { ACTV_USER: String(config.username), ACTV_PASS: String(config.password) }
        : undefined;
      const authParam = credEnv ? '-Credential $ACTV_CRED -AuthType Negotiate' : '-AuthType Negotiate';

      console.log('Auth setup:', {
        serverParam,
        authParam,
        hasCredentials: !!credEnv,
        useKerberos: config.useKerberos,
        kerberosOnly: config.kerberosOnly
      });

      const deleteComputerCommand = `
        try {
          $ErrorActionPreference = 'Stop'
          Write-Output "=== Starting AD Computer Deletion ==="

          # Import Active Directory module
          Import-Module ActiveDirectory -ErrorAction Stop
          Write-Output "Active Directory module imported"

          # First, verify the computer exists
          Write-Output "Searching for computer: ${computerData.computerName}"
          try {
            $computer = Get-ADComputer -Identity "${computerData.computerName}" ${serverParam} ${authParam} -ErrorAction Stop
            Write-Output "Found computer: $($computer.Name) in $($computer.DistinguishedName)"
          } catch {
            Write-Output "ERROR: Computer not found: $($_.Exception.Message)"
            exit 1
          }

          # Delete the computer
          Write-Output "Deleting computer from Active Directory..."
          Remove-ADComputer -Identity "${computerData.computerName}" ${serverParam} ${authParam} -Confirm:$false -ErrorAction Stop

          # Verify deletion
          Write-Output "Verifying deletion..."
          try {
            $checkComputer = Get-ADComputer -Identity "${computerData.computerName}" ${serverParam} ${authParam} -ErrorAction Stop
            Write-Output "ERROR: Computer still exists after deletion"
            exit 1
          } catch {
            Write-Output "SUCCESS: Computer ${computerData.computerName} successfully deleted from Active Directory"
          }

        } catch {
          Write-Output "ERROR: $($_.Exception.Message)"
          Write-Output "ERROR_TYPE: $($_.Exception.GetType().FullName)"
          exit 1
        }
      `;

      console.log('Executing AD delete command...');
      const result = await executePowerShell(deleteComputerCommand, { env: credEnv, useCredentialPrelude: true });
      console.log('PowerShell execution result:', result);

      if (result.includes('SUCCESS:') && result.includes('successfully deleted')) {
        console.log('Delete operation successful');
        return {
          success: true,
          message: `Computer ${computerData.computerName} successfully deleted from Active Directory`
        };
      } else if (result.includes('ERROR:')) {
        console.log('Delete operation failed with error');
        const errorLines = result.split('\n').filter(line => line.includes('ERROR:'));
        const mainError = errorLines[0] || result;
        const errorMessage = mainError.replace('ERROR:', '').trim();
        return {
          success: false,
          error: errorMessage || 'Failed to delete computer from Active Directory'
        };
      } else {
        console.log('Delete operation completed with unexpected result');
        return {
          success: false,
          error: `Unexpected result from delete operation: ${result}`
        };
      }

    } catch (error) {
      console.error('Delete computer error:', error);
      return {
        success: false,
        error: `Failed to delete computer: ${error.message}`
      };
    }
  });

  // Get Printers from Print Server
  ipcMain.handle('get-printers', async (event, serverName, searchQuery) => {
    if (!serverName) {
      return { success: false, error: 'Server name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $serverName = '${serverName.replace(/\\/g, '\\\\')}'
        $searchQuery = '${(searchQuery || '').replace(/'/g, "''")}'

        Write-Host "Fetching printers from $serverName..."

        $printers = Get-Printer -ComputerName $serverName -ErrorAction Stop | Select-Object -ExpandProperty Name

        if ($searchQuery) {
          $printers = $printers | Where-Object { $_ -like "*$searchQuery*" }
        }

        if ($printers) {
          $printers | ConvertTo-Json -Compress
        } else {
          Write-Output '[]'
        }
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('ERROR:')) {
        return { success: false, error: output.substring(6).trim() };
      }

      const printers = JSON.parse(output || '[]');
      return {
        success: true,
        printers: Array.isArray(printers) ? printers : [printers]
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Install Printer
  ipcMain.handle('install-printer', async (event, printerPath) => {
    if (!printerPath) {
      return { success: false, error: 'Printer path is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $printerPath = '${printerPath.replace(/\\/g, '\\\\')}'

        Write-Host "Installing printer: $printerPath"

        # Use rundll32 to install the printer
        $process = Start-Process -FilePath "rundll32" -ArgumentList "printui.dll,PrintUIEntry /in /n\`"$printerPath\`"" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
          Write-Output 'SUCCESS'
        } else {
          Write-Output "ERROR: Installation failed with exit code $($process.ExitCode)"
        }
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('ERROR:')) {
        return { success: false, error: output.substring(6).trim() };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerComputerHandlers };
