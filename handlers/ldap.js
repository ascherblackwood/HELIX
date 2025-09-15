const { ipcMain } = require('electron');
const path = require('path');
const { executePowerShell, buildAuthParam } = require(path.join(__dirname, '..', 'utils', 'powershell'));

/**
 * Register LDAP search and AD query handlers
 */
function registerLdapHandlers() {
  // Real LDAP Search Handler using PowerShell
  ipcMain.handle('ldap-search', async (event, config, searchOptions) => {
    console.log('LDAP Search request:', {
      server: config.server,
      filter: searchOptions?.options?.filter,
      baseDN: searchOptions?.baseDN
    });

    if (!config.server || !config.username) {
      return { success: false, error: 'Invalid connection configuration' };
    }

    try {
      const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
      const authParam = buildAuthParam(config);
      const filter = searchOptions?.options?.filter || '';
      const requestedBase = (searchOptions?.baseDN || '').toString();

      // Determine search base - prefer explicit baseDN if valid
      let searchBase = '';
      const isValidDN = (dn) => /^(CN|OU|DC)=.+(,(CN|OU|DC)=.+)+$/i.test(String(dn || ''));
      if (requestedBase && isValidDN(requestedBase)) {
        searchBase = `-SearchBase "${requestedBase}"`;
      } else if (config.parentOU && isValidDN(config.parentOU)) {
        searchBase = `-SearchBase "${config.parentOU}"`;
      }

      if (filter.includes('user')) {
        // Search for users
        const userCommand = `
          try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $users = Get-ADUser -Filter * ${serverParam} ${authParam} ${searchBase} -Properties * -ErrorAction Stop
            $users | Select-Object @{Name='cn';Expression={$_.Name}},
                                   sAMAccountName,
                                   mail,
                                   userAccountControl,
                                   givenName,
                                   surname,
                                   displayName,
                                   title,
                                   department,
                                   company,
                                   manager,
                                   employeeId,
                                   employeeType,
                                   office,
                                   telephoneNumber,
                                   mobile,
                                   facsimileTelephoneNumber,
                                   streetAddress,
                                   city,
                                   st,
                                   postalCode,
                                   co,
                                   lastLogon,
                                   passwordLastSet,
                                   accountExpires,
                                   logonCount,
                                   memberOf,
                                   description | ConvertTo-Json -Depth 3
          } catch {
            Write-Error $_.Exception.Message
          }
        `;

        const userDataJson = await executePowerShell(userCommand);
        let userData = [];

        if (userDataJson && userDataJson !== 'null') {
          userData = JSON.parse(userDataJson);
          if (!Array.isArray(userData)) {
            userData = [userData];
          }

          // Transform data to match expected format
          userData = userData.map(user => ({
            cn: user.cn || user.displayName || user.sAMAccountName,
            sAMAccountName: user.sAMAccountName,
            mail: user.mail,
            userAccountControl: user.userAccountControl || 512,
            givenName: user.givenName,
            surname: user.surname,
            displayName: user.displayName || user.cn,
            title: user.title,
            department: user.department,
            company: user.company,
            manager: user.manager,
            employeeId: user.employeeId,
            employeeType: user.employeeType,
            office: user.office,
            phone: user.telephoneNumber,
            mobile: user.mobile,
            fax: user.facsimileTelephoneNumber,
            streetAddress: user.streetAddress,
            city: user.city,
            state: user.st,
            postalCode: user.postalCode,
            country: user.co,
            lastLogon: user.lastLogon,
            passwordLastSet: user.passwordLastSet,
            accountExpires: user.accountExpires,
            logonCount: user.logonCount,
            memberOf: user.memberOf || [],
            description: user.description
          }));
        }

        return { success: true, data: userData };

      } else if (filter.includes('computer')) {
        // Search for computers
        const computerCommand = `
          try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $computers = Get-ADComputer -Filter * ${serverParam} ${authParam} ${searchBase} -Properties * -ErrorAction Stop

            # For each computer, try to get actual last boot time
            $enrichedComputers = @()
            foreach ($computer in $computers) {
              $computerObj = $computer | Select-Object @{Name='cn';Expression={$_.Name}},
                                                    operatingSystem,
                                                    operatingSystemVersion,
                                                    lastLogonTimestamp,
                                                    lastLogonDate,
                                                    userAccountControl,
                                                    description,
                                                    location,
                                                    managedBy,
                                                    servicePrincipalName,
                                                    objectGUID,
                                                    dNSHostName,
                                                    distinguishedName,
                                                    whenCreated,
                                                    whenChanged

              # Try to get real last boot time
              try {
                if ($computer.Enabled -and $computer.dNSHostName) {
                  $pingResult = Test-Connection -ComputerName $computer.dNSHostName -Count 1 -Quiet -TimeoutSeconds 2
                  if ($pingResult) {
                    $bootTime = Get-CimInstance -ComputerName $computer.dNSHostName -ClassName Win32_OperatingSystem -Property LastBootUpTime -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LastBootUpTime
                    if ($bootTime) {
                      $computerObj | Add-Member -NotePropertyName 'realLastBootTime' -NotePropertyValue $bootTime.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz')
                    }
                  }
                }
              } catch {
                # If we can't get real boot time, ignore and use AD data
              }

              $enrichedComputers += $computerObj
            }

            $enrichedComputers | ConvertTo-Json -Depth 3
          } catch {
            Write-Error $_.Exception.Message
          }
        `;

        const computerDataJson = await executePowerShell(computerCommand);
        let computerData = [];

        if (computerDataJson && computerDataJson !== 'null') {
          computerData = JSON.parse(computerDataJson);
          if (!Array.isArray(computerData)) {
            computerData = [computerData];
          }
        }

        return { success: true, data: computerData };

      } else if (filter.includes('group')) {
        // Search for groups
        const groupCommand = `
          try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $groups = Get-ADGroup -Filter * ${serverParam} ${authParam} ${searchBase} -Properties * -ErrorAction Stop
            $groups | Select-Object @{Name='cn';Expression={$_.Name}},
                                    description,
                                    member,
                                    groupType,
                                    objectGUID | ConvertTo-Json -Depth 2
          } catch {
            Write-Error $_.Exception.Message
          }
        `;

        const groupDataJson = await executePowerShell(groupCommand);
        let groupData = [];

        if (groupDataJson && groupDataJson !== 'null') {
          groupData = JSON.parse(groupDataJson);
          if (!Array.isArray(groupData)) {
            groupData = [groupData];
          }
        }

        return { success: true, data: groupData };
      }

      return { success: true, data: [] };

    } catch (error) {
      console.error('LDAP search error:', error);
      return {
        success: false,
        error: `LDAP search failed: ${error.message}`
      };
    }
  });

  // Get Active Directory Counts
  ipcMain.handle('get-ad-counts', async (event, config) => {
    console.log('Querying AD counts for:', config.server);

    // Validate connection config
    if (!config.server || !config.username) {
      return { success: false, error: 'Invalid connection configuration' };
    }

    try {
      // Use PowerShell to query AD counts
      const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
      const authParam = buildAuthParam(config);
      const searchBase = (config.parentOU && config.parentOU.trim() !== '') ? `-SearchBase "${config.parentOU}"` : '';

      const userCommand = `
        try {
          Import-Module ActiveDirectory -ErrorAction Stop
          $users = Get-ADUser -Filter * ${serverParam} ${authParam} ${searchBase} -ErrorAction Stop
          $users.Count
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      const computerCommand = `
        try {
          Import-Module ActiveDirectory -ErrorAction Stop
          $computers = Get-ADComputer -Filter * ${serverParam} ${authParam} ${searchBase} -ErrorAction Stop
          $computers.Count
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      const groupCommand = `
        try {
          Import-Module ActiveDirectory -ErrorAction Stop
          $groups = Get-ADGroup -Filter * ${serverParam} ${authParam} ${searchBase} -ErrorAction Stop
          $groups.Count
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      // Execute PowerShell commands concurrently
      const [userCountStr, computerCountStr, groupCountStr] = await Promise.all([
        executePowerShell(userCommand).catch(() => '0'),
        executePowerShell(computerCommand).catch(() => '0'),
        executePowerShell(groupCommand).catch(() => '0')
      ]);

      const userCount = parseInt(userCountStr) || 0;
      const computerCount = parseInt(computerCountStr) || 0;
      const groupCount = parseInt(groupCountStr) || 0;

      return {
        success: true,
        counts: {
          users: userCount,
          computers: computerCount,
          groups: groupCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AD counts query error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get Computer Inventory (Live inventory collection)
  ipcMain.handle('get-computer-inventory', async (event, computerName) => {
    if (!computerName) {
      return { success: false, error: 'Computer name is required' };
    }

    const psScript = `
      try {
        $ErrorActionPreference = 'Stop'
        $cn = '${computerName}'

        # Check if this is local machine
        $isLocal = ($cn.ToLower() -eq $env:COMPUTERNAME.ToLower()) -or
                   ($cn.ToLower() -eq 'localhost') -or
                   ($cn -eq '127.0.0.1') -or
                   ($cn.ToLower() -eq ($env:COMPUTERNAME + '.' + $env:USERDNSDOMAIN).ToLower())

        $scriptBlock = {
          $inventory = @{}

          try {
            # Get basic computer system info
            $cs = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop
            $inventory.computerName = $cs.Name
            $inventory.manufacturer = $cs.Manufacturer
            $inventory.model = $cs.Model
            $inventory.domain = $cs.Domain

            # Get memory info
            $totalMemory = [Math]::Round($cs.TotalPhysicalMemory / 1GB, 0)
            $inventory.memory = "$totalMemory GB"

            # Get system info
            $bios = Get-CimInstance -ClassName Win32_BIOS -ErrorAction Stop
            $inventory.serialNumber = $bios.SerialNumber

            # Get OS info
            $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
            $inventory.os = $os.Caption
            $inventory.osVersion = $os.Version

            # Get processor info
            $cpu = Get-CimInstance -ClassName Win32_Processor -ErrorAction Stop | Select-Object -First 1
            $inventory.processor = $cpu.Name

            # Get IP address
            try {
              $ip = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -ErrorAction Stop |
                    Where-Object { $_.IPEnabled -eq $true -and $_.IPAddress -ne $null } |
                    Select-Object -First 1 -ExpandProperty IPAddress |
                    Where-Object { $_ -match '^\\d+\\.\\d+\\.\\d+\\.\\d+$' -and $_ -notmatch '^169\\.254\\.' } |
                    Select-Object -First 1
              if (-not $ip) {
                $ip = Get-NetIPAddress -AddressFamily IPv4 -Type Unicast |
                      Where-Object { $_.IPAddress -notmatch '^169\\.254\\.' -and $_.IPAddress -ne '127.0.0.1' } |
                      Select-Object -First 1 -ExpandProperty IPAddress
              }
              $inventory.ipAddress = $ip
            } catch {
              $inventory.ipAddress = 'N/A'
            }

            # Get MAC address
            try {
              $mac = Get-CimInstance -ClassName Win32_NetworkAdapter -ErrorAction Stop |
                     Where-Object { $_.NetEnabled -eq $true -and $_.MACAddress -ne $null } |
                     Select-Object -First 1 -ExpandProperty MACAddress
              $inventory.macAddress = $mac
            } catch {
              $inventory.macAddress = 'N/A'
            }

            # Get last boot time
            try {
              if ($os.LastBootUpTime -is [DateTime]) {
                $inventory.lastBootTime = $os.LastBootUpTime.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz')
              } elseif ($os.LastBootUpTime -is [string]) {
                $dmtfDate = [System.Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)
                $inventory.lastBootTime = $dmtfDate.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz')
              } else {
                $inventory.lastBootTime = 'N/A'
              }
            } catch {
              $inventory.lastBootTime = 'N/A'
            }

            # Get current user
            try {
              $currentUser = $cs.UserName
              $inventory.currentUser = $currentUser
            } catch {
              $inventory.currentUser = 'N/A'
            }

          } catch {
            Write-Error "Failed to collect inventory: $($_.Exception.Message)"
          }

          return $inventory
        }

        if ($isLocal) {
          $result = & $scriptBlock
        } else {
          $result = Invoke-Command -ComputerName $cn -ScriptBlock $scriptBlock -ErrorAction Stop
        }

        $result | ConvertTo-Json -Depth 2

      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    try {
      const output = await executePowerShell(psScript);
      if (output.startsWith('ERROR:')) {
        return { success: false, error: output.substring(6).trim() };
      }
      const inventory = JSON.parse(output);
      return { success: true, data: inventory };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerLdapHandlers };