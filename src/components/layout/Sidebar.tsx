import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Users,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  X,
  Sparkles,
  Zap,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { NavigationTab, User, Organization } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  user: User | null;
  organization: Organization | null;
  contactCount?: number;
  leadCount?: number;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  organization,
  contactCount = 0,
  leadCount = 0,
  isOpenOnMobile = false,
  onCloseMobile,
  onOpenSettings,
  onLogout,
}) => {
  const { t } = useLanguage();
  const { isLight } = useTheme();

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: t.nav.overview, icon: LayoutDashboard },
    { id: 'scanner' as NavigationTab, label: t.nav.cardScanner, icon: ScanLine, badge: 'AI OCR', highlight: true },
    { id: 'contacts' as NavigationTab, label: t.nav.contactsCRM, icon: Users, count: contactCount },
    { id: 'integrations' as NavigationTab, label: t.nav.googleSheets, icon: FileSpreadsheet, badge: 'Cloud Sync' },
  ];

  const handleSelectTab = (tab: NavigationTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full select-none border-r relative overflow-hidden transition-colors ${
      isLight ? 'bg-white border-slate-200 shadow-xl text-slate-800' : 'bg-slate-950/90 backdrop-blur-2xl border-slate-800/80 shadow-2xl text-white'
    }`}>
      {/* Ambient background glow in sidebar */}
      {!isLight && (
        <>
          <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        </>
      )}

      {/* Brand Header */}
      <div className={`p-4 border-b flex items-center justify-between relative z-10 ${
        isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-cyan-400/40 group cursor-pointer">
            <ScanLine className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-950 rounded-full shadow-xs animate-pulse"></div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className={`font-extrabold tracking-tight text-base ${
                isLight ? 'text-slate-900' : 'bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent'
              }`}>
                CardFlow
              </span>
              <span className={`text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
              }`}>
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            </div>
            <p className={`text-[10px] font-medium tracking-tight flex items-center gap-1 ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span>Card CRM</span>
              <span>•</span>
              <span className={isLight ? 'text-indigo-600 font-bold' : 'text-indigo-400'}>Cloud Sync</span>
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className={`lg:hidden p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Organization Switcher / Banner */}
      <div className="px-3 pt-3 pb-1 relative z-10">
        <div className={`group transition-all border rounded-xl p-2.5 flex items-center justify-between cursor-pointer ${
          isLight
            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-2xs hover:border-indigo-300'
            : 'bg-slate-900/70 hover:bg-slate-900/90 hover:border-indigo-500/50 border-slate-800/90 shadow-lg'
        }`}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-indigo-950/80 border-indigo-500/30 text-cyan-400'
            }`}>
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className={`text-xs font-bold truncate transition-colors ${
                isLight ? 'text-slate-800 group-hover:text-indigo-600' : 'text-slate-200 group-hover:text-cyan-300'
              }`}>
                {organization?.name || 'CardFlow Technologies'}
              </p>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {organization?.plan || 'Enterprise'} Plan
                </p>
              </div>
            </div>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 transition-all shrink-0 ${
            isLight ? 'text-slate-400 group-hover:text-indigo-600' : 'text-slate-500 group-hover:text-cyan-400'
          }`} />
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto relative z-10">
        <div className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between ${
          isLight ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <span>{t.nav.coreWorkflows}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
            isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 text-indigo-300 border-indigo-500/20'
          }`}>4 Views</span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all min-h-[44px] cursor-pointer group ${
                isActive
                  ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 sidebar-nav-active'
                  : isLight
                  ? 'text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/80 font-bold border border-transparent hover:border-indigo-200'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900/80 font-bold border border-transparent hover:border-slate-800'
              }`}
            >
              {/* Animated Active Background */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 rounded-xl shadow-md shadow-indigo-600/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-white'
                      : isLight
                      ? 'text-slate-700 group-hover:text-indigo-600'
                      : 'text-slate-300 group-hover:text-cyan-400'
                  }`}
                />
                <span className={`tracking-tight ${isActive ? 'text-white font-extrabold' : isLight ? 'text-slate-900 group-hover:text-indigo-700 font-bold' : 'text-slate-100 group-hover:text-white font-bold'}`}>
                  {item.label}
                </span>
              </div>
              <div className="relative z-10 flex items-center space-x-1.5">
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md tracking-wider transition-colors border ${
                      isActive
                        ? 'bg-white/25 text-white border-white/40'
                        : isLight
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : 'bg-indigo-950/80 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : isLight
                        ? 'bg-slate-200 text-slate-900 border-slate-300 font-extrabold'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Divider & Settings Section */}
        <div className="pt-2">
          <div className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>Preferences & Profile</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all min-h-[44px] cursor-pointer group mt-1 ${
              isLight
                ? 'text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/80 font-bold border border-slate-200 hover:border-indigo-300'
                : 'text-slate-200 hover:text-white hover:bg-slate-900/80 font-bold border border-slate-800/80'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Settings className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-45 ${
                isLight ? 'text-indigo-600' : 'text-cyan-400'
              }`} />
              <span className={`tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Settings & Account
              </span>
            </div>
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
              isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-950/80 text-cyan-300 border-cyan-500/30'
            }`}>
              Edit Profile
            </span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer group mt-1.5 border ${
                isLight
                  ? 'bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 border-rose-200/80 font-bold'
                  : 'bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border-rose-500/30 font-bold'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Logout Session</span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase">Sign Out</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={`hidden lg:flex w-64 border-r flex-col h-screen shrink-0 z-20 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800/80'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Slider & Backdrop */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Slide-in Drawer Container */}
          <aside className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 flex flex-col transition-transform animate-in slide-in-from-left duration-300 border-r ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

