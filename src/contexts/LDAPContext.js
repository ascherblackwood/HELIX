import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LDAPContext = createContext();

export const useLDAP = () => {
  const context = useContext(LDAPContext);
  if (!context) {
    throw new Error('useLDAP must be used within a LDAPProvider');
  }
  return context;
};

// Load saved connection settings (excluding password)
const loadSavedConfig = () => {
  try {
    const saved = localStorage.getItem('ctrl-connection-config');
    if (saved) {
      const parsedConfig = JSON.parse(saved);
      // Always ensure password is empty for security
      return {
        ...parsedConfig,
        password: ''
      };
    }
  } catch (error) {
    console.warn('Failed to load saved connection config:', error);
  }
  
  // Default configuration - SECURE LDAPS by default
  return {
    server: 'dc1.domain.local',
    port: 636,  // LDAPS (secure) instead of 389 (plaintext)
    username: 'admin@domain.local',
    password: '',
    parentOU: '',
    useKerberos: false,
    useSSL: true  // Enforce SSL/TLS encryption
  };
};

// Save connection settings (excluding password)
const saveConnectionConfig = (config) => {
  try {
    const configToSave = {
      server: config.server,
      port: config.port,
      username: config.username,
      parentOU: config.parentOU,
      useKerberos: config.useKerberos,
      useSSL: config.useSSL || (config.port === 636)  // Auto-enable SSL for port 636
      // Explicitly exclude password
    };
    localStorage.setItem('ctrl-connection-config', JSON.stringify(configToSave));
  } catch (error) {
    console.warn('Failed to save connection config:', error);
  }
};

