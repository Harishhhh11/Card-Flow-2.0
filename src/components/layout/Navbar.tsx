import React, { useEffect, useState, useRef } from 'react';
import {
  ScanLine,
  Search,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  Menu,
  Globe2,
  ArrowLeft,
  X,
  Palette,
  Layers,
  ShieldCheck,
  Smartphone,
  Laptop,
  Sun,
  Moon,
  ChevronDown,
  Check,
} from 'lucide-react';
import { NavigationTab, Language } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceIsolationModal } from './WorkspaceIsolationModal';

interface NavbarProps {
  activeTab: NavigationTab;
  onOpenScanner: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sheetsSynced?: boolean;
  onToggleMobileSidebar?: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  previousTab?: NavigationTab | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenScanner,
  searchQuery,
  onSearchChange,
  sheetsSynced = true,
  onToggleMobileSidebar,
  canGoBack = false,
  onGoBack,
  previousTab,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, isLight, isDark, setTheme, setThemeMode, themeConfig } = useTheme();
  const { workspaceScope, activeAccountEmail, deviceLabel } = useWorkspace();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard shortcut Alt + Left Arrow for navigating back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key === 'ArrowLeft') ||
        (e.key === 'Escape' && canGoBack && onGoBack)
      ) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onGoBack?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, onGoBack]);

  const getTabInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: t.navbar.dashboardTitle,
          subtitle: t.navbar.dashboardSubtitle,
        };
      case 'scanner':
        return {
          title: t.navbar.scannerTitle,
          subtitle: t.navbar.scannerSubtitle,
        };
      case 'contacts':
        return {
          title: t.navbar.contactsTitle,
          subtitle: t.navbar.contactsSubtitle,
        };
      case 'integrations':
        return {
          title: t.navbar.sheetsTitle,
          subtitle: t.navbar.sheetsSubtitle,
        };
      default:
        return {
          title: 'CardFlow AI',
          subtitle: 'Enterprise Visiting Card CRM & Cloud Sync',
        };
    }
  };

  const getPreviousTabLabel = (tab: NavigationTab | null | undefined) => {
    if (!tab) return 'Previous';
    switch (tab) {
      case 'dashboard':
        return t.nav.overview || 'Overview';
      case 'scanner':
        return t.nav.cardScanner || 'Scanner';
      case 'contacts':
        return t.nav.contactsCRM || 'Contacts';
      case 'integrations':
        return t.nav.googleSheets || 'Google Sheets';
      default:
        return 'Previous';
    }
  };

  const current = getTabInfo();

  return (
    <header className={`h-16 border-b px-3 sm:px-6 flex items-center justify-between shrink-0 select-none sticky top-0 z-40 transition-all ${
      isLight ? 'bg-white/95 border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-950/80 backdrop-blur-2xl border-slate-800/80 text-white shadow-2xl'
    }`}>
      {/* Left: Navigate Back Button (Left Arrow) + Mobile Menu + View Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden min-w-0">
        {onToggleMobileSidebar && (
          <button
            id="mobile-sidebar-toggle-btn"
            type="button"
            onClick={onToggleMobileSidebar}
            className={`lg:hidden p-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700'
            }`}
            aria-label="Open navigation menu"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-cyan-400 stroke-[2.2]" />
          </button>
        )}

        {/* Prominent Navigate to Back Button (Left Arrow) */}
        {canGoBack && onGoBack && (
          <button
            id="nav-back-button"
            type="button"
            onClick={onGoBack}
            className={`group flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-[0.97] ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border-slate-300 shadow-xs'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/40 shadow-lg shadow-black/40'
            }`}
            title={`Go back to ${getPreviousTabLabel(previousTab)} (Shortcut: Alt + ←)`}
          >
            <ArrowLeft className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1 ${
              isLight ? 'text-slate-600 group-hover:text-indigo-600' : 'text-slate-400 group-hover:text-cyan-400'
            }`} />
            <span className="hidden sm:inline font-bold tracking-tight">
              {t.navbar.backButton || 'Back'}
            </span>
            {previousTab && (
              <span className={`hidden md:inline text-[10px] font-medium border-l pl-1.5 ${
                isLight ? 'text-slate-500 border-slate-300' : 'text-slate-500 group-hover:text-cyan-300 border-slate-700 group-hover:border-cyan-500/30'
              }`}>
                {getPreviousTabLabel(previousTab)}
              </span>
            )}
          </button>
        )}

        <div className="min-w-0">
          <h1 className={`text-sm sm:text-base font-extrabold leading-tight truncate tracking-tight flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span>{current.title}</span>
          </h1>
          <p className={`text-[10px] sm:text-xs font-normal leading-tight mt-0.5 truncate hidden sm:block ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Theme Selector Dropdown (Dark Theme & Light Theme) */}
        <div className="relative" ref={themeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsThemeDropdownOpen((prev) => !prev)}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shadow-md cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-indigo-500/40 text-slate-200'
            }`}
            title="Choose Dark Theme or Light Theme"
            aria-expanded={isThemeDropdownOpen}
          >
            {isLight ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {isLight ? 'Light Mode' : 'Dark Mode'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              } ${isThemeDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Small Dropdown Menu */}
          {isThemeDropdownOpen && (
            <div
              className={`absolute left-0 sm:left-0 sm:right-auto mt-2 w-64 max-w-[90vw] rounded-xl border p-2 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 ${
                isLight
                  ? 'bg-white border-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.12)] text-slate-800'
                  : 'bg-slate-900/95 backdrop-blur-xl border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-slate-200'
              }`}
            >
              <div className={`px-2.5 py-1.5 mb-1.5 border-b flex items-center justify-between ${
                isLight ? 'border-slate-200' : 'border-slate-800/60'
              }`}>
                <span className={`text-[10px] uppercase font-extrabold tracking-wider ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Select Theme
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                }`}>
                  {isLight ? 'Light' : 'Dark'}
                </span>
              </div>

              {/* Dark Theme Option */}
              <button
                type="button"
                onClick={() => {
                  setThemeMode('dark');
                  setIsThemeDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer mb-1 ${
                  isDark
                    ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-500/40 font-bold'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-md ${isDark ? 'bg-indigo-600/30 text-indigo-400' : 'bg-slate-100 text-slate-600'}`}>
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[12px] flex items-center space-x-1.5">
                      <span>Dark Theme</span>
                    </div>
                    <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Futuristic Cyber Obsidian
                    </p>
                  </div>
                </div>
                {isDark && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>

              {/* Light Theme Option (White Theme) */}
              <button
                type="button"
                onClick={() => {
                  setThemeMode('light');
                  setIsThemeDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                  isLight
                    ? 'bg-amber-50/90 text-amber-950 border border-amber-300 font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-md ${isLight ? 'bg-amber-200/80 text-amber-800' : 'bg-slate-800 text-slate-400'}`}>
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[12px] flex items-center space-x-1.5">
                      <span>Light Theme</span>
                    </div>
                    <p className={`text-[10px] ${isLight ? 'text-amber-800/80' : 'text-slate-400'}`}>
                      Crisp Classic White CRM
                    </p>
                  </div>
                </div>
                {isLight && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
              </button>

              {/* Cyber Accents Sub-Picker (Visible when Dark mode is active) */}
              {isDark && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 px-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Dark Aesthetics</span>
                    <Palette className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {[
                      { key: 'cyber-obsidian', label: 'Obsidian', color: '#6366f1' },
                      { key: 'neon-matrix', label: 'Matrix', color: '#10b981' },
                      { key: 'deep-space', label: 'Cosmic', color: '#a855f7' },
                      { key: 'titanium-slate', label: 'Titanium', color: '#06b6d4' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setTheme(opt.key as any);
                          setIsThemeDropdownOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-left flex items-center space-x-1.5 transition-colors cursor-pointer ${
                          theme === opt.key
                            ? 'bg-slate-800 text-white font-bold border border-slate-700'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Language Selector in Navbar */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-[10px] sm:text-[11px] shrink-0 shadow-md">
          <Globe2 className="w-3 h-3 text-slate-400 ml-1.5 mr-1 hidden xs:block" />
          {(['en', 'hi', 'te'] as Language[]).map((langKey) => (
            <button
              key={langKey}
              onClick={() => setLanguage(langKey)}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                language === langKey
                  ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {langKey === 'en' ? 'EN' : langKey === 'hi' ? 'हिन्दी' : 'తెలుగు'}
            </button>
          ))}
        </div>

        {/* Global Search */}
        <div className="relative w-36 md:w-56 hidden md:block group">
          <Search className="w-3.5 h-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t.navbar.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-md"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Google Sheets Status Pill */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-full text-[11px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.navbar.sheetsLiveSync}</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        </div>

        {/* Multi-Device & Multi-Account Isolation Badge */}
        <button
          type="button"
          onClick={() => setIsWorkspaceModalOpen(true)}
          className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-md active:scale-95 ${
            activeAccountEmail
              ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
          }`}
          title="Multi-Device & Multi-Account Isolation Active • Click to view partition or switch account"
        >
          <ShieldCheck
            className={`w-3.5 h-3.5 shrink-0 ${
              activeAccountEmail ? 'text-cyan-400 animate-pulse' : 'text-emerald-400'
            }`}
          />
          <span className="hidden sm:inline truncate max-w-[120px] md:max-w-[170px]">
            {activeAccountEmail ? activeAccountEmail.split('@')[0] : deviceLabel.split('•')[0].trim()}
          </span>
          <span
            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black tracking-wider ${
              activeAccountEmail
                ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-400/40'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {activeAccountEmail ? 'User' : 'Device'}
          </span>
        </button>

        {/* Quick Action: Scan Visiting Card with Shimmer & Gradient */}
        {activeTab !== 'scanner' && (
          <button
            onClick={onOpenScanner}
            className="relative overflow-hidden inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 border border-indigo-400/40 transition-all shrink-0 cursor-pointer group"
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 pointer-events-none" />
            <ScanLine className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.navbar.scanButton}</span>
            <span className="sm:hidden">Scan</span>
            <Sparkles className="w-3 h-3 text-cyan-200" />
          </button>
        )}
      </div>

      {/* Workspace Isolation and Partition Switcher Modal */}
      <WorkspaceIsolationModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />
    </header>
  );
};


