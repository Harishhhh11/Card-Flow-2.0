import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'dark' | 'light' | 'cyber-obsidian' | 'neon-matrix' | 'deep-space' | 'titanium-slate';

interface ThemeContextType {
  theme: AppTheme;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: AppTheme) => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
  cycleTheme: () => void;
  toggleTheme: () => void;
  themeConfig: {
    name: string;
    label: string;
    bgClass: string;
    accentColor: string;
    glowColor: string;
  };
}

const THEME_CONFIGS: Record<AppTheme, { name: string; label: string; bgClass: string; accentColor: string; glowColor: string }> = {
  'dark': {
    name: 'dark',
    label: 'Dark Theme',
    bgClass: 'bg-[#080C16]',
    accentColor: 'indigo',
    glowColor: 'rgba(99, 102, 241, 0.4)',
  },
  'light': {
    name: 'light',
    label: 'Light Theme',
    bgClass: 'bg-[#F8FAFC]',
    accentColor: 'indigo',
    glowColor: 'rgba(99, 102, 241, 0.15)',
  },
  'cyber-obsidian': {
    name: 'cyber-obsidian',
    label: 'Obsidian Neon',
    bgClass: 'bg-[#080C16]',
    accentColor: 'indigo',
    glowColor: 'rgba(99, 102, 241, 0.4)',
  },
  'neon-matrix': {
    name: 'neon-matrix',
    label: 'Cyber Matrix',
    bgClass: 'bg-[#040D0A]',
    accentColor: 'emerald',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  'deep-space': {
    name: 'deep-space',
    label: 'Cosmic Nebula',
    bgClass: 'bg-[#0A071B]',
    accentColor: 'purple',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  'titanium-slate': {
    name: 'titanium-slate',
    label: 'Titanium Slate',
    bgClass: 'bg-[#0F172A]',
    accentColor: 'cyan',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('cardflow_ui_theme') as AppTheme;
    if (saved && THEME_CONFIGS[saved]) {
      return saved;
    }
    return 'cyber-obsidian';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('cardflow_ui_theme', newTheme);
  };

  const setThemeMode = (mode: 'dark' | 'light') => {
    if (mode === 'light') {
      setTheme('light');
    } else {
      // Revert to dark theme (or obsidian if previous was light)
      setTheme('cyber-obsidian');
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('cyber-obsidian');
    } else {
      setTheme('light');
    }
  };

  const cycleTheme = () => {
    const themeKeys: AppTheme[] = ['cyber-obsidian', 'neon-matrix', 'deep-space', 'titanium-slate', 'light'];
    const currentIndex = themeKeys.indexOf(theme);
    const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
    setTheme(nextTheme);
  };

  const isLight = theme === 'light';
  const isDark = !isLight;

  useEffect(() => {
    // Add theme class to html/body for root level effects
    document.documentElement.classList.remove(
      'dark',
      'light',
      'theme-light',
      'theme-dark',
      'theme-cyber-obsidian',
      'theme-neon-matrix',
      'theme-deep-space',
      'theme-titanium-slate'
    );

    if (isLight) {
      document.documentElement.classList.add('theme-light', 'light');
    } else {
      document.documentElement.classList.add('dark', `theme-${theme}`);
    }
  }, [theme, isLight]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight,
        isDark,
        setTheme,
        setThemeMode,
        cycleTheme,
        toggleTheme,
        themeConfig: THEME_CONFIGS[theme] || THEME_CONFIGS['cyber-obsidian'],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
