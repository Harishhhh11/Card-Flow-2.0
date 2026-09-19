import React, { useState, useEffect } from 'react';
import {
  Users,
  FileSpreadsheet,
  ScanLine,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Building2,
  ExternalLink,
  Phone,
  Mail,
  Zap,
  Check,
  Globe2,
  ArrowRight,
  TrendingUp,
  Activity,
  Cpu,
  Database,
  Radio,
} from 'lucide-react';
import { Contact, Lead, NavigationTab, Language } from '../../types';
import { getStoredSheetInfo } from '../../services/googleSheets';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface DashboardOverviewProps {
  contacts: Contact[];
  leads?: Lead[];
  onNavigate: (tab: NavigationTab) => void;
  onSelectContact?: (contact: Contact) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  contacts,
  onNavigate,
  onSelectContact,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { isLight } = useTheme();
  const [sheetInfo, setSheetInfo] = useState(() => getStoredSheetInfo());

  useEffect(() => {
    setSheetInfo(getStoredSheetInfo());
  }, []);

  const cardScanContacts = contacts.filter((c) => c.source === 'CARD_SCAN').length;
  const teluguHindiContacts = contacts.filter(
    (c) =>
      c.notes?.toLowerCase().includes('telugu') ||
      c.notes?.toLowerCase().includes('hindi') ||
      c.other_details?.includes('తెలుగు') ||
      c.other_details?.includes('हिंदी') ||
      c.name?.match(/[\u0C00-\u0C7F\u0900-\u097F]/) ||
      c.company_name?.match(/[\u0C00-\u0C7F\u0900-\u097F]/)
  ).length;

  const syncedCount = contacts.filter((c) => c.synced_to_sheets).length;

  return (
    <div className="p-3.5 sm:p-6 space-y-5 max-w-7xl mx-auto relative z-10">
      {/* Top Console Bar: Status, Quick Actions & Multi-Language Switcher */}
      <div className="cyber-panel px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-40 h-8 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            </span>
            <h2 className={`text-xs font-extrabold tracking-tight whitespace-nowrap flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400 animate-pulse" />
              <span>{t.dashboard.consoleTitle}</span>
            </h2>
            <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap border ${
              isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
            }`}>
              {t.dashboard.liveBadge}
            </span>
          </div>

          {/* Compact Language Switcher Pill */}
          <div className={`flex items-center p-0.5 rounded-xl border text-[11px] shrink-0 shadow-xs ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <Globe2 className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            {(['en', 'hi', 'te'] as Language[]).map((langKey) => (
              <button
                key={langKey}
                onClick={() => setLanguage(langKey)}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  language === langKey
                    ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {langKey === 'en' ? 'EN' : langKey === 'hi' ? 'हिन्दी' : 'తెలుగు'}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onNavigate('scanner')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 border border-indigo-400/40 transition-all shrink-0 whitespace-nowrap cursor-pointer group"
          >
            <ScanLine className="w-3.5 h-3.5 transition-transform group-hover:rotate-12 text-cyan-200" />
            <span>{t.dashboard.scanVisitingCard}</span>
            <Sparkles className="w-3 h-3 text-cyan-300" />
          </button>
          <button
            onClick={() => onNavigate('contacts')}
            className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 whitespace-nowrap shadow-xs cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 hover:text-slate-950'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-indigo-500/40 text-slate-200 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t.dashboard.viewContacts}</span>
          </button>
          <button
            onClick={() => onNavigate('integrations')}
            className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 whitespace-nowrap shadow-xs cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 hover:text-slate-950'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.dashboard.sheetsSync}</span>
          </button>
        </div>
      </div>

      {/* Small Boxes / High-Tech Metric Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Box 1: Total Contacts */}
        <div
          onClick={() => onNavigate('contacts')}
          className="cyber-panel p-4 hover:border-indigo-500/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t.dashboard.totalContacts}
            </span>
            <div className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
              isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-950/80 border-indigo-500/30 text-indigo-400'
            }`}>
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>{contacts.length}</span>
              <span className={`text-[10px] font-bold flex items-center px-1.5 py-0.5 rounded border ${
                isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
              }`}>
                <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                Live
              </span>
            </div>
            <p className={`text-[10px] truncate mt-1.5 flex items-center gap-1 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <span className="text-indigo-600 font-bold">{cardScanContacts}</span>
              <span>{t.dashboard.fromCards}</span>
            </p>
          </div>
        </div>

        {/* Box 2: OCR Accuracy & Speed */}
        <div
          onClick={() => onNavigate('scanner')}
          className="cyber-panel p-4 hover:border-cyan-500/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t.dashboard.ocrSuccess}
            </span>
            <div className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
              isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400'
            }`}>
              <ScanLine className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>99.8%</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                isLight ? 'bg-cyan-50 text-cyan-800 border-cyan-300' : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              }`}>Vision</span>
            </div>
            <p className={`text-[10px] truncate mt-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {t.dashboard.visionEngine}
            </p>
          </div>
        </div>

        {/* Box 3: Indic & Multilingual OCR */}
        <div
          onClick={() => onNavigate('contacts')}
          className="cyber-panel p-4 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t.dashboard.indicSupport}
            </span>
            <div className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
              isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-950/80 border-purple-500/30 text-purple-400'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className={`text-sm sm:text-base font-extrabold font-mono ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>తెలుగు / हिंदी</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                isLight ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-purple-950/80 text-purple-300 border-purple-500/40'
              }`}>Auto</span>
            </div>
            <p className={`text-[10px] truncate mt-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {t.dashboard.indicDescription}
            </p>
          </div>
        </div>

        {/* Box 4: Google Sheets Status */}
        <div
          onClick={() => onNavigate('integrations')}
          className="cyber-panel p-4 hover:border-emerald-500/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t.dashboard.sheetsStatus}
            </span>
            <div className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
            }`}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                {syncedCount}/{contacts.length}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className={`text-[10px] truncate mt-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {sheetInfo ? sheetInfo.title : t.dashboard.ready}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Recent Scanned Cards (7 cols) */}
        <div className="lg:col-span-7 cyber-panel flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
          }`}>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                  isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-950/80 border-indigo-500/30 text-cyan-400'
                }`}>
                  <ScanLine className="w-3.5 h-3.5" />
                </div>
                <h3 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {t.dashboard.recentCardsTitle}
                </h3>
              </div>
              <p className={`text-[10px] truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {t.dashboard.recentCardsSubtitle}
              </p>
            </div>
            <button
              onClick={() => onNavigate('contacts')}
              className={`text-xs font-bold flex items-center space-x-1 shrink-0 ml-2 group cursor-pointer ${
                isLight ? 'text-indigo-600 hover:text-indigo-800' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <span>{t.dashboard.viewDirectory}</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          {/* Minimalist Contact Item List */}
          <div className={`divide-y flex-1 ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
            {contacts.slice(0, 5).map((contact) => (
              <div
                key={contact.id}
                onClick={() => onSelectContact ? onSelectContact(contact) : onNavigate('contacts')}
                className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer gap-2 group ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/60'
                }`}
              >
                {/* Avatar & Contact Details */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl border font-bold flex items-center justify-center text-xs shrink-0 shadow-xs transition-all font-mono ${
                    isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-gradient-to-br from-indigo-900/80 to-purple-900/80 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <h4 className={`font-bold text-xs truncate transition-colors ${
                        isLight ? 'text-slate-900 group-hover:text-indigo-600' : 'text-slate-100 group-hover:text-cyan-300'
                      }`}>
                        {contact.name || 'Unnamed Contact'}
                      </h4>
                      {contact.source === 'CARD_SCAN' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {t.dashboard.cardOcr}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] truncate mt-0.5">
                      <span className={`truncate font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{contact.company_name || 'Individual'}</span>
                      {contact.designation && (
                        <>
                          <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
                          <span className={`truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{contact.designation}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Minimal Meta & Quick Actions */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {contact.mobile_numbers && contact.mobile_numbers[0] && (
                    <a
                      href={`tel:${contact.mobile_numbers[0]}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-400'
                          : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400'
                      }`}
                      title={contact.mobile_numbers[0]}
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  )}

                  {contact.email_addresses && contact.email_addresses[0] && (
                    <a
                      href={`mailto:${contact.email_addresses[0]}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-400'
                          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400'
                      }`}
                      title={contact.email_addresses[0]}
                    >
                      <Mail className="w-3 h-3" />
                    </a>
                  )}

                  {contact.synced_to_sheets ? (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center space-x-1 ${
                      isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                    }`}>
                      <Check className="w-2.5 h-2.5" />
                      <span className="hidden xs:inline">{t.dashboard.synced}</span>
                    </span>
                  ) : (
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}>
                      {t.dashboard.notSynced}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <div className={`w-10 h-10 rounded-xl border mx-auto flex items-center justify-center ${
                  isLight ? 'bg-slate-100 border-slate-200 text-indigo-600' : 'bg-slate-900 border-slate-800 text-cyan-400'
                }`}>
                  <ScanLine className="w-5 h-5" />
                </div>
                <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.dashboard.noContactsYet}</p>
                <button
                  onClick={() => onNavigate('scanner')}
                  className={`text-xs font-semibold underline cursor-pointer ${isLight ? 'text-indigo-600 hover:text-indigo-800' : 'text-cyan-400 hover:text-cyan-300'}`}
                >
                  {t.dashboard.scanFirstCard}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Google Sheets & Dual-Sided Scanner CTAs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Google Workspace & Sheets Live Status */}
          <div className="cyber-panel p-4 space-y-3">
            <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                }`}>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.dashboard.sheetsIntegrationTitle}</h3>
              </div>
              <button
                onClick={() => onNavigate('integrations')}
                className={`text-xs font-bold cursor-pointer ${isLight ? 'text-emerald-700 hover:text-emerald-900' : 'text-emerald-400 hover:text-emerald-300'}`}
              >
                {t.dashboard.configure}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`p-3 border rounded-xl space-y-1.5 shadow-2xs relative overflow-hidden ${
                isLight ? 'bg-emerald-50/80 border-emerald-200 text-slate-800' : 'bg-emerald-950/40 border-emerald-500/30 text-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs truncate ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
                    {sheetInfo ? sheetInfo.title : 'Google Cloud Workspace'}
                  </span>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    isLight ? 'bg-emerald-200/80 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {t.dashboard.active}
                  </span>
                </div>
                <p className={`text-[10px] leading-normal ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {t.dashboard.sheetsPromoText}
                </p>
                {sheetInfo?.url && (
                  <a
                    href={sheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 text-[10px] font-bold hover:underline pt-0.5 ${
                      isLight ? 'text-indigo-700 hover:text-indigo-900' : 'text-cyan-300'
                    }`}
                  >
                    <span>{t.dashboard.openSheetInBrowser}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              <div className={`flex items-center justify-between py-1.5 border-b text-[11px] ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'
              }`}>
                <span>{t.dashboard.autoSyncOnScan}</span>
                <span className={`font-bold flex items-center space-x-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <Check className="w-3 h-3" />
                  <span>{t.dashboard.enabled}</span>
                </span>
              </div>
              <div className={`flex items-center justify-between py-1.5 border-b text-[11px] ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'
              }`}>
                <span>{t.dashboard.spreadsheetCols}</span>
                <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>10 Structured Fields (A–J)</span>
              </div>
              <div className={`flex items-center justify-between py-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>{t.dashboard.authMode}</span>
                <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Google OAuth 2.0</span>
              </div>
            </div>
          </div>

          {/* Quick Scanner Launch Card */}
          <div className={`relative overflow-hidden rounded-2xl p-4 border shadow-xl space-y-3 group transition-all duration-300 ${
            isLight
              ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white border-indigo-500'
              : 'bg-gradient-to-br from-indigo-950 via-slate-950 to-neutral-950 text-white border-indigo-500/40 hover:border-indigo-400/60'
          }`}>
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
                  <ScanLine className="w-4 h-4 text-cyan-200" />
                </div>
                <h3 className="text-xs font-bold text-white">{t.dashboard.scannerPromoTitle}</h3>
              </div>
              <span className="text-[9px] bg-white/20 text-white font-extrabold px-2 py-0.5 rounded-md border border-white/30 backdrop-blur-xs">
                {t.dashboard.geminiVisionBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-100 leading-normal relative z-10">
              {t.dashboard.scannerPromoDesc}
            </p>
            <button
              onClick={() => onNavigate('scanner')}
              className="w-full py-2.5 bg-white hover:bg-slate-100 active:scale-98 text-indigo-700 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer relative z-10 group"
            >
              <ScanLine className="w-3.5 h-3.5 transition-transform group-hover:rotate-12 text-indigo-600" />
              <span>{t.dashboard.launchScanner}</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

