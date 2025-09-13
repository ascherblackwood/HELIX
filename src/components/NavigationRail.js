import React from 'react';
import {
  CogIcon,
  UsersIcon,
  ComputerDesktopIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ServerIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import {
  CogIcon as CogIconSolid,
  UsersIcon as UsersIconSolid,
  ComputerDesktopIcon as ComputerDesktopIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ServerIcon as ServerIconSolid,
  BookOpenIcon as BookOpenIconSolid
} from '@heroicons/react/24/solid';
import { useTheme } from '../contexts/ThemeContext';

const navigationItems = [
  { id: 'admin', label: 'Admin', icon: ShieldCheckIcon, iconSolid: ShieldCheckIconSolid },
  { id: 'users', label: 'Users', icon: UsersIcon, iconSolid: UsersIconSolid },
  { id: 'computers', label: 'Computers', icon: ComputerDesktopIcon, iconSolid: ComputerDesktopIconSolid },
  { id: 'groups', label: 'Groups', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
  { id: 'reports', label: 'Reports', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpenIcon, iconSolid: BookOpenIconSolid },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
];

const NavigationRail = ({ currentPage, onPageChange }) => {
  const { theme } = useTheme();
  
  return (
    <div className="navigation-rail w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b themed-border">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
            style={{ backgroundColor: theme.colors.primary[600] }}
          >
            <ServerIconSolid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold themed-text-primary">Act.V</h1>
            <p className="text-sm themed-text-muted">v3.1.12 AD Console</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = currentPage === item.id ? item.iconSolid : item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`nav-item w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'nav-item-active text-white shadow-md' 
                    : 'themed-text-secondary hover:bg-gray-100'
                }`}
                style={!isActive ? { color: theme.colors.text.secondary } : {}}
              >
                <IconComponent 
                  className={`nav-icon w-5 h-5 ${isActive ? 'text-white' : ''}`} 
                  style={!isActive ? { color: theme.colors.text.muted } : {}}
                />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t themed-border">
        <div className="text-xs themed-text-muted text-center">
          <p>Version 3.3.1</p>
          <p>Build 2025.09.001</p>
        </div>
      </div>
    </div>
  );
};

export default NavigationRail;
