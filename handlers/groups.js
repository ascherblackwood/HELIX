const { ipcMain } = require('electron');
const path = require('path');
const { executePowerShell, buildAuthParam, ensureKerberosIfRequired } = require(path.join(__dirname, '..', 'utils', 'powershell'));

/**
 * Register group management-related IPC handlers
 */
function registerGroupHandlers() {
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
}

/**
 * Helper function to build hierarchical OU tree
 * @param {Array} ouObjects - Flat array of OU objects
 * @returns {Array} - Hierarchical tree structure
 */
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

module.exports = { registerGroupHandlers };