import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const themes = {
  earth: {
    name: 'Earth',
    icon: '🌍',
    description: 'Grounded and natural tones',
    colors: {
      primary: {
        50: '#f0f9f0',
        100: '#dcf2dc',
        200: '#bce4bc',
        300: '#8fd08f',
        400: '#5bb55b',
        500: '#369936',
        600: '#2a7b2a',
        700: '#226222',
        800: '#1f4e1f',
        900: '#1a401a',
      },
      secondary: {
        50: '#faf8f3',
        100: '#f4f0e6',
        200: '#e8dfc4',
        300: '#d9c99e',
        400: '#c7b176',
        500: '#b89968',
        600: '#a68655',
        700: '#8a6d47',
        800: '#71583d',
        900: '#5c4632',
      },
      accent: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
      },
      background: '#faf8f3',
      surface: '#ffffff',
      text: {
        primary: '#1a401a',
        secondary: '#5c4632',
        muted: '#8a6d47'
      },
      border: '#e8dfc4'
    }
  },
  air: {
    name: 'Air',
    icon: '💨',
    description: 'Light and airy blues and whites',
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
      secondary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      },
      accent: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
      background: '#f8fafc',
      surface: '#ffffff',
      text: {
        primary: '#0f172a',
        secondary: '#334155',
        muted: '#64748b'
      },
      border: '#e2e8f0'
    }
  },
  fire: {
    name: 'Fire',
    icon: '🔥',
    description: 'Warm reds, oranges, and golds',
    colors: {
      primary: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      secondary: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
      },
      accent: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },
      background: '#fff7ed',
      surface: '#ffffff',
      text: {
        primary: '#7f1d1d',
        secondary: '#9a3412',
        muted: '#c2410c'
      },
      border: '#fed7aa'
    }
  },
  water: {
    name: 'Water',
    icon: '🌊',
    description: 'Cool blues, teals, and aqua tones',
    colors: {
      primary: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63',
      },
      secondary: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
      },
      accent: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      background: '#f0fdfa',
      surface: '#ffffff',
      text: {
        primary: '#164e63',
        secondary: '#0f766e',
        muted: '#0d9488'
      },
      border: '#99f6e4'
    }
  },
  parchment: {
    name: 'Parchment',
    icon: '📜',
    description: 'Vintage paper and ink tones',
    colors: {
      primary: {
        50: '#faf5f0',
        100: '#f4e6d7',
        200: '#e8ccae',
        300: '#daab7e',
        400: '#cc8a56',
        500: '#c2733e',
        600: '#b45d33',
        700: '#95462b',
        800: '#783a28',
        900: '#623123',
      },
      secondary: {
        50: '#f9f7f4',
        100: '#f0ede7',
        200: '#e0d9ce',
        300: '#cdc0ac',
        400: '#b5a387',
        500: '#a0906f',
        600: '#8b7355',
        700: '#726048',
        800: '#5e4f3d',
        900: '#4d4134',
      },
      accent: {
        50: '#f8f6f0',
        100: '#ede6d3',
        200: '#dccbaa',
        300: '#c7a975',
        400: '#b68d4c',
        500: '#a8763b',
        600: '#925e30',
        700: '#7a4d2b',
        800: '#654028',
        900: '#543522',
      },
      background: '#faf5f0',
      surface: '#ffffff',
      text: {
        primary: '#543522',
        secondary: '#654028',
        muted: '#7a4d2b'
      },
      border: '#e0d9ce'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('air');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('phelon-theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document root
    const theme = themes[currentTheme];
    const root = document.documentElement;
    
    // Set CSS custom properties for the current theme
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });
    
    Object.entries(theme.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--color-secondary-${key}`, value);
    });
    
    Object.entries(theme.colors.accent).forEach(([key, value]) => {
      root.style.setProperty(`--color-accent-${key}`, value);
    });
    
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-muted', theme.colors.text.muted);
    
    // Save theme to localStorage
    localStorage.setItem('phelon-theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={`theme-${currentTheme}`} style={{
        backgroundColor: themes[currentTheme].colors.background,
        minHeight: '100vh',
        transition: 'background-color 0.3s ease'
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};