export const LDAPProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState(loadSavedConfig());
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async (config) => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.connectToLDAP(config);
      if (result.success) {
        setIsConnected(true);
        setConnectionConfig(config);
        // Save connection settings (excluding password) for next time
        saveConnectionConfig(config);
        setAuthInfo({
          authMethod: result.authMethod,
          parentOU: result.parentOU,
          securityContext: result.securityContext,
          message: result.message
        });
        return { success: true, authInfo: result };
      } else {
        setError(result.error);
        setIsConnected(false);
        setAuthInfo(null);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const parseAdDateToDate = (val) => {
    try {
      if (!val) return 'Never';
      if (typeof val === 'string') {
        const m = val.match(/\/Date\((\d+)\)\//);
        if (m) {
          const ms = parseInt(m[1], 10);
          const d = new Date(ms);
          if (!isNaN(d)) return d;
        }
        const d = new Date(val);
        if (!isNaN(d)) return d;
      } else if (typeof val === 'number') {
        // Possibly Windows FILETIME ticks or epoch ms
        if (val > 116444736000000000) { // FILETIME ticks
          const ms = (val - 116444736000000000) / 10000;
          const d = new Date(ms);
          if (!isNaN(d)) return d;
        } else if (val > 1e10) {
          const d = new Date(val);
          if (!isNaN(d)) return d;
        }
      } else if (typeof val === 'object') {
        if (val.DateTime) {
          const d = new Date(val.DateTime);
          if (!isNaN(d)) return d;
        }
      }
    } catch (_) {}
    return null;
  };

  const formatDateLocal = (date) => {
    try { return date ? new Date(date).toLocaleString() : 'Never'; } catch { return 'Unknown'; }
  };

  const relativeTime = (date) => {
    if (!date) return '';
    const now = Date.now();
    const diffMs = now - new Date(date).getTime();
    if (diffMs < 0) return 'in the future';
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min===1?'':'s'} ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hour${hrs===1?'':'s'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days===1?'':'s'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months===1?'':'s'} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years===1?'':'s'} ago`;
  };

  const parseAdDate = (val) => {
    const d = parseAdDateToDate(val);
    return d ? d.toLocaleString() : 'Never';
  };

  const toISOOrNull = (val) => {
    try {
      const d = parseAdDateToDate(val);
      if (d && d instanceof Date && !isNaN(d)) return d.toISOString();
    } catch (_) {}
    return null;
  };

  const isValidDN = (dn) => /^(CN|OU|DC)=.+(,(CN|OU|DC)=.+)+$/i.test(String(dn || ''));

  const computeBaseDN = (config) => {
    if (config?.parentOU && isValidDN(config.parentOU)) return config.parentOU;
    // Derive from server FQDN if possible
    try {
      if (config?.server && config.server.includes('.')) {
        const parts = config.server.split('.').map(p => `DC=${p}`).join(',');
        return parts;
      }
    } catch (_) {}
    return 'dc=domain,dc=local';
  };

  const searchUsers = useCallback(async (filter = '(objectClass=user)') => {
    if (!isConnected) {
      throw new Error('Not connected to LDAP server');
    }

    setLoading(true);
    try {
      // Use parentOU if specified, otherwise use default domain base DN
      const baseDN = computeBaseDN(connectionConfig);

      const result = await window.electronAPI.searchLDAP(connectionConfig, {
        baseDN: baseDN,
        options: {
          scope: 'sub',
          filter: filter,
          attributes: ['cn', 'sAMAccountName', 'mail', 'userAccountControl', 'givenName', 'surname', 'displayName', 'title', 'department', 'company', 'manager', 'employeeId', 'employeeType', 'office', 'phone', 'mobile', 'fax', 'streetAddress', 'city', 'state', 'postalCode', 'country', 'lastLogon', 'passwordLastSet', 'accountExpires', 'logonCount', 'memberOf', 'wWWHomePage', 'description', 'comment', 'info', 'notes', 'distinguishedName']
        }
      });

      if (result.success) {
        // Debug log raw LDAP data for any user to check description fields
        if (result.data && result.data.length > 0) {
          const firstUser = result.data[0];
          console.log('RAW LDAP DATA sample:', {
            cn: firstUser.cn,
            sAMAccountName: firstUser.sAMAccountName,
            description: firstUser.description,
            comment: firstUser.comment,
            info: firstUser.info,
            notes: firstUser.notes,
            distinguishedName: firstUser.distinguishedName,
            allKeys: Object.keys(firstUser).sort()
          });
          
          // Also log to localStorage for debugging
          try {
            const timestamp = new Date().toISOString();
            const logEntry = `${timestamp}: LDAP SAMPLE USER: ${JSON.stringify({
              cn: firstUser.cn,
              description: firstUser.description,
              comment: firstUser.comment,
              availableAttrs: Object.keys(firstUser).slice(0, 20)
            })}`;
            const existingLogs = localStorage.getItem('actv-debug-logs') || '';
            const newLogs = existingLogs + '\n' + logEntry;
            const lines = newLogs.split('\n').slice(-50);
            localStorage.setItem('actv-debug-logs', lines.join('\n'));
          } catch (e) {}
        }
        
        return result.data.map(user => ({
          // Core fields
          id: user.objectGUID || user.sAMAccountName,
          name: user.cn,
          username: user.sAMAccountName,
          email: user.mail,
          status: (user.userAccountControl & 2) ? 'Disabled' : 'Active',
          
          // Personal information
          givenName: user.givenName,
          surname: user.surname,
          displayName: user.displayName || user.cn,
          
          // Work information
          title: user.title,
          department: user.department,
          company: user.company,
          manager: user.manager,
          employeeId: user.employeeId,
          employeeType: user.employeeType,
          office: user.office,
          
          // Contact information
          phone: user.phone,
          mobile: user.mobile,
          fax: user.fax,
          
          // Location
          streetAddress: user.streetAddress,
          city: user.city,
          state: user.state,
          postalCode: user.postalCode,
          country: user.country,
          
          // Account details
          userAccountControl: user.userAccountControl,
          lastLogon: parseAdDate(user.lastLogon),
          lastLogonAt: toISOOrNull(user.lastLogon),
          lastLogonAgo: (() => { const d = parseAdDateToDate(user.lastLogon); return d ? relativeTime(d) : 'Never'; })(),
          passwordLastSet: user.passwordLastSet,
          accountExpires: user.accountExpires,
          logonCount: user.logonCount,
          
          // Group memberships
          memberOf: user.memberOf || [],
          
          // Web page and description fields for stale detection
          wWWHomePage: user.wWWHomePage,
          description: user.description || user.comment || user.info || user.notes || user.department || (user.distinguishedName ? user.distinguishedName.split(',').find(part => part.includes('OU='))?.replace('OU=', '').trim() : '') || '',
          comment: user.comment,
          info: user.info,
          notes: user.notes
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, connectionConfig]);

  const searchComputers = useCallback(async (filter = '(objectClass=computer)') => {
    if (!isConnected) {
      throw new Error('Not connected to LDAP server');
    }

    setLoading(true);
    try {
      // Use parentOU if specified, otherwise use default domain base DN
      const baseDN = computeBaseDN(connectionConfig);

      const result = await window.electronAPI.searchLDAP(connectionConfig, {
        baseDN: baseDN,
        options: {
          scope: 'sub',
          filter: filter,
          attributes: [
            'cn', 
            'operatingSystem', 
            'operatingSystemVersion',
            'lastLogonTimestamp', 
            'userAccountControl',
            'description',
            'location',
            'managedBy',
            'dNSHostName',
            'servicePrincipalName',
            'whenCreated',
            'whenChanged',
            'distinguishedName'
          ]
        }
      });

      if (result.success) {
        return result.data.map(computer => ({
          // Core fields
          id: computer.objectGUID || computer.cn,
          computerName: computer.cn,
          os: computer.operatingSystem || 'Unknown',
          osVersion: computer.operatingSystemVersion,
          // Prefer friendly date; handle PowerShell /Date(…)/ and FILETIME
          lastLogon: (() => { const d = parseAdDateToDate(computer.lastLogonDate || computer.lastLogonTimestamp); return formatDateLocal(d); })(),
          lastLogonAt: toISOOrNull(computer.lastLogonDate || computer.lastLogonTimestamp),
          lastLogonAgo: (() => { const d = parseAdDateToDate(computer.lastLogonDate || computer.lastLogonTimestamp); return d ? relativeTime(d) : 'Never'; })(),
          status: (computer.userAccountControl & 2) ? 'Disabled' : 'Active',

          // Additional information from AD
          description: computer.description || '',
          location: computer.location || '',
          dnsHostName: computer.dNSHostName || '',
          managedBy: computer.managedBy || '',
          servicePrincipalNames: computer.servicePrincipalName || [],

          // Timestamps
          createdDate: computer.whenCreated ? new Date(computer.whenCreated).toLocaleDateString() : '',
          modifiedDate: computer.whenChanged ? new Date(computer.whenChanged).toLocaleDateString() : '',

          // DN/OU
          distinguishedName: computer.distinguishedName || '',
          organizationalUnit: computer.distinguishedName ? 
            computer.distinguishedName.split(',').slice(1).join(',') : '',

          // Flags
          userAccountControl: computer.userAccountControl
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, connectionConfig]);

  const searchGroups = useCallback(async (filter = '(objectClass=group)') => {
    if (!isConnected) {
      throw new Error('Not connected to LDAP server');
    }

    setLoading(true);
    try {
      // Use parentOU if specified, otherwise use default domain base DN
      const baseDN = computeBaseDN(connectionConfig);

      const result = await window.electronAPI.searchLDAP(connectionConfig, {
        baseDN: baseDN,
        options: {
          scope: 'sub',
          filter: filter,
          attributes: ['cn', 'description', 'member', 'groupType']
        }
      });

      if (result.success) {
        return result.data.map(group => ({
          id: group.objectGUID,
          groupName: group.cn,
          description: group.description || '',
          memberCount: Array.isArray(group.member) ? group.member.length : 0,
          type: group.groupType ? 'Security' : 'Distribution'
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, connectionConfig]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionConfig({
      server: '',
      port: 389,
      username: '',
      password: '',
      parentOU: '',
      useKerberos: false
    });
    setAuthInfo(null);
    setError(null);
  }, []);

  const getADCounts = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to LDAP server');
    }

    try {
      const result = await window.electronAPI.getADCounts(connectionConfig);
      if (result.success) {
        return {
          users: result.counts.users,
          computers: result.counts.computers,
          groups: result.counts.groups
        };
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isConnected, connectionConfig]);

  const getOUCounts = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to LDAP server');
    }

    try {
      // Use the search functions to get counts for the current OU
      const [users, computers, groups] = await Promise.all([
        searchUsers().catch(() => []),
        searchComputers().catch(() => []),
        searchGroups().catch(() => [])
      ]);

      return {
        users: users.length,
        computers: computers.length,
        groups: groups.length
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isConnected, searchUsers, searchComputers, searchGroups]);

  const value = {
    isConnected,
    connectionConfig,
    authInfo,
    loading,
    error,
    connect,
    disconnect,
    searchUsers,
    searchComputers,
    searchGroups,
    getADCounts,
    getOUCounts
  };

  return (
    <LDAPContext.Provider value={value}>
      {children}
    </LDAPContext.Provider>
  );
};
