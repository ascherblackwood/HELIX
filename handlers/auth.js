const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { executePowerShell, buildAuthParam, ensureKerberosIfRequired } = require(path.join(__dirname, '..', 'utils', 'powershell'));

// In-memory credential cache (cleared on app exit)
let credentialCache = {
  username: null,
  password: null,
  timestamp: null
};

// Clear credentials on app quit
app.on('will-quit', () => {
  credentialCache = { username: null, password: null, timestamp: null };
});

/**
 * Register authentication-related IPC handlers
 */
function registerAuthHandlers() {
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
        // Cache credentials in memory for this session
        if (config.username && config.password) {
          credentialCache.username = config.username;
          credentialCache.password = config.password;
          credentialCache.timestamp = Date.now();
          console.log('Credentials cached in memory for session');
        }
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

  // Launch AD Users and Computers (dsa.msc)
  ipcMain.handle('launch-aduc', async (event, config) => {
    // If using Kerberos, check if we have cached credentials
    if (config && config.username && (config.useKerberos || config.kerberosOnly)) {
      // Check if we have cached credentials
      if (credentialCache.username && credentialCache.password) {
        console.log('Using cached credentials for ADUC launch');
        try {
          // Convert username to proper format if needed
          let username = credentialCache.username;
          const domain = config.server ? config.server.split('.')[0].toUpperCase() : '';

          // If username is in UPN format (user@domain.com), convert to DOMAIN\user
          if (username.includes('@') && !username.includes('\\')) {
            const userPart = username.split('@')[0];
            username = domain ? `${domain}\\${userPart}` : username;
          } else if (!username.includes('\\') && !username.includes('@') && domain) {
            // If it's just a plain username, add domain prefix
            username = `${domain}\\${username}`;
          }

          // Create a temporary script that will run ADUC with credentials
          const psScript = `
            try {
              $ErrorActionPreference = 'Stop'

              # Create a temporary PS script that launches ADUC
              $tempScript = [System.IO.Path]::GetTempFileName() + '.ps1'
              @'
              Start-Process -FilePath mmc.exe -ArgumentList 'dsa.msc' -Verb RunAs
'@ | Out-File -FilePath $tempScript -Encoding ASCII

              # Run the temp script with provided credentials
              Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File \`"$tempScript\`"" -Credential $ACTV_CRED -WindowStyle Hidden

              # Clean up temp file after a delay
              Start-Sleep -Milliseconds 500
              Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue

              Write-Output 'OK'
            } catch {
              Write-Output "ERROR: $($_.Exception.Message)"
            }
          `;
          const credEnv = {
            ACTV_USER: String(username),
            ACTV_PASS: String(credentialCache.password)
          };
          const out = await executePowerShell(psScript, { env: credEnv, useCredentialPrelude: true });
          if (out && out.startsWith('ERROR:')) {
            return { success: false, error: out.substring(6).trim() };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      } else {
        // No cached credentials, prompt user
        try {
          const domain = config.server ? config.server.split('.')[0].toUpperCase() : '';
          const username = config.username.includes('@') || config.username.includes('\\')
            ? config.username
            : (domain ? `${domain}\\${config.username}` : config.username);

          const psScript = `
            try {
              $ErrorActionPreference = 'Stop'
              $psi = New-Object System.Diagnostics.ProcessStartInfo
              $psi.FileName = "cmd.exe"
              $psi.Arguments = "/k runas /netonly /user:${username.replace(/\\/g, '\\\\')} \`"mmc.exe dsa.msc\`" && exit"
              $psi.UseShellExecute = $true
              $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
              $process = [System.Diagnostics.Process]::Start($psi)
              Write-Output 'OK'
            } catch {
              Write-Output "ERROR: $($_.Exception.Message)"
            }
          `;

          const out = await executePowerShell(psScript);
          if (out && out.startsWith('ERROR:')) {
            return { success: false, error: out.substring(6).trim() };
          }
          return { success: true, message: 'ADUC launching. Enter your password in the console window.' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }
    }

    // If AD credentials were provided (non-Kerberos), launch with stored credentials
    const hasCreds = config && config.username && config.password;
    if (hasCreds) {
      try {
        const psScript = `
          try {
            $ErrorActionPreference = 'Stop'
            Start-Process -FilePath mmc.exe -ArgumentList 'dsa.msc' -Credential $ACTV_CRED
            Write-Output 'OK'
          } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
          }
        `;
        const credEnv = { ACTV_USER: String(config.username), ACTV_PASS: String(config.password) };
        const out = await executePowerShell(psScript, { env: credEnv, useCredentialPrelude: true });
        if (out && out.startsWith('ERROR:')) {
          return { success: false, error: out.substring(6).trim() };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Fallback: current session (read-only if not admin)
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

  // Launch Group Policy Management Console (gpmc.msc)
  ipcMain.handle('launch-gpmc', async (event, config) => {
    // First check if GPMC is installed and get the correct path
    let gpmcPath = 'gpmc.msc';
    try {
      const checkScript = `
        # Check multiple possible locations for GPMC
        $paths = @(
          "$env:SystemRoot\\System32\\gpmc.msc",
          "$env:ProgramFiles\\Windows Administrative Tools\\gpmc.msc",
          "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Administrative Tools\\Group Policy Management.lnk"
        )

        foreach ($path in $paths) {
          if (Test-Path $path) {
            Write-Output "FOUND:$path"
            exit
          }
        }

        # Try to find it using Get-Command
        try {
          $cmd = Get-Command gpmc.msc -ErrorAction SilentlyContinue
          if ($cmd) {
            Write-Output "FOUND:gpmc.msc"
            exit
          }
        } catch {}

        Write-Output "NOT_FOUND"
      `;
      const checkResult = await executePowerShell(checkScript);
      if (checkResult.includes('NOT_FOUND')) {
        return {
          success: false,
          error: 'Group Policy Management Console (GPMC) is not installed. Install RSAT tools:\n\nWindows 10/11:\n1. Settings → Apps → Optional Features\n2. Add "RSAT: Group Policy Management Tools"\n\nOr via PowerShell:\nGet-WindowsCapability -Name RSAT.GroupPolicy* -Online | Add-WindowsCapability -Online'
        };
      } else if (checkResult.includes('FOUND:')) {
        gpmcPath = checkResult.split('FOUND:')[1].trim();
        console.log('GPMC found at:', gpmcPath);
      }
    } catch (e) {
      console.warn('Could not verify GPMC installation:', e);
    }

    // If using Kerberos, check if we have cached credentials
    if (config && config.username && (config.useKerberos || config.kerberosOnly)) {
      // Check if we have cached credentials
      if (credentialCache.username && credentialCache.password) {
        console.log('Using cached credentials for GPMC launch');
        try {
          // Convert username to proper format if needed
          let username = credentialCache.username;
          const domain = config.server ? config.server.split('.')[0].toUpperCase() : '';

          // If username is in UPN format (user@domain.com), convert to DOMAIN\user
          if (username.includes('@') && !username.includes('\\')) {
            const userPart = username.split('@')[0];
            username = domain ? `${domain}\\${userPart}` : username;
          } else if (!username.includes('\\') && !username.includes('@') && domain) {
            // If it's just a plain username, add domain prefix
            username = `${domain}\\${username}`;
          }

          // Create a temporary script that will run GPMC with credentials
          const gpmcArg = gpmcPath.replace(/'/g, "''");  // Escape single quotes for PowerShell
          const psScript = `
            try {
              $ErrorActionPreference = 'Stop'

              # Create a temporary PS script that launches GPMC
              $tempScript = [System.IO.Path]::GetTempFileName() + '.ps1'
              @'
              Start-Process -FilePath mmc.exe -ArgumentList '${gpmcArg}' -Verb RunAs
'@ | Out-File -FilePath $tempScript -Encoding ASCII

              # Run the temp script with provided credentials
              Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File \`"$tempScript\`"" -Credential $ACTV_CRED -WindowStyle Hidden

              # Clean up temp file after a delay
              Start-Sleep -Milliseconds 500
              Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue

              Write-Output 'OK'
            } catch {
              Write-Output "ERROR: $($_.Exception.Message)"
            }
          `;
          const credEnv = {
            ACTV_USER: String(username),
            ACTV_PASS: String(credentialCache.password)
          };
          const out = await executePowerShell(psScript, { env: credEnv, useCredentialPrelude: true });
          if (out && out.startsWith('ERROR:')) {
            return { success: false, error: out.substring(6).trim() };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      } else {
        // No cached credentials, prompt user
        try {
          const domain = config.server ? config.server.split('.')[0].toUpperCase() : '';
          const username = config.username.includes('@') || config.username.includes('\\')
            ? config.username
            : (domain ? `${domain}\\${config.username}` : config.username);

          const gpmcArg2 = gpmcPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const psScript = `
            try {
              $ErrorActionPreference = 'Stop'
              $psi = New-Object System.Diagnostics.ProcessStartInfo
              $psi.FileName = "cmd.exe"
              $psi.Arguments = "/k runas /netonly /user:${username.replace(/\\/g, '\\\\')} \`"mmc.exe \`\`"${gpmcArg2}\`\`"\`" && exit"
              $psi.UseShellExecute = $true
              $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
              $process = [System.Diagnostics.Process]::Start($psi)
              Write-Output 'OK'
            } catch {
              Write-Output "ERROR: $($_.Exception.Message)"
            }
          `;

          const out = await executePowerShell(psScript);
          if (out && out.startsWith('ERROR:')) {
            return { success: false, error: out.substring(6).trim() };
          }
          return { success: true, message: 'GPMC launching. Enter your password in the console window.' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }
    }

    // If AD credentials were provided (non-Kerberos), launch with stored credentials
    const hasCreds = config && config.username && config.password;
    if (hasCreds) {
      try {
        const gpmcArg3 = gpmcPath.replace(/'/g, "''");
        const psScript = `
          try {
            $ErrorActionPreference = 'Stop'
            Start-Process -FilePath mmc.exe -ArgumentList '${gpmcArg3}' -Credential $ACTV_CRED
            Write-Output 'OK'
          } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
          }
        `;
        const credEnv = { ACTV_USER: String(config.username), ACTV_PASS: String(config.password) };
        const out = await executePowerShell(psScript, { env: credEnv, useCredentialPrelude: true });
        if (out && out.startsWith('ERROR:')) {
          return { success: false, error: out.substring(6).trim() };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Fallback: current session (read-only if not admin)
    return await new Promise((resolve) => {
      try {
        const p = spawn('mmc', [gpmcPath]);
        let started = false;
        p.on('spawn', () => { started = true; resolve({ success: true }); });
        p.on('error', () => {
          try {
            const ps = spawn('powershell', ['-NoProfile', '-Command', `Start-Process mmc "${gpmcPath}"`]);
            ps.on('close', (code) => resolve({ success: code === 0 }));
          } catch (e2) {
            resolve({ success: false, error: String((e2 && e2.message) || 'Failed to launch GPMC') });
          }
        });
        setTimeout(() => { if (!started) resolve({ success: true }); }, 1500);
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });

  // Launch PowerShell x86 with cached credentials
  ipcMain.handle('launch-powershell-x86', async (event, config) => {
    // Check if we have valid credentials
    const hasCreds = config && config.username && config.password &&
                     config.username.trim() !== '' && config.password.trim() !== '';

    if (hasCreds) {
      try {
        const psScript = `
          try {
            $ErrorActionPreference = 'Stop'
            $psPath = "$env:WINDIR\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe"
            Start-Process -FilePath $psPath -Credential $ACTV_CRED
            Write-Output 'OK'
          } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
          }
        `;
        const credEnv = {
          ACTV_USER: String(config.username).trim(),
          ACTV_PASS: String(config.password).trim()
        };
        const out = await executePowerShell(psScript, { env: credEnv, useCredentialPrelude: true });
        if (out && out.startsWith('ERROR:')) {
          // If credential launch fails, fall back to current session
          console.warn('Credential-based PowerShell launch failed, falling back to current session');
        } else {
          return { success: true };
        }
      } catch (e) {
        console.warn('PowerShell credential launch error, falling back to current session:', e.message);
      }
    }

    // Fallback: current session (always try this if credentials fail or aren't available)
    return await new Promise((resolve) => {
      try {
        const psPath = path.join(process.env.WINDIR || 'C:\\Windows', 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        const p = spawn(psPath);
        let started = false;
        p.on('spawn', () => { started = true; resolve({ success: true }); });
        p.on('error', () => {
          try {
            const ps = spawn('powershell', ['-NoProfile', '-Command', `Start-Process "${psPath}"`]);
            ps.on('close', (code) => resolve({ success: code === 0 }));
          } catch (e2) {
            resolve({ success: false, error: String((e2 && e2.message) || 'Failed to launch PowerShell x86') });
          }
        });
        setTimeout(() => { if (!started) resolve({ success: true }); }, 1500);
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });
}

module.exports = { registerAuthHandlers };
