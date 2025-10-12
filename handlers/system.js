const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { executePowerShell, buildAuthParam } = require(path.join(__dirname, '..', 'utils', 'powershell'));

/**
 * Register system management-related IPC handlers
 */
function registerSystemHandlers() {
  // Log off user session on a remote computer (via quser/logoff)
  ipcMain.handle('logoff-user-session', async (event, computerName, username) => {
    if (!computerName || !username) {
      return { success: false, error: 'Computer name and username are required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $server='${computerName}'
        $user='${username}'.ToLower()
        $out = quser /server:$server 2>&1 | Out-String
        if (-not $out) { throw 'No response from quser' }
        $ids = @()
        foreach ($line in $out -split "\`n") {
          if ($line -match '^\s*(>\s*)?([^\s]+)\s+([^\s]+)?\s+(\d+)\s+') {
            $u = $Matches[2]
            $id = [int]$Matches[4]
            if ($u -and ($u.ToLower() -eq $user)) { $ids += $id }
          }
        }
        if ($ids.Count -eq 0) { throw "No active sessions found for user '$user' on $server" }
        $count = 0
        foreach ($id in $ids) {
          try { logoff $id /server:$server 2>$null; $count++ } catch {}
        }
        [PSCustomObject]@{ count=$count; sessions=$ids } | ConvertTo-Json -Depth 2
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    try {
      const out = await executePowerShell(psScript);
      if (out.startsWith('ERROR:')) {
        return { success: false, error: out.substring(6).trim() };
      }
      const data = JSON.parse(out);
      return { success: true, ...data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Get User Profiles on Computer
  ipcMain.handle('get-user-profiles', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $cn = '${computerName}'
        $userProfiles = @()

        try {
          # Use WinRM with Invoke-Command for remote execution
          $scriptBlock = {
            $profiles = @()
            $regPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList"

            try {
              $regKeys = Get-ChildItem $regPath | Where-Object { $_.Name -match 'S-1-5-21-' }
              foreach ($key in $regKeys) {
                try {
                  $profilePath = (Get-ItemProperty $key.PSPath -Name ProfileImagePath -ErrorAction SilentlyContinue).ProfileImagePath
                  if ($profilePath) {
                    $username = Split-Path $profilePath -Leaf

                    # Filter out system/protected accounts that shouldn't be deleted
                    $protectedAccounts = @(
                      "Administrator", "Guest", "DefaultAccount", "WDAGUtilityAccount",
                      "Public", "Default", "All Users", "ProgramData", "TEMP", "TMP"
                    )

                    $shouldExclude = $false
                    foreach ($protected in $protectedAccounts) {
                      if ($username -eq $protected -or $username -like "*$protected*") {
                        $shouldExclude = $true
                        break
                      }
                    }

                    # Also exclude service accounts and system accounts
                    if ($username -like "*\$" -or $username -like "NT SERVICE\\*" -or $username -like "NT AUTHORITY\\*" -or
                        $username -like "*\\.NET*" -or $username -like "MSSQL*" -or $username -like "IIS*" -or
                        $username -like "*SERVICE*" -or $username -like "SYSTEM" -or $username -like "NETWORK*") {
                      $shouldExclude = $true
                    }

                    if ($username -and -not $shouldExclude) {
                      # Additional check: Verify this isn't a well-known SID
                      $wellKnownSIDs = @(
                        "S-1-5-18", "S-1-5-19", "S-1-5-20", # SYSTEM, LOCAL SERVICE, NETWORK SERVICE
                        "S-1-5-21-*-500",  # Built-in Administrator (RID 500)
                        "S-1-5-21-*-501"   # Built-in Guest (RID 501)
                      )

                      $isWellKnown = $false
                      foreach ($knownSID in $wellKnownSIDs) {
                        if ($key.PSChildName -like $knownSID -or $key.PSChildName -eq "S-1-5-18" -or
                            $key.PSChildName -eq "S-1-5-19" -or $key.PSChildName -eq "S-1-5-20" -or
                            $key.PSChildName -like "*-500" -or $key.PSChildName -like "*-501") {
                          $isWellKnown = $true
                          break
                        }
                      }

                      if (-not $isWellKnown) {
                        $profiles += [PSCustomObject]@{
                          Username = $username
                          SID = $key.PSChildName
                          ProfilePath = $profilePath
                          Size = "Calculating..."
                          Type = "Regular User"
                        }
                      }
                    }
                  }
                } catch {
                  # Skip problematic profiles
                }
              }
            } catch {
              # If registry access fails, try alternative method
              try {
                $wmiProfiles = Get-WmiObject -Class Win32_UserProfile | Where-Object { $_.Special -eq $false -and $_.SID -match '^S-1-5-21-' }
                foreach ($profile in $wmiProfiles) {
                  $username = Split-Path $profile.LocalPath -Leaf

                  # Apply same filtering as registry method
                  $protectedAccounts = @(
                    "Administrator", "Guest", "DefaultAccount", "WDAGUtilityAccount",
                    "Public", "Default", "All Users", "ProgramData", "TEMP", "TMP"
                  )

                  $shouldExclude = $false
                  foreach ($protected in $protectedAccounts) {
                    if ($username -eq $protected -or $username -like "*$protected*") {
                      $shouldExclude = $true
                      break
                    }
                  }

                  # Also exclude service accounts and system accounts
                  if ($username -like "*\$" -or $username -like "NT SERVICE\\*" -or $username -like "NT AUTHORITY\\*" -or
                      $username -like "*\\.NET*" -or $username -like "MSSQL*" -or $username -like "IIS*" -or
                      $username -like "*SERVICE*" -or $username -like "SYSTEM" -or $username -like "NETWORK*") {
                    $shouldExclude = $true
                  }

                  # Check for well-known SIDs
                  if ($profile.SID -like "*-500" -or $profile.SID -like "*-501" -or
                      $profile.SID -eq "S-1-5-18" -or $profile.SID -eq "S-1-5-19" -or $profile.SID -eq "S-1-5-20") {
                    $shouldExclude = $true
                  }

                  if ($username -and -not $shouldExclude) {
                    $profiles += [PSCustomObject]@{
                      Username = $username
                      SID = $profile.SID
                      ProfilePath = $profile.LocalPath
                      Size = "Calculating..."
                      Type = "Regular User"
                    }
                  }
                }
              } catch {
                # Final fallback - return error
                throw "Unable to access user profiles: $($_.Exception.Message)"
              }
            }

            return $profiles
          }

          # Execute remotely or locally
          if ('${computerName}'.ToLower() -eq $env:COMPUTERNAME.ToLower()) {
            $userProfiles = & $scriptBlock
          } else {
            $userProfiles = Invoke-Command -ComputerName $cn -ScriptBlock $scriptBlock -ErrorAction Stop
          }

          # Convert to JSON
          if ($userProfiles.Count -eq 0) {
            Write-Output "[]"
          } else {
            $userProfiles | ConvertTo-Json -Depth 3
          }

        } catch {
          Write-Output "ERROR: $($_.Exception.Message)"
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
      const profiles = JSON.parse(output || '[]');
      return { success: true, data: Array.isArray(profiles) ? profiles : [profiles] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Delete User Profiles
  ipcMain.handle('delete-user-profiles', async (event, computerName, selectedProfiles) => {
    if (!computerName || !selectedProfiles || selectedProfiles.length === 0) {
      return { success: false, error: 'Computer name and profiles are required' };
    }

    const sidList = selectedProfiles.map(p => `"${p.SID}"`).join(', ');

    const psScript = [
      'try {',
      '  $ErrorActionPreference = "Stop"',
      `  $cn = "${computerName}"`,
      `  $profilesToDelete = @(${sidList})`,
      '  $results = @()',
      '  ',
      '  # Check if target is local machine',
      '  $isLocal = ($cn.ToLower() -eq $env:COMPUTERNAME.ToLower()) -or ($cn.ToLower() -eq "localhost") -or ($cn -eq "127.0.0.1")',
      '  ',
      '  foreach ($sid in $profilesToDelete) {',
      '    try {',
      '      if ($isLocal) {',
      '        # Local profile deletion',
      '        $profile = Get-CimInstance -ClassName Win32_UserProfile -Filter "SID=\'$sid\'"',
      '      } else {',
      '        # Remote profile deletion',
      '        $session = New-CimSession -ComputerName $cn -Authentication Negotiate -ErrorAction Stop',
      '        $profile = Get-CimInstance -CimSession $session -ClassName Win32_UserProfile -Filter "SID=\'$sid\'" -ErrorAction Stop',
      '      }',
      '      ',
      '      if ($profile) {',
      '        # Check if profile is loaded (user is logged in)',
      '        if ($profile.Loaded -eq $true) {',
      '          $results += "SKIPPED: Profile is currently loaded (user logged in): $sid"',
      '          continue',
      '        }',
      '        ',
      '        # Attempt to delete',
      '        try {',
      '          Remove-CimInstance -InputObject $profile -ErrorAction Stop',
      '          $results += "Successfully deleted profile: $sid"',
      '        } catch {',
      '          $errMsg = $_.Exception.Message',
      '          # Check for specific error codes',
      '          if ($errMsg -match "0x80070020" -or $errMsg -match "being used") {',
      '            $results += "FAILED: Profile is in use (processes still running or user logged in): $sid - Try logging off the user first"',
      '          } elseif ($errMsg -match "0x80070005" -or $errMsg -match "Access.*denied") {',
      '            $results += "FAILED: Access denied - Check administrative permissions: $sid"',
      '          } else {',
      '            $results += "FAILED: $sid - $errMsg"',
      '          }',
      '        }',
      '      } else {',
      '        $results += "Profile not found: $sid"',
      '      }',
      '      ',
      '      if ($session) {',
      '        $session | Remove-CimSession -ErrorAction SilentlyContinue',
      '      }',
      '    } catch {',
      '      $errMsg = $_.Exception.Message',
      '      if ($errMsg -match "0x80070020" -or $errMsg -match "being used") {',
      '        $results += "FAILED: Profile is in use: $sid - User may be logged in or processes still running"',
      '      } else {',
      "        $results += \"FAILED: ${sid} - $errMsg\"",
      '      }',
      '    }',
      '  }',
      '  ',
      '  $results -join "; "',
      '} catch {',
      '  Write-Output "ERROR: $($_.Exception.Message)"',
      '}'
    ].join('\n');

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('ERROR:')) {
        return { success: false, error: output.substring(6).trim() };
      }
      return { success: true, message: output };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Reboot Computer
  ipcMain.handle('reboot-computer', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $cn = '${computerName}'
        $success = $false
        $message = ""

        # Check if target is the local computer
        $isLocal = ($cn.ToLower() -eq $env:COMPUTERNAME.ToLower()) -or ($cn.ToLower() -eq "localhost") -or ($cn -eq "127.0.0.1")

        if ($isLocal) {
          # Local reboot - use shutdown command for immediate effect
          try {
            shutdown /r /f /t 5 /c "Remote reboot initiated from ACTV"
            $success = $true
            $message = "Local reboot initiated - system will restart in 5 seconds"
          } catch {
            Write-Output "ERROR: Failed to initiate local reboot: $($_.Exception.Message)"
            exit 1
          }
        } else {
          # Remote reboot - try multiple methods

          # Method 1: Try PowerShell Restart-Computer with credentials
          try {
            Write-Host "Attempting PowerShell Restart-Computer..."
            Restart-Computer -ComputerName $cn -Force -Wait:$false -ErrorAction Stop
            $success = $true
            $message = "PowerShell reboot command sent successfully"
          } catch {
            Write-Host "PowerShell method failed: $($_.Exception.Message)"

            # Method 2: Try shutdown command
            try {
              Write-Host "Attempting shutdown command..."
              $shutdownResult = shutdown /r /m \\\\$cn /f /t 0 /c "Remote reboot initiated from ACTV" 2>&1
              if ($LASTEXITCODE -eq 0) {
                $success = $true
                $message = "Shutdown command executed successfully"
              } else {
                throw "Shutdown command failed with exit code $LASTEXITCODE - $shutdownResult"
              }
            } catch {
              Write-Host "Shutdown command failed: $($_.Exception.Message)"

              # Method 3: Try WMI Win32_OperatingSystem
              try {
                Write-Host "Attempting WMI reboot..."
                $os = Get-WmiObject -Class Win32_OperatingSystem -ComputerName $cn -ErrorAction Stop
                $rebootResult = $os.Reboot()
                if ($rebootResult.ReturnValue -eq 0) {
                  $success = $true
                  $message = "WMI reboot command executed successfully"
                } else {
                  throw "WMI reboot failed with return code $($rebootResult.ReturnValue)"
                }
              } catch {
                Write-Host "WMI method failed: $($_.Exception.Message)"

                # Method 4: Try CIM/WinRM approach
                try {
                  Write-Host "Attempting CIM session reboot..."
                  $session = New-CimSession -ComputerName $cn -ErrorAction Stop
                  $os = Get-CimInstance -CimSession $session -ClassName Win32_OperatingSystem -ErrorAction Stop
                  Invoke-CimMethod -InputObject $os -MethodName Reboot -ErrorAction Stop
                  Remove-CimSession $session
                  $success = $true
                  $message = "CIM reboot command executed successfully"
                } catch {
                  Write-Output "ERROR: All reboot methods failed. Last error: $($_.Exception.Message). Ensure WinRM is enabled on target computer and you have administrative privileges."
                  exit 1
                }
              }
            }
          }
        }

        if ($success) {
          Write-Output "SUCCESS: $message"
        } else {
          Write-Output "ERROR: Reboot command failed to execute"
        }

      } catch {
        Write-Output "ERROR: Unexpected error: $($_.Exception.Message)"
      }
    `;

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('ERROR:')) {
        return { success: false, error: output.substring(6).trim() };
      }
      if (output.startsWith('SUCCESS:')) {
        return { success: true, message: output.substring(8).trim() };
      }
      return { success: false, error: 'Unexpected response from PowerShell script' };
    } catch (e) {
      return { success: false, error: `PowerShell execution failed: ${e.message}` };
    }
  });

  // Get Disk Space Information
  ipcMain.handle('get-disk-space', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $cn = '${computerName}'
        $diskInfo = @()

        try {
          # Use Invoke-Command for remote execution or direct execution for local
          $scriptBlock = {
            $disks = @()

            try {
              # Try CIM first
              $cimDisks = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop
              foreach ($disk in $cimDisks) {
                if ($disk.Size -and $disk.Size -gt 0) {
                  $totalGB = [Math]::Round($disk.Size / 1GB, 2)
                  $freeGB = [Math]::Round($disk.FreeSpace / 1GB, 2)
                  $usedGB = $totalGB - $freeGB
                  $freePercent = [Math]::Round(($freeGB / $totalGB) * 100, 1)

                  $disks += [PSCustomObject]@{
                    Drive = $disk.DeviceID
                    TotalSize = "$totalGB GB"
                    FreeSpace = "$freeGB GB"
                    UsedSpace = "$usedGB GB"
                    FreePercent = "$freePercent%"
                    TotalBytes = $disk.Size
                    FreeBytes = $disk.FreeSpace
                  }
                }
              }
            } catch {
              # Fallback to WMI if CIM fails
              try {
                $wmiDisks = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop
                foreach ($disk in $wmiDisks) {
                  if ($disk.Size -and $disk.Size -gt 0) {
                    $totalGB = [Math]::Round($disk.Size / 1GB, 2)
                    $freeGB = [Math]::Round($disk.FreeSpace / 1GB, 2)
                    $usedGB = $totalGB - $freeGB
                    $freePercent = [Math]::Round(($freeGB / $totalGB) * 100, 1)

                    $disks += [PSCustomObject]@{
                      Drive = $disk.DeviceID
                      TotalSize = "$totalGB GB"
                      FreeSpace = "$freeGB GB"
                      UsedSpace = "$usedGB GB"
                      FreePercent = "$freePercent%"
                      TotalBytes = [long]$disk.Size
                      FreeBytes = [long]$disk.FreeSpace
                    }
                  }
                }
              } catch {
                throw "Unable to access disk information: $($_.Exception.Message)"
              }
            }

            return $disks
          }

          # Execute remotely or locally
          if ('${computerName}'.ToLower() -eq $env:COMPUTERNAME.ToLower()) {
            $diskInfo = & $scriptBlock
          } else {
            $diskInfo = Invoke-Command -ComputerName $cn -ScriptBlock $scriptBlock -ErrorAction Stop
          }

          # Convert to JSON
          if ($diskInfo.Count -eq 0) {
            Write-Output "[]"
          } else {
            $diskInfo | ConvertTo-Json -Depth 3
          }

        } catch {
          Write-Output "ERROR: $($_.Exception.Message)"
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
      const diskInfo = JSON.parse(output || '[]');
      return { success: true, data: Array.isArray(diskInfo) ? diskInfo : [diskInfo] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Get System Info
  ipcMain.handle('get-system-info', async () => {
    const os = require('os');
    const { app } = require('electron');
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    };
  });
}

module.exports = { registerSystemHandlers };
