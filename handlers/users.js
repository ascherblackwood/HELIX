const { ipcMain } = require('electron');
const path = require('path');
const { executePowerShell, buildAuthParam, ensureKerberosIfRequired, generateSecurePassword } = require(path.join(__dirname, '..', 'utils', 'powershell'));

/**
 * Register user management-related IPC handlers
 */
function registerUserHandlers() {
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
}

module.exports = { registerUserHandlers };