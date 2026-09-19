import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Search,
  Download,
  Eye,
  Trash2,
} from 'lucide-react';
import { Contact } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ConnectedSheetInfo, GoogleAccountSpace } from '../../services/googleSheets';

interface GoogleSheetsTableFormatProps {
  contacts: Contact[];
  liveRows: string[][];
  isLoadingLiveRows: boolean;
  onRefreshLiveRows?: () => void;
  selectedAccount: GoogleAccountSpace | null;
  selectedSheet: ConnectedSheetInfo | null;
  isCloudLiveMode: boolean;
  onViewContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onSyncContactToSheet?: (contact: Contact) => void;
  isSyncingContactId?: string | null;
  onBatchSyncContacts?: () => void;
  isBatchSyncing?: boolean;
  syncCount?: number;
}

const SHEET_COLUMNS = [
  { key: 'A', name: 'Full Name', field: 'name', width: 'w-48' },
  { key: 'B', name: 'Company Name', field: 'company_name', width: 'w-48' },
  { key: 'C', name: 'Designation / Title', field: 'designation', width: 'w-44' },
  { key: 'D', name: 'Mobile Numbers', field: 'mobile_numbers', width: 'w-40' },
  { key: 'E', name: 'Email Addresses', field: 'email_addresses', width: 'w-52' },
  { key: 'F', name: 'Website', field: 'website', width: 'w-40' },
  { key: 'G', name: 'Physical Address', field: 'address', width: 'w-56' },
  { key: 'H', name: 'LinkedIn', field: 'linkedin', width: 'w-36' },
  { key: 'I', name: 'Notes / Details', field: 'notes', width: 'w-60' },
  { key: 'J', name: 'Timestamp', field: 'created_at', width: 'w-36' },
];

