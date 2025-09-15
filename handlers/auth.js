const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { executePowerShell, buildAuthParam, ensureKerberosIfRequired } = require(path.join(__dirname, '..', 'utils', 'powershell'));

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
}

module.exports = { registerAuthHandlers };