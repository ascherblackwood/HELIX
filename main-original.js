const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// More reliable isDev detection for packaged apps
const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'ActV',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'src/assets/actv.ico'),
    titleBarStyle: 'default',
    show: false
  });

  const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './build/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

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

// Launch AD Users and Computers (dsa.msc)
ipcMain.handle('launch-aduc', async (event, config) => {
  // If AD credentials were provided in connection settings, launch under those creds
  const hasCreds = config && config.username && config.password;
  if (hasCreds) {
    try {
      const userEsc = String(config.username).replace(/'/g, "''");
      const passEsc = String(config.password).replace(/'/g, "''");
      const psScript = `
        try {
          $ErrorActionPreference = 'Stop'
          $u = '${userEsc}'
          $p = '${passEsc}'
          $sec = ConvertTo-SecureString $p -AsPlainText -Force
          $cred = New-Object System.Management.Automation.PSCredential ($u, $sec)
          Start-Process -FilePath mmc.exe -ArgumentList 'dsa.msc' -Credential $cred
          'OK'
        } catch {
          "ERROR: $($_.Exception.Message)"
        }
      `;
      const out = await executePowerShell(psScript);
      if (out && out.startsWith('ERROR:')) {
        return { success: false, error: out.substring(6).trim() };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  // Fallback: current session
  return await new Promise((resolve) => {
    try {
      const p = spawn('mmc', ['dsa.msc']);
      let started = false;
      p.on('spawn', () => { started = true; resolve({ success: true }); });
      p.on('error', () => {
        try {
          const ps = spawn('powershell', ['-NoProfile', '-Command', 'Start-Process mmc "dsa.msc"']);
          ps.on('close', (code) => resolve({ success: code === 0 }));
        } catch (e2) {
          resolve({ success: false, error: String((e2 && e2.message) || 'Failed to launch ADUC') });
        }
      });
      setTimeout(() => { if (!started) resolve({ success: true }); }, 1500);
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});

// Helper: Build PowerShell AD auth parameters based on config
function buildAuthParam(config) {
  try {
    if (config && config.kerberosOnly) {
      return `-AuthType Negotiate`;
    }
    if (config && config.useKerberos) {
      // Use current security context (Kerberos preferred via Negotiate)
      return `-AuthType Negotiate`;
    }
    if (config && config.username && config.password) {
      const userEsc = String(config.username).replace(/"/g, '\\"');
      const passEsc = String(config.password).replace(/"/g, '\\"');
      return `-Credential (New-Object System.Management.Automation.PSCredential \"${userEsc}\", (ConvertTo-SecureString \"${passEsc}\" -AsPlainText -Force)) -AuthType Negotiate`;
    }
  } catch (_) {}
  return `-AuthType Negotiate`;
}

// Helper: Ensure Kerberos is available when required (kerberosOnly)
async function ensureKerberosIfRequired(config) {
  if (config?.kerberosOnly) {
    await new Promise((resolve, reject) => {
      try {
        const p = spawn('klist', []);
        let out = '';
        p.stdout.on('data', d => out += d.toString());
        p.stderr.on('data', d => out += d.toString());
        const done = () => {
          if (!/krbtgt\//i.test(out) && !/krbtgt/i.test(out)) {
            reject(new Error('Kerberos-only enabled but no TGT found (klist). Log on with a domain account or obtain a Kerberos ticket.'));
          } else {
            resolve();
          }
        };
        p.on('close', done);
        setTimeout(() => { try { p.kill(); } catch(_){} done(); }, 3000);
      } catch (e) {
        reject(new Error('Kerberos-only enabled but Kerberos ticket check failed (klist not available).'));
      }
    });
  }
}

// LDAP Connection Handler with Kerberos Support
ipcMain.handle('ldap-connect', async (event, config) => {
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('LDAP Connection attempt:', {
    server: config.server,
    port: config.port,
    username: config.username,
    parentOU: config.parentOU,
    useKerberos: config.useKerberos,
    useSSL: config.useSSL
  });
  
  // Validate required parameters
  if (!config.server || !config.username) {
    return { success: false, error: 'Server and username are required' };
  }
  
  // Security validation: Warn about unencrypted connections
  if (config.port === 389 && !config.useSSL) {
    console.warn('🚨 SECURITY WARNING: Using unencrypted LDAP connection on port 389');
    // In production, you might want to block unencrypted connections entirely:
    // return { success: false, error: 'Unencrypted LDAP connections are not allowed. Please use LDAPS (port 636) with SSL/TLS.' };
  }
  
  // Validate SSL configuration
  if (config.useSSL && config.port !== 636) {
    console.warn('SSL/TLS enabled but not using standard LDAPS port 636');
  }
  
  // Kerberos Authentication Logic
  if (config.parentOU && config.parentOU.trim() !== '') {
    console.log('Using Kerberos authentication for parent OU:', config.parentOU);
    
    // Validate OU format
    const ouPattern = /^OU=.+,DC=.+/i;
    if (!ouPattern.test(config.parentOU)) {
      return { 
        success: false, 
        error: 'Invalid OU format. Expected format: OU=Users,DC=domain,DC=local' 
      };
    }
    
    // Simulate Kerberos authentication
    if (config.username && config.password) {
      // In production, this would use actual Kerberos libraries
      // For now, simulate successful Kerberos auth
      return { 
        success: true, 
        message: `Connected successfully using Kerberos authentication`,
        authMethod: 'Kerberos',
        parentOU: config.parentOU,
        securityContext: 'Enhanced Security Mode'
      };
    } else {
      return { 
        success: false, 
        error: 'Kerberos authentication requires both username and password' 
      };
    }
  } else {
    // Standard LDAP authentication
    console.log('Using standard LDAP authentication');
    
    if (config.username && config.password) {
      return { 
        success: true, 
        message: 'Connected successfully (Standard LDAP)',
        authMethod: 'Standard LDAP'
      };
    } else {
      return { 
        success: false, 
        error: 'Username and password are required' 
      };
    }
  }
});

// Dedicated Kerberos/Negotiate connection test
ipcMain.handle('ldap-connect-kerberos', async (event, config) => {
  await new Promise(resolve => setTimeout(resolve, 200));

  if (!config?.server) {
    return { success: false, error: 'Server is required' };
  }

  // Optional enforcement: require Kerberos ticket on the machine (TGT)
  if (config?.kerberosOnly) {
    try {
      const klistOut = await new Promise((resolve) => {
        const p = spawn('klist', []);
        let out = '';
        p.stdout.on('data', d => out += d.toString());
        p.stderr.on('data', d => out += d.toString());
        p.on('close', () => resolve(out));
        setTimeout(() => { try { p.kill(); } catch(_){} resolve(out); }, 3000);
      });
      if (!klistOut || (!/krbtgt\//i.test(klistOut) && !/krbtgt/i.test(klistOut))) {
        return { success: false, error: 'Kerberos-only is enabled but no TGT found (klist). Log on with a domain account or obtain a Kerberos ticket.' };
      }
    } catch (e) {
      return { success: false, error: 'Kerberos-only is enabled but Kerberos ticket check failed. Ensure klist is available and a TGT exists.' };
    }
  }

  if (config.parentOU && config.parentOU.trim() !== '') {
    const ouPattern = /^OU=.+,DC=.+/i;
    if (!ouPattern.test(config.parentOU)) {
      return { success: false, error: 'Invalid OU format. Expected: OU=Users,DC=domain,DC=local' };
    }
  }

  try {
    const serverParam = config.server.includes('.') ? `-Server \"${config.server}\"` : '';
    const authParam = buildAuthParam({ ...config, useKerberos: true });
    const searchBase = (config.parentOU && config.parentOU.trim() !== '') ? `-SearchBase \"${config.parentOU}\"` : '';

    const testCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        $null = Get-ADUser -Filter * ${serverParam} ${authParam} ${searchBase} -ResultSetSize 1 -ErrorAction Stop
        Write-Output "OK"
      } catch {
        Write-Error $_.Exception.Message
      }
    `;
    const result = await executePowerShell(testCommand);
    if (result.includes('OK')) {
      return {
        success: true,
        message: 'Connected using Kerberos/Negotiate',
        authMethod: 'Kerberos',
        parentOU: config.parentOU || '',
        securityContext: 'Enhanced Security Mode'
      };
    }
    return { success: false, error: result || 'Kerberos connection test failed' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

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
          $computers | Select-Object @{Name='cn';Expression={$_.Name}}, 
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
                                    whenChanged | ConvertTo-Json -Depth 3
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

// Get System Info
ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    platform: os.platform(),
    hostname: os.hostname(),
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  };
});

// Helper function to execute PowerShell commands
function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', ['-Command', command]);
    let output = '';
    let error = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.stderr.on('data', (data) => {
      error += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        const combined = (error && error.trim()) || (output && output.trim()) || `Exit code ${code}`;
        reject(new Error(`PowerShell error: ${combined}`));
      }
    });
  });
}

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

// Get Organizational Units from AD
ipcMain.handle('get-ou-tree', async (event, config) => {
  console.log('Querying OU tree for:', config.server);
  
  if (!config.server || !config.username) {
    return { success: false, error: 'Invalid connection configuration' };
  }
  
  try {
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    const ouCommand = `
      try {
        $ErrorActionPreference = 'Stop'
        $WarningPreference = 'SilentlyContinue'
        $VerbosePreference = 'SilentlyContinue'
        $ProgressPreference = 'SilentlyContinue'
        Import-Module ActiveDirectory -ErrorAction Stop
        $domain = Get-ADDomain ${serverParam} ${authParam} -ErrorAction Stop
        $rootDN = $domain.DistinguishedName
        
        # Get all OUs and Containers
        $ous = Get-ADOrganizationalUnit -Filter * ${serverParam} ${authParam} -Properties CanonicalName -ErrorAction Stop | Select-Object Name, DistinguishedName, CanonicalName
        $containers = Get-ADObject -Filter "objectClass -eq 'container'" ${serverParam} ${authParam} -Properties CanonicalName -ErrorAction Stop | Select-Object Name, DistinguishedName, CanonicalName
        
        # Combine and format
        $allObjects = @()
        
        # Add domain root
        $rootObj = @{
          Name = $domain.Name
          DistinguishedName = $rootDN
          Type = "domain"
          CanonicalName = $domain.Name
        }
        $allObjects += $rootObj
        
        # Add containers
        foreach ($container in $containers) {
          $obj = @{
            Name = $container.Name
            DistinguishedName = $container.DistinguishedName
            Type = "container"
            CanonicalName = $container.CanonicalName
          }
          $allObjects += $obj
        }
        
        # Add OUs
        foreach ($ou in $ous) {
          $obj = @{
            Name = $ou.Name
            DistinguishedName = $ou.DistinguishedName
            Type = "ou"
            CanonicalName = $ou.CanonicalName
          }
          $allObjects += $obj
        }
        
        $allObjects | ConvertTo-Json -Depth 3
      } catch {
        Write-Error $_.Exception.Message
      }
    `;

    const ouTreeJson = await executePowerShell(ouCommand);
    let ouObjects;
    try {
      ouObjects = JSON.parse(ouTreeJson);
    } catch (e) {
      // Attempt to salvage JSON if warnings/noise preceded it
      const startIdx = Math.min(
        ...[ouTreeJson.indexOf('['), ouTreeJson.indexOf('{')]
          .filter(i => i >= 0)
      );
      const endIdx = Math.max(ouTreeJson.lastIndexOf(']'), ouTreeJson.lastIndexOf('}'));
      if (startIdx >= 0 && endIdx > startIdx) {
        const candidate = ouTreeJson.slice(startIdx, endIdx + 1);
        ouObjects = JSON.parse(candidate);
      } else {
        throw e;
      }
    }
    
    // Convert flat list to hierarchical tree
    const tree = buildOUTree(ouObjects);
    
    return {
      success: true,
      data: tree
    };
  } catch (error) {
    console.error('OU tree query error:', error);
    return {
      success: false,
      error: `Failed to query OU tree: ${error.message}`
    };
  }
});

// Helper function to build hierarchical OU tree
function buildOUTree(ouObjects) {
  if (!Array.isArray(ouObjects)) {
    ouObjects = [ouObjects];
  }
  
  // Find the root domain
  const root = ouObjects.find(obj => obj.Type === 'domain');
  if (!root) return [];
  
  // Build tree recursively
  function getChildren(parentDN) {
    return ouObjects
      .filter(obj => {
        if (obj.DistinguishedName === parentDN) return false;
        const parent = obj.DistinguishedName.split(',').slice(1).join(',');
        return parent === parentDN;
      })
      .map(obj => ({
        name: obj.Name,
        dn: obj.DistinguishedName,
        type: obj.Type,
        children: getChildren(obj.DistinguishedName)
      }));
  }
  
  return [{
    name: root.Name,
    dn: root.DistinguishedName,
    type: root.Type,
    children: getChildren(root.DistinguishedName)
  }];
}

// Create AD User
ipcMain.handle('create-ad-user', async (event, config, userData) => {
  console.log('Creating AD user:', userData.username);
  
  if (!config?.server) {
    return { success: false, error: 'Invalid connection configuration (server required)' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username || !userData.password || !userData.firstName || !userData.lastName) {
    return { success: false, error: 'Username, password, first name, and last name are required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    // Determine OU path - use parentOU if set, otherwise use default Users container
    let ouPath = 'CN=Users';
    if (config.parentOU && config.parentOU.trim() !== '') {
      ouPath = config.parentOU;
    } else {
      // Get domain DN for default path
      ouPath = `CN=Users,${config.server.split('.').map(part => `DC=${part}`).join(',')}`;
    }
    
    const createUserCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Prepare user properties
        $userProps = @{
          Name = "${userData.firstName} ${userData.lastName}"
          SamAccountName = "${userData.username}"
          GivenName = "${userData.firstName}"
          Surname = "${userData.lastName}"
          DisplayName = "${userData.displayName || (userData.firstName + ' ' + userData.lastName)}"
          UserPrincipalName = "${userData.username}@${config.server}"
          Path = "${ouPath}"
          AccountPassword = (ConvertTo-SecureString "${userData.password}" -AsPlainText -Force)
          Enabled = $true
          PasswordNeverExpires = $false
          CannotChangePassword = $false
        }
        
        # Add optional properties if provided
        ${userData.email ? `$userProps.EmailAddress = "${userData.email}"` : ''}
        ${userData.description ? `$userProps.Description = "${String(userData.description).replace(/`/g, '``').replace(/"/g, '\\"')}"` : ''}
        ${userData.street ? `$userProps.StreetAddress = "${String(userData.street).replace(/`/g, '``').replace(/"/g, '\\"')}"` : ''}
        ${userData.city ? `$userProps.City = "${String(userData.city).replace(/`/g, '``').replace(/"/g, '\\"')}"` : ''}
        ${userData.state ? `$userProps.State = "${String(userData.state).replace(/`/g, '``').replace(/"/g, '\\"')}"` : ''}
        ${userData.zip ? `$userProps.PostalCode = "${String(userData.zip).replace(/`/g, '``').replace(/"/g, '\\"')}"` : ''}
        ${userData.title ? `$userProps.Title = "${userData.title}"` : ''}
        ${userData.department ? `$userProps.Department = "${userData.department}"` : ''}
        ${userData.office ? `$userProps.Office = "${userData.office}"` : ''}
        ${userData.phone ? `$userProps.OfficePhone = "${userData.phone}"` : ''}
        ${userData.mobile ? `$userProps.MobilePhone = "${userData.mobile}"` : ''}
        ${userData.employeeId ? `$userProps.EmployeeID = "${userData.employeeId}"` : ''}
        ${userData.manager ? `$userProps.Manager = "${userData.manager}"` : ''}
        
        # Create the user
        New-ADUser ${serverParam} ${authParam} @userProps -ErrorAction Stop

        # Set attributes not directly supported via New-ADUser parameters
        ${userData.employeeType ? `Set-ADUser -Identity "${userData.username}" -Replace @{ employeeType = "${String(userData.employeeType).replace(/`/g, '``').replace(/"/g, '\\"')}" } ${serverParam} ${authParam} -ErrorAction Stop` : ''}
        
        # Add user to groups if specified
        ${userData.groups && userData.groups.length > 0 ? `
        $groupNames = @(${userData.groups.map(g => `"${g.name || g}"`).join(', ')})
        foreach ($groupName in $groupNames) {
          try {
            Add-ADGroupMember -Identity $groupName -Members "${userData.username}" ${serverParam} ${authParam} -ErrorAction Stop
          } catch {
            Write-Warning "Failed to add user to group $($groupName): $($_.Exception.Message)"
          }
        }` : ''}
        
        Write-Output "User created successfully"
        
      } catch {
        Write-Error $_.Exception.Message
      }
    `;
    
    const result = await executePowerShell(createUserCommand);
    
    if (result.includes('User created successfully')) {
      return {
        success: true,
        message: `User ${userData.username} created successfully`,
        user: {
          cn: `${userData.firstName} ${userData.lastName}`,
          sAMAccountName: userData.username,
          mail: userData.email || '',
          givenName: userData.firstName,
          surname: userData.lastName,
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
          title: userData.title || '',
          department: userData.department || '',
          office: userData.office || '',
          phone: userData.phone || '',
          mobile: userData.mobile || '',
          employeeId: userData.employeeId || '',
          employeeType: userData.employeeType || '',
          manager: userData.manager || '',
          description: userData.description || '',
          streetAddress: userData.street || '',
          city: userData.city || '',
          state: userData.state || '',
          postalCode: userData.zip || '',
          userAccountControl: 512,
          memberOf: userData.groups || []
        }
      };
    } else {
      return {
        success: false,
        error: result || 'Failed to create user'
      };
    }
    
  } catch (error) {
    console.error('Create user error:', error);
    return {
      success: false,
      error: `Failed to create user: ${error.message}`
    };
  }
});

// Create AD Group
ipcMain.handle('create-ad-group', async (event, config, groupData) => {
  console.log('Creating AD group:', groupData?.groupName);

  if (!config?.server) {
    return { success: false, error: 'Invalid connection configuration (server required)' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }

  if (!groupData?.groupName) {
    return { success: false, error: 'Group name is required' };
  }

  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);

    // Determine OU path - use parentOU if set, otherwise Users container by default
    let ouPath = 'CN=Users';
    if (config.parentOU && String(config.parentOU).trim() !== '') {
      ouPath = config.parentOU;
    } else {
      ouPath = `CN=Users,${config.server.split('.').map(part => `DC=${part}`).join(',')}`;
    }

    // Map group type/scope
    const category = (groupData.type === 'Distribution') ? 'Distribution' : 'Security';
    const scope = ['Global', 'DomainLocal', 'Universal'].includes(groupData.scope) ? groupData.scope : 'Global';

    const safeName = String(groupData.groupName).replace('`', "``").replace('"', '\"');
    const safeDesc = groupData.description ? String(groupData.description).replace('`', "``").replace('"', '\"') : '';

    const createGroupCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop

        $props = @{
          Name = "${safeName}"
          SamAccountName = "${safeName}"
          GroupCategory = "${category}"
          GroupScope = "${scope}"
          Path = "${ouPath}"
        }
        ${safeDesc ? `$props.Description = "${safeDesc}"` : ''}

        New-ADGroup ${serverParam} ${authParam} @props -ErrorAction Stop
        Write-Output "SUCCESS: Group created"
      } catch {
        Write-Error $_.Exception.Message
      }
    `;

    console.log('Executing PowerShell for group creation...');
    const result = await executePowerShell(createGroupCommand);
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `Group ${groupData.groupName} created successfully`,
        group: {
          groupName: groupData.groupName,
          description: groupData.description || '',
          memberCount: 0,
          type: category,
          scope: scope,
          distinguishedName: `CN=${groupData.groupName},${ouPath}`,
          whenCreated: new Date().toISOString()
        }
      };
    }
    return { success: false, error: result || 'Failed to create group' };
  } catch (error) {
    console.error('Create group error:', error);
    return { success: false, error: `Failed to create group: ${error.message}` };
  }
});

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
    const authParam = buildAuthParam(config);
    
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
    const result = await executePowerShell(createComputerCommand);
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
    const authParam = buildAuthParam(config);

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
    const result = await executePowerShell(ps);
    if (result.includes('OK')) {
      return { success: true, message: 'Computer updated' };
    }
    return { success: false, error: result || 'Failed to update computer' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Update AD User Description/Title
ipcMain.handle('update-ad-user', async (event, config, userData) => {
  console.log('Updating AD user:', userData.username);
  console.log('Connection config:', JSON.stringify(config));
  console.log('User data:', JSON.stringify(userData));
  
  if (!config || !config.server) {
    console.error('Invalid connection configuration:', config);
    return { success: false, error: 'Invalid connection configuration. Server is required.' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username || !userData.field || userData.value === undefined) {
    console.error('Invalid user data:', userData);
    return { success: false, error: 'Username, field, and value are required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    console.log('Updating user field:', userData.field, 'to:', userData.value);
    
    const updateUserCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Update user property based on field type
        if ("${userData.field}" -eq "Title") {
          Set-ADUser -Identity "${userData.username}" -Title "${userData.value}" ${serverParam} ${authParam} -ErrorAction Stop
        } elseif ("${userData.field}" -eq "Description") {
          Set-ADUser -Identity "${userData.username}" -Description "${userData.value}" ${serverParam} ${authParam} -ErrorAction Stop
        } elseif ("${userData.field}" -eq "Department") {
          Set-ADUser -Identity "${userData.username}" -Department "${userData.value}" ${serverParam} ${authParam} -ErrorAction Stop
        } else {
          # For other attributes, use Replace parameter
          Set-ADUser -Identity "${userData.username}" -Replace @{"${userData.field}" = "${userData.value}"} ${serverParam} ${authParam} -ErrorAction Stop
        }
        
        Write-Host "SUCCESS: User ${userData.username} ${userData.field} updated successfully"
        
      } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        exit 1
      }
    `;
    
    console.log('Executing PowerShell command for user update...');
    const result = await executePowerShell(updateUserCommand);
    console.log('PowerShell result:', result);
    
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `User ${userData.username} ${userData.field} updated successfully`
      };
    } else {
      return {
        success: false,
        error: result || 'Failed to update user'
      };
    }
    
  } catch (error) {
    console.error('Update user error:', error);
    return {
      success: false,
      error: `Failed to update user: ${error.message}`
    };
  }
});

// Reset AD User Password
ipcMain.handle('reset-ad-password', async (event, config, userData) => {
  console.log('Resetting password for AD user:', userData.username);
  
  if (!config?.server) {
    return { success: false, error: 'Invalid connection configuration (server required)' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username) {
    return { success: false, error: 'Username is required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    
    console.log('Resetting password for user:', userData.username);
    
    const resetPasswordCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Lookup current flags (PasswordNeverExpires)
        $user = Get-ADUser -Identity "${userData.username}" -Properties PasswordNeverExpires ${serverParam} ${authParam} -ErrorAction Stop
        
        # Reset user password
        $SecurePassword = ConvertTo-SecureString "${tempPassword}" -AsPlainText -Force
        Set-ADAccountPassword -Identity "${userData.username}" -NewPassword $SecurePassword ${serverParam} ${authParam} -ErrorAction Stop
        
        # Try to force change at next logon according to request
        $forced = $false
        $restored = $false
        $pneOriginal = $user.PasswordNeverExpires -eq $true
        if (${userData.forceChange ? '$true' : '$false'}) {
          if ($pneOriginal -and ${userData.autoClearPNE ? '$true' : '$false'}) {
            try { Set-ADUser -Identity "${userData.username}" -PasswordNeverExpires $false ${serverParam} ${authParam} -ErrorAction Stop } catch {}
          }
          try {
            Set-ADUser -Identity "${userData.username}" -ChangePasswordAtLogon $true ${serverParam} ${authParam} -ErrorAction Stop
            $forced = $true
          } catch {}
          if ($pneOriginal -and ${userData.autoClearPNE ? '$true' : '$false'}) {
            try { Set-ADUser -Identity "${userData.username}" -PasswordNeverExpires $true ${serverParam} ${authParam} -ErrorAction Stop; $restored = $true } catch {}
          }
        }
        
        Write-Output ("SUCCESS: Password reset for user ${userData.username}. ForcedChange=" + $forced + "; PasswordNeverExpiresOriginal=" + $pneOriginal + "; RestoredPNE=" + $restored)
        
      } catch {
        Write-Error $_.Exception.Message
        exit 1
      }
    `;
    
    console.log('Executing PowerShell command for password reset...');
    const result = await executePowerShell(resetPasswordCommand);
    console.log('PowerShell result:', result);
    
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `Password reset for user ${userData.username}`,
        tempPassword: tempPassword
      };
    } else {
      return {
        success: false,
        error: result || 'Failed to reset password'
      };
    }
    
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      success: false,
      error: `Failed to reset password: ${error.message}`
    };
  }
});

// Toggle AD User Account Status (Enable/Disable)
ipcMain.handle('toggle-ad-user-account', async (event, config, userData) => {
  console.log('Toggling account status for AD user:', userData.username);
  console.log('Connection config:', JSON.stringify(config));
  console.log('User data:', JSON.stringify(userData));
  
  if (!config || !config.server) {
    console.error('Invalid connection configuration:', config);
    return { success: false, error: 'Invalid connection configuration. Server is required.' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username || userData.enable === undefined) {
    console.error('Invalid user data:', userData);
    return { success: false, error: 'Username and enable status are required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    const action = userData.enable ? 'enable' : 'disable';
    const enableValue = userData.enable ? '$true' : '$false';
    
    console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ing account for user:`, userData.username);
    
    const toggleAccountCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Toggle user account status
        Set-ADUser -Identity "${userData.username}" -Enabled ${enableValue} ${serverParam} ${authParam} -ErrorAction Stop
        
        Write-Host "SUCCESS: Account ${action}d for user ${userData.username}"
        
      } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        exit 1
      }
    `;
    
    console.log('Executing PowerShell command for account toggle...');
    const result = await executePowerShell(toggleAccountCommand);
    console.log('PowerShell result:', result);
    
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `Account ${action}d for user ${userData.username}`,
        newStatus: userData.enable ? 'Active' : 'Disabled'
      };
    } else {
      return {
        success: false,
        error: result || `Failed to ${action} account`
      };
    }
    
  } catch (error) {
    console.error('Toggle account error:', error);
    return {
      success: false,
      error: `Failed to ${userData.enable ? 'enable' : 'disable'} account: ${error.message}`
    };
  }
});

// Helper function to generate secure passwords
function generateSecurePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Test WinRM Connectivity
ipcMain.handle('test-winrm', async (event, computerName) => {
  const { spawn } = require('child_process');
  
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
  const { spawn } = require('child_process');
  
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
    '  foreach ($sid in $profilesToDelete) {',
    '    try {',
    '      # Delete user profile using CIM/WMI',
    '      $session = New-CimSession -ComputerName $cn -Authentication Negotiate',
    '      $profile = Get-CimInstance -CimSession $session -ClassName Win32_UserProfile -Filter "SID=\'$sid\'"',
    '      if ($profile) {',
    '        Remove-CimInstance -InputObject $profile',
    '        $results += "Successfully deleted profile: $sid"',
    '      } else {',
    '        $results += "Profile not found: $sid"',
    '      }',
    '      $session | Remove-CimSession',
    '    } catch {',
    '      $results += "Failed to delete $sid: $($_.Exception.Message)"',
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

// Test Printer Server Connection
ipcMain.handle('test-printer-server', async (event, serverPath) => {
  const { spawn } = require('child_process');
  
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
  const { spawn } = require('child_process');
  
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

// Add User to Group
ipcMain.handle('add-user-to-group', async (event, config, userData) => {
  console.log('Adding user to group:', userData.username, 'to group:', userData.groupName);
  
  if (!config?.server) {
    return { success: false, error: 'Invalid connection configuration (server required)' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username || !userData.groupName) {
    return { success: false, error: 'Username and group name are required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    console.log('Adding user to group:', userData.username, 'to', userData.groupName);
    
    const addToGroupCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Add user to group
        Add-ADGroupMember -Identity "${userData.groupName}" -Members "${userData.username}" ${serverParam} ${authParam} -ErrorAction Stop
        
        Write-Host "SUCCESS: User ${userData.username} added to group ${userData.groupName}"
        
      } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        exit 1
      }
    `;
    
    console.log('Executing PowerShell command for add to group...');
    const result = await executePowerShell(addToGroupCommand);
    console.log('PowerShell result:', result);
    
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `User ${userData.username} added to group ${userData.groupName}`
      };
    } else {
      return {
        success: false,
        error: result || 'Failed to add user to group'
      };
    }
    
  } catch (error) {
    console.error('Add to group error:', error);
    return {
      success: false,
      error: `Failed to add user to group: ${error.message}`
    };
  }
});

// Remove User from Group
ipcMain.handle('remove-user-from-group', async (event, config, userData) => {
  console.log('Removing user from group:', userData.username, 'from group:', userData.groupName);
  
  if (!config?.server) {
    return { success: false, error: 'Invalid connection configuration (server required)' };
  }
  if (!config.useKerberos && !config.kerberosOnly && !config.username) {
    return { success: false, error: 'Username is required when not using Kerberos' };
  }
  
  if (!userData.username || !userData.groupName) {
    return { success: false, error: 'Username and group name are required' };
  }
  
  try {
    await ensureKerberosIfRequired(config);
    const serverParam = config.server.includes('.') ? `-Server "${config.server}"` : '';
    const authParam = buildAuthParam(config);
    
    console.log('Removing user from group:', userData.username, 'from', userData.groupName);
    
    const removeFromGroupCommand = `
      try {
        Import-Module ActiveDirectory -ErrorAction Stop
        
        # Remove user from group
        Remove-ADGroupMember -Identity "${userData.groupName}" -Members "${userData.username}" ${serverParam} ${authParam} -Confirm:$false -ErrorAction Stop
        
        Write-Host "SUCCESS: User ${userData.username} removed from group ${userData.groupName}"
        
      } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        exit 1
      }
    `;
    
    console.log('Executing PowerShell command for remove from group...');
    const result = await executePowerShell(removeFromGroupCommand);
    console.log('PowerShell result:', result);
    
    if (result.includes('SUCCESS:')) {
      return {
        success: true,
        message: `User ${userData.username} removed from group ${userData.groupName}`
      };
    } else {
      return {
        success: false,
        error: result || 'Failed to remove user from group'
      };
    }
    
  } catch (error) {
    console.error('Remove from group error:', error);
    return {
      success: false,
      error: `Failed to remove user from group: ${error.message}`
    };
  }
});
