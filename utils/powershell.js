const { spawn } = require('child_process');

/**
 * Execute PowerShell commands with proper error handling
 * @param {string} command - PowerShell command to execute
 * @param {Object} options - Optional execution options
 * @param {Object} options.env - Environment variables
 * @param {boolean} options.useCredentialPrelude - Whether to add credential prelude
 * @returns {Promise<string>} - Command output
 */
function executePowerShell(command, options = {}) {
  return new Promise((resolve, reject) => {
    let finalCommand = command;
    let environment = { ...process.env };

    // Add environment variables if provided
    if (options.env) {
      environment = { ...environment, ...options.env };
    }

    // Add credential prelude if requested and credentials are provided
    if (options.useCredentialPrelude && options.env && options.env.ACTV_USER && options.env.ACTV_PASS) {
      const credentialPrelude = `
        if ($env:ACTV_USER -and $env:ACTV_PASS) {
          $ACTV_CRED = New-Object System.Management.Automation.PSCredential (
            $env:ACTV_USER,
            (ConvertTo-SecureString $env:ACTV_PASS -AsPlainText -Force)
          )
        }
      `;
      finalCommand = credentialPrelude + '\n' + command;
    }

    const ps = spawn('powershell', ['-Command', finalCommand], {
      env: environment
    });
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

/**
 * Build PowerShell AD authentication parameters based on config
 * @param {Object} config - Connection configuration
 * @returns {string} - PowerShell authentication parameters
 */
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

/**
 * Ensure Kerberos is available when required (kerberosOnly)
 * @param {Object} config - Connection configuration
 * @returns {Promise<void>}
 */
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

/**
 * Generate secure password
 * @returns {string} - Secure password
 */
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

module.exports = {
  executePowerShell,
  buildAuthParam,
  ensureKerberosIfRequired,
  generateSecurePassword
};