export const GoogleSheetsTableFormat: React.FC<GoogleSheetsTableFormatProps> = ({
  contacts,
  liveRows,
  isLoadingLiveRows,
  onRefreshLiveRows,
  selectedAccount,
  selectedSheet,
  isCloudLiveMode,
  onViewContact,
  onDeleteContact,
  onSyncContactToSheet,
  isSyncingContactId,
  onBatchSyncContacts,
  isBatchSyncing,
  syncCount = 0,
}) => {
  const { t } = useLanguage();
  const { isLight } = useTheme();
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const filteredContacts = contacts.filter((c) => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.designation?.toLowerCase().includes(q) ||
      c.email_addresses?.some((e) => e.toLowerCase().includes(q)) ||
      c.mobile_numbers?.some((m) => m.includes(q)) ||
      c.address?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q)
    );
  });

  // Calculate contacts that have status "In Platform" (not yet pushed)
  const inPlatformCount = filteredContacts.filter((c) => !c.synced_to_sheets).length;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm flex flex-col border transition-all ${
        isLight
          ? 'bg-white border-slate-300 shadow-slate-200/50'
          : 'cyber-panel border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
      }`}
    >
      {/* Sheets Table Toolbar */}
      <div
        className={`p-3 sm:px-4 sm:py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`font-extrabold text-xs sm:text-sm truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {isCloudLiveMode
                  ? `Live Cloud Grid: ${selectedSheet?.title || 'Google Sheet'}`
                  : `Google Sheets Matrix View (${filteredContacts.length} Rows)`}
              </span>
              {selectedSheet && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[160px] ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {selectedSheet.title}
                </span>
              )}
            </div>
            <p className={`text-[11px] truncate mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isCloudLiveMode
                ? 'Streaming directly from Google Sheets API v4 with real row indexing'
                : `Synced records formatted identically to Google Sheets schema (Columns A–J) • ${inPlatformCount} In Platform`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Quick Filter */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder={t.contacts.filterPlaceholder}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className={`w-full sm:w-44 pl-8 pr-2.5 py-1.5 text-xs rounded-lg font-semibold focus:ring-1 focus:ring-emerald-500 ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950/80 border border-slate-750 text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Sync In Platform Contacts Button */}
          {!isCloudLiveMode && onBatchSyncContacts && (
            <button
              type="button"
              onClick={onBatchSyncContacts}
              disabled={isBatchSyncing || inPlatformCount === 0}
              className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                inPlatformCount === 0
                  ? isLight
                    ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
                    : 'bg-slate-900/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              }`}
              title={
                inPlatformCount === 0
                  ? t.contacts.allContactsSynced
                  : `${t.contacts.pushInPlatform} (${inPlatformCount})`
              }
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isBatchSyncing ? 'animate-bounce' : ''}`} />
              <span>
                {isBatchSyncing
                  ? t.contacts.pushingInPlatform
                  : inPlatformCount === 0
                  ? t.contacts.allContactsSynced
                  : `${t.contacts.pushInPlatform} (${inPlatformCount})`}
              </span>
            </button>
          )}

          {isCloudLiveMode && onRefreshLiveRows && (
            <button
              type="button"
              onClick={onRefreshLiveRows}
              disabled={isLoadingLiveRows}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1 border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100'
              }`}
            >
              <RefreshCw className={`w-3 h-3 text-emerald-500 ${isLoadingLiveRows ? 'animate-spin' : ''}`} />
              <span>{isLoadingLiveRows ? t.common.loading : t.common.refresh}</span>
            </button>
          )}

          {selectedSheet?.url && (
            <a
              href={selectedSheet.url}
              target="_blank"
              rel="noreferrer"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1 border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                  : 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <span>{t.sheets.openInBrowser}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Mobile Swipe Notice */}
      <div
        className={`block sm:hidden px-3 py-1 text-[10px] font-semibold flex items-center justify-between border-b ${
          isLight
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
            : 'bg-emerald-950/60 border-emerald-900/50 text-emerald-300'
        }`}
      >
        <span>↔ Swipe horizontally to view all spreadsheet columns</span>
      </div>

      {/* Grid Container with horizontal scroll */}
      <div
        className={`overflow-x-auto max-h-[620px] divide-y ${
          isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800 bg-slate-950/90'
        }`}
      >
        {isCloudLiveMode ? (
          /* Live Google Sheets Cloud Rows */
          isLoadingLiveRows ? (
            <div className={`py-16 flex flex-col items-center justify-center space-y-2 text-xs font-semibold ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
              <span>Fetching live rows from Google Sheets API...</span>
            </div>
          ) : liveRows.length === 0 ? (
            <div className={`py-16 text-center text-xs space-y-2 font-medium ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              <p>No rows found in this Google Sheet tab or sheet is currently empty.</p>
              {selectedSheet && (
                <a
                  href={selectedSheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold text-xs"
                >
                  <span>Open Sheet in browser</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                {/* Google Sheets Column Letters header */}
                <tr className={`text-[10px] font-mono font-bold border-b select-none ${
                  isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  <th className={`py-1.5 px-3 w-12 text-center border-r ${
                    isLight ? 'bg-slate-300/80 text-cyan-900 border-slate-300' : 'bg-slate-950 text-cyan-400 border-slate-800'
                  }`}>#</th>
                  {liveRows[0]?.map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className={`py-1.5 px-3 border-r text-center uppercase tracking-wider ${
                        isLight ? 'border-slate-300 text-slate-800' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + (colIdx % 26))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-850'}`}>
                {liveRows.map((row, rowIdx) => {
                  const isHeader = rowIdx === 0;
                  return (
                    <tr
                      key={rowIdx}
                      className={`${
                        isHeader
                          ? isLight
                            ? 'bg-slate-100 font-extrabold text-slate-900 border-b-2 border-slate-300'
                            : 'bg-slate-900 font-bold text-cyan-300 border-b-2 border-slate-750'
                          : isLight
                          ? 'hover:bg-emerald-50 text-slate-900 font-medium transition-colors'
                          : 'hover:bg-emerald-950/20 text-slate-300 transition-colors'
                      }`}
                    >
                      <td className={`py-2 px-2.5 text-center font-mono text-[10px] border-r select-none font-bold ${
                        isLight ? 'text-slate-600 bg-slate-50 border-slate-300' : 'text-slate-500 bg-slate-950 border-slate-800'
                      }`}>
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          onClick={() => handleCopy(cell, `live-${rowIdx}-${cIdx}`)}
                          className={`py-2 px-3 border-r truncate max-w-[220px] cursor-pointer transition-colors ${
                            isLight ? 'border-slate-200 hover:bg-emerald-100/60' : 'border-slate-800/80 hover:bg-emerald-950/40'
                          }`}
                          title="Click to copy cell value"
                        >
                          <div className="flex items-center justify-between space-x-1">
                            <span className="truncate">{cell || '-'}</span>
                            {copiedCell === `live-${rowIdx}-${cIdx}` && (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          /* Standard CRM Formatted as Google Sheets Matrix */
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              {/* Column Letters row */}
              <tr className={`text-[10px] font-mono font-bold border-b select-none ${
                isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <th className={`py-1 px-2.5 w-12 text-center border-r ${
                  isLight ? 'bg-slate-300/80 text-cyan-900 border-slate-300' : 'bg-slate-950 text-cyan-400 border-slate-800'
                }`}>#</th>
                {SHEET_COLUMNS.map((col) => (
                  <th key={col.key} className={`py-1 px-3 border-r text-center ${
                    isLight ? 'border-slate-300 text-slate-800' : 'border-slate-800 text-slate-400'
                  }`}>
                    {col.key}
                  </th>
                ))}
                <th className={`py-1 px-3 text-center ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-900 text-slate-400'}`}>
                  Actions
                </th>
              </tr>
              {/* Column Labels Header */}
              <tr className={`border-b text-[11px] font-extrabold ${
                isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}>
                <th className={`py-2 px-2.5 text-center border-r ${
                  isLight ? 'bg-slate-200 text-cyan-900 border-slate-300' : 'bg-slate-950 text-cyan-400 border-slate-800'
                }`}>Row</th>
                {SHEET_COLUMNS.map((col) => (
                  <th key={col.key} className={`py-2 px-3 border-r ${col.width} ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <span>{col.name}</span>
                    </div>
                  </th>
                ))}
                <th className="py-2 px-3 text-right">Row Operations</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-850'}`}>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-xs">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto px-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
                        isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      }`}>
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          No Synced Google Sheets Contacts
                        </p>
                        <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {inPlatformCount > 0
                            ? `You have ${inPlatformCount} contact${inPlatformCount === 1 ? '' : 's'} with status "In Platform" ready to push to ${selectedSheet?.title || 'Google Sheets'}. Click below to push only In-Platform contacts.`
                            : 'All contacts are synced to Google Sheets, or scan a new business card to push it.'}
                        </p>
                      </div>
                      {onBatchSyncContacts && (
                        <button
                          type="button"
                          onClick={onBatchSyncContacts}
                          disabled={isBatchSyncing || inPlatformCount === 0}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                            inPlatformCount === 0
                              ? isLight
                                ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
                                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          }`}
                        >
                          <UploadCloud className={`w-3.5 h-3.5 ${isBatchSyncing ? 'animate-bounce' : ''}`} />
                          <span>
                            {isBatchSyncing
                              ? 'Pushing In Platform...'
                              : inPlatformCount === 0
                              ? 'All Contacts Synced'
                              : `Push In Platform (${inPlatformCount})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact, idx) => {
                  const isSyncingThis = isSyncingContactId === contact.id;
                  const rowNumber = idx + 2; // Row 1 is header
                  return (
                    <tr
                      key={contact.id}
                      className={`transition-colors group text-xs ${
                        isLight ? 'hover:bg-emerald-50/70 text-slate-900' : 'hover:bg-emerald-950/20 text-slate-300'
                      }`}
                    >
                      {/* Row Index */}
                      <td className={`py-2.5 px-2.5 text-center font-mono text-[10px] border-r select-none font-bold ${
                        isLight ? 'text-slate-600 bg-slate-50 border-slate-300' : 'text-slate-500 bg-slate-950 border-slate-800'
                      }`}>
                        {rowNumber}
                      </td>

                      {/* A: Full Name */}
                      <td
                        onClick={() => handleCopy(contact.name, `name-${contact.id}`)}
                        className={`py-2.5 px-3 border-r font-bold truncate max-w-[210px] cursor-pointer transition-colors ${
                          isLight
                            ? 'border-slate-200 text-slate-900 hover:bg-emerald-100/60'
                            : 'border-slate-800/80 text-slate-100 hover:bg-emerald-950/30'
                        }`}
                        title="Click to copy name"
                      >
                        <div className="flex items-center justify-between space-x-1.5">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="truncate">{contact.name || 'Unnamed'}</span>
                            {contact.synced_to_sheets ? (
                              <span
                                className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                                  isLight
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                Synced
                              </span>
                            ) : (
                              <span
                                className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                                  isLight
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                In Platform
                              </span>
                            )}
                          </div>
                          {copiedCell === `name-${contact.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* B: Company */}
                      <td
                        onClick={() => handleCopy(contact.company_name, `comp-${contact.id}`)}
                        className={`py-2.5 px-3 border-r font-bold truncate max-w-[190px] cursor-pointer transition-colors ${
                          isLight ? 'border-slate-200 text-slate-900 hover:bg-emerald-100/60' : 'border-slate-800/80 text-slate-200 hover:bg-emerald-950/30'
                        }`}
                      >
                        <span className="truncate">{contact.company_name || '-'}</span>
                      </td>

                      {/* C: Designation */}
                      <td className={`py-2.5 px-3 border-r font-medium truncate max-w-[170px] ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-400'
                      }`}>
                        <span className="truncate">{contact.designation || '-'}</span>
                      </td>

                      {/* D: Phone */}
                      <td
                        onClick={() => handleCopy(contact.mobile_numbers[0] || '', `phone-${contact.id}`)}
                        className={`py-2.5 px-3 border-r font-mono text-[11px] font-bold truncate max-w-[160px] cursor-pointer transition-colors ${
                          isLight ? 'border-slate-200 text-slate-900 hover:bg-emerald-100/60' : 'border-slate-800/80 text-slate-300 hover:bg-emerald-950/30'
                        }`}
                      >
                        <span>{contact.mobile_numbers.join(', ') || '-'}</span>
                      </td>

                      {/* E: Email */}
                      <td
                        onClick={() => handleCopy(contact.email_addresses[0] || '', `email-${contact.id}`)}
                        className={`py-2.5 px-3 border-r text-[11px] font-bold truncate max-w-[200px] cursor-pointer transition-colors ${
                          isLight ? 'border-slate-200 text-indigo-700 hover:bg-emerald-100/60' : 'border-slate-800/80 text-cyan-400 hover:bg-emerald-950/30'
                        }`}
                      >
                        <span className="truncate">{contact.email_addresses.join(', ') || '-'}</span>
                      </td>

                      {/* F: Website */}
                      <td className={`py-2.5 px-3 border-r text-[11px] font-medium truncate max-w-[160px] ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-400'
                      }`}>
                        <span>{contact.website || '-'}</span>
                      </td>

                      {/* G: Address */}
                      <td className={`py-2.5 px-3 border-r text-[11px] font-medium truncate max-w-[220px] ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-400'
                      }`}>
                        <span>{contact.address || '-'}</span>
                      </td>

                      {/* H: LinkedIn */}
                      <td className={`py-2.5 px-3 border-r text-[11px] font-medium truncate max-w-[140px] ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-400'
                      }`}>
                        <span>{contact.linkedin || '-'}</span>
                      </td>

                      {/* I: Notes */}
                      <td className={`py-2.5 px-3 border-r text-[11px] font-medium truncate max-w-[240px] ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-500'
                      }`}>
                        <span>{contact.notes || contact.other_details || '-'}</span>
                      </td>

                      {/* J: Timestamp */}
                      <td className={`py-2.5 px-3 border-r text-[10px] font-medium whitespace-nowrap ${
                        isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-500'
                      }`}>
                        {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {onSyncContactToSheet && (
                            <button
                              onClick={() => onSyncContactToSheet(contact)}
                              disabled={isSyncingThis}
                              title={contact.synced_to_sheets ? 'Re-sync contact to Google Sheet' : 'Sync contact directly to Google Sheet'}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                contact.synced_to_sheets
                                  ? isLight
                                    ? 'bg-slate-100 hover:bg-emerald-100 text-slate-800 border border-slate-300'
                                    : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-300 border border-slate-700'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                              }`}
                            >
                              <UploadCloud className={`w-3 h-3 ${isSyncingThis ? 'animate-bounce' : ''}`} />
                              <span>
                                {isSyncingThis
                                  ? 'Syncing...'
                                  : contact.synced_to_sheets
                                  ? 'Re-sync'
                                  : 'Sync to Sheet'}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => onViewContact(contact)}
                            title="Inspect & Edit Contact"
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isLight ? 'bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-900 border border-slate-200' : 'bg-slate-800 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteContact(contact.id)}
                            title="Delete Contact"
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer Status */}
      <div
        className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between text-[11px] ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center space-x-3">
          <span>
            Showing <strong className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-200'}>{filteredContacts.length}</strong> records
          </span>
          {selectedAccount && (
            <span className="flex items-center space-x-1">
              <span>Account:</span>
              <strong className={isLight ? 'text-emerald-900 font-extrabold' : 'text-cyan-300'}>{selectedAccount.email}</strong>
            </span>
          )}
          {selectedSheet && (
            <span className={`flex items-center space-x-1 font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Target Sheet: {selectedSheet.title}</span>
            </span>
          )}
        </div>
        <div className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          Click any cell to copy value • Real-time 2-way sync enabled
        </div>
      </div>
    </div>
  );
};
