import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Plus,
  Link as LinkIcon,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  LogOut,
  Table,
  UploadCloud,
  Check,
  Layers,
  Copy,
  Trash2,
  Star,
  User,
  ChevronRight,
  ArrowLeft,
  ShieldOff,
  Unlink,
  X,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  getAccessTokenForEmail,
  setAccessTokenForEmail,
  isUserCancelledAuth,
  isGoogleUnverifiedTesterError,
} from '../../services/firebaseAuth';
import {
  ConnectedSheetInfo,
  GoogleAccountSpace,
  getStoredGoogleAccounts,
  getActiveAccountEmail,
  setActiveAccountEmail,
  addOrUpdateAccountSpace,
  removeAccountSpace,
  addSheetToAccount,
  removeSheetFromAccount,
  setActiveSheetForAccount,
  getStoredSheetInfo,
  setStoredSheetInfo,
  createGoogleSheet,
  batchSyncContactsToSheet,
  fetchSheetRows,
} from '../../services/googleSheets';
import { Contact } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface GoogleSheetsViewProps {
  contacts: Contact[];
  onGoBack?: () => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({ contacts, onGoBack }) => {
  const { t } = useLanguage();
  const { isLight } = useTheme();
  // Multi-Account Spaces State
  const [accounts, setAccounts] = useState<GoogleAccountSpace[]>(() => getStoredGoogleAccounts());
  const [activeAccountEmail, setActiveEmailState] = useState<string | null>(() => getActiveAccountEmail());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active space derivation
  const currentAccount =
    accounts.find((a) => a.email.toLowerCase() === activeAccountEmail?.toLowerCase()) ||
    accounts[0] ||
    null;

  // Active sheet derivation for current account
  const activeSheet =
    currentAccount?.sheets.find((s) => s.id === currentAccount.activeSheetId) ||
    currentAccount?.sheets[0] ||
    null;

  // Selected sheet to preview in live table
  const [previewSheetId, setPreviewSheetId] = useState<string | null>(null);
  const currentPreviewSheet =
    currentAccount?.sheets.find((s) => s.id === (previewSheetId || activeSheet?.id)) ||
    activeSheet ||
    null;

  // Live Sheet Rows
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  // Creation & Sync state
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [customSheetId, setCustomSheetId] = useState('');
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [accountToManage, setAccountToManage] = useState<string | null>(null);

  // Sync state with storage
  const refreshAccountsFromStorage = () => {
    const updated = getStoredGoogleAccounts();
    setAccounts(updated);
    const active = getActiveAccountEmail();
    setActiveEmailState(active);
  };

  useEffect(() => {
    // Listen for auth state
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        if (authUser.email) {
          addOrUpdateAccountSpace({
            email: authUser.email,
            displayName: authUser.displayName || undefined,
            photoURL: authUser.photoURL || undefined,
          });
          setAccessTokenForEmail(authUser.email, authToken);
          refreshAccountsFromStorage();
        }
      },
      () => {
        // Auth state fallback
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Update preview sheet ID when active account changes
  useEffect(() => {
    if (activeSheet) {
      setPreviewSheetId(activeSheet.id);
    } else {
      setPreviewSheetId(null);
      setSheetRows([]);
    }
  }, [currentAccount?.email, activeSheet?.id]);

  // Fetch sheet rows when currentPreviewSheet is set
  useEffect(() => {
    if (currentPreviewSheet?.id && currentAccount) {
      const token = getAccessTokenForEmail(currentAccount.email);
      if (token) {
        loadSheetData(currentPreviewSheet.id, token);
      }
    }
  }, [currentPreviewSheet?.id, currentAccount?.email]);

  const loadSheetData = async (id: string, accessToken: string) => {
    setIsLoadingRows(true);
    try {
      const data = await fetchSheetRows(accessToken, id);
      setSheetRows(data.rows);
    } catch (err: any) {
      console.warn('Could not load sheet preview:', err);
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleConnectNewGoogleAccount = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (!result.user.email) {
        throw new Error('Google sign-in did not provide an email address.');
      }

      const email = result.user.email;
      setAccessTokenForEmail(email, result.accessToken);

      // Create or update account space
      const newSpace = addOrUpdateAccountSpace({
        email,
        displayName: result.user.displayName || undefined,
        photoURL: result.user.photoURL || undefined,
      });

      // If this account has no sheets yet, automatically generate an initial CRM sheet
      if (newSpace.sheets.length === 0) {
        try {
          await createGoogleSheet(
            result.accessToken,
            `CardFlow CRM Contacts - ${email.split('@')[0]}`,
            email
          );
        } catch (initErr) {
          console.warn('Auto-creation of initial sheet failed, will prompt user:', initErr);
        }
      }

      setActiveAccountEmail(email);
      setActiveEmailState(email);
      refreshAccountsFromStorage();

      setStatusMessage({
        text: `Connected Google Workspace account: ${email}`,
        type: 'success',
      });
    } catch (err: any) {
      if (isUserCancelledAuth(err)) {
        // User voluntarily cancelled or closed the sign-in popup
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        return;
      }
      console.error('Google Sign In failed:', err);
      if (isGoogleUnverifiedTesterError(err)) {
        setAuthError(
          'Google blocked access (Error 403: access_denied): The OAuth consent screen for this Google Cloud project is in "Testing" mode. In Testing mode, Google only permits specific test user emails added in Google Cloud Console. To allow this account, add harishsadula001@gmail.com under "Test users" in Google Cloud Console > APIs & Services > OAuth consent screen.'
        );
      } else {
        setAuthError(err.message || 'Google account sign-in could not be completed.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSwitchAccount = (email: string) => {
    setActiveAccountEmail(email);
    setActiveEmailState(email);
    const updated = getStoredGoogleAccounts();
    setAccounts(updated);
    setStatusMessage({
      text: `Switched to workspace: ${email}`,
      type: 'info',
    });
  };

  // 1. Disconnect Gmail Account (Revoke current session/token, preserve sheet references in CardFlow)
  const handleDisconnectSession = async (email: string) => {
    try {
      await logoutGoogle(email);
      setAccessTokenForEmail(email, null);
      setShowDisconnectModal(false);
      setStatusMessage({
        text: `Disconnected Google session for ${email}. Your linked sheet references are safely preserved.`,
        type: 'info',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to disconnect Google session.',
        type: 'error',
      });
    }
  };

  // 2. Remove Gmail Connection Completely (Unlink account and sheet references from CardFlow)
  const handleRemoveConnectionCompletely = async (email: string) => {
    try {
      await logoutGoogle(email);
      setAccessTokenForEmail(email, null);
      removeAccountSpace(email);
      refreshAccountsFromStorage();
      setShowDisconnectModal(false);
      setStatusMessage({
        text: `Removed ${email} and unlinked all its sheet references from CardFlow. Spreadsheets in Google Drive remain intact.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to remove Google account connection.',
        type: 'error',
      });
    }
  };

  const handleDisconnectAccount = async (email: string) => {
    setAccountToManage(email);
    setShowDisconnectModal(true);
  };

  const handleCreateSheetInCurrentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    let token = getAccessTokenForEmail(currentAccount.email);
    if (!token) {
      try {
        const res = await googleSignIn();
        token = res.accessToken;
      } catch (err: any) {
        if (!isUserCancelledAuth(err)) {
          setStatusMessage({ text: 'Please sign in to authorize sheet creation.', type: 'error' });
        }
        return;
      }
    }

    setIsCreatingSheet(true);
    const customTitle = newSheetTitle.trim() || `CardFlow CRM - ${currentAccount.email.split('@')[0]} (${new Date().toLocaleDateString()})`;
    try {
      const created = await createGoogleSheet(token, customTitle, currentAccount.email);
      refreshAccountsFromStorage();
      setPreviewSheetId(created.id);
      setShowCreateModal(false);
      setNewSheetTitle('');
      setStatusMessage({
        text: `Created new spreadsheet "${created.title}" in ${currentAccount.email}!`,
        type: 'success',
      });
      await loadSheetData(created.id, token);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to create spreadsheet in Google Sheets.',
        type: 'error',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !customSheetId.trim()) return;

    let cleanId = customSheetId.trim();
    const urlMatch = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      cleanId = urlMatch[1];
    }

    let token = getAccessTokenForEmail(currentAccount.email);
    if (!token) {
      try {
        const res = await googleSignIn();
        token = res.accessToken;
      } catch (err: any) {
        if (!isUserCancelledAuth(err)) {
          setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
        }
        return;
      }
    }

    try {
      setIsLoadingRows(true);
      const data = await fetchSheetRows(token, cleanId);
      const newSheetInfo: ConnectedSheetInfo = {
        id: cleanId,
        title: data.title || 'Connected Google Sheet',
        url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        lastSyncedAt: new Date().toISOString(),
        rowCount: data.rows.length,
        accountEmail: currentAccount.email,
      };

      addSheetToAccount(currentAccount.email, newSheetInfo);
      refreshAccountsFromStorage();
      setPreviewSheetId(cleanId);
      setSheetRows(data.rows);
      setShowLinkModal(false);
      setCustomSheetId('');
      setStatusMessage({
        text: `Added spreadsheet "${newSheetInfo.title}" to ${currentAccount.email}`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to connect. Ensure your Google account has edit permissions on this sheet.',
        type: 'error',
      });
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleSetDefaultSheet = (sheetId: string) => {
    if (!currentAccount) return;
    setActiveSheetForAccount(currentAccount.email, sheetId);
    refreshAccountsFromStorage();
    const s = currentAccount.sheets.find((item) => item.id === sheetId);
    setStatusMessage({
      text: `"${s?.title || 'Selected Sheet'}" is now the active default sheet for ${currentAccount.email}`,
      type: 'success',
    });
  };

  const handleRemoveSheet = (sheetId: string, sheetTitle: string) => {
    if (!currentAccount) return;
    if (!window.confirm(`Unlink "${sheetTitle}" from ${currentAccount.email}? (The sheet in your Google Drive will not be deleted)`)) {
      return;
    }
    removeSheetFromAccount(currentAccount.email, sheetId);
    refreshAccountsFromStorage();
    setStatusMessage({
      text: `Removed "${sheetTitle}" from account space.`,
      type: 'info',
    });
  };

  const executeBatchSync = async () => {
    if (!currentAccount || !currentPreviewSheet) {
      setStatusMessage({ text: 'Please select an account and target spreadsheet first.', type: 'error' });
      setShowConfirmSync(false);
      return;
    }

    let token = getAccessTokenForEmail(currentAccount.email);
    if (!token) {
      try {
        const res = await googleSignIn();
        token = res.accessToken;
      } catch (err: any) {
        if (!isUserCancelledAuth(err)) {
          setStatusMessage({ text: 'Please sign in to authenticate with Google.', type: 'error' });
        }
        setShowConfirmSync(false);
        return;
      }
    }

    setIsSyncing(true);
    setStatusMessage({
      text: `Writing ${contacts.length} contacts into "${currentPreviewSheet.title}" (${currentAccount.email})...`,
      type: 'info',
    });
    try {
      const res = await batchSyncContactsToSheet(
        token,
        currentPreviewSheet.id,
        contacts,
        currentAccount.email
      );
      refreshAccountsFromStorage();
      setStatusMessage({
        text: `Synchronized ${res.count} contacts into "${currentPreviewSheet.title}"!`,
        type: 'success',
      });
      await loadSheetData(currentPreviewSheet.id, token);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Sync failed. Please verify spreadsheet permissions.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
      setShowConfirmSync(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalSheetsAcrossAccounts = accounts.reduce((acc, a) => acc + (a.sheets?.length || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Main Navbar Banner */}
      <div className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-2xl p-5 transition-colors ${
        isLight
          ? 'bg-white border-emerald-300 text-slate-900 shadow-sm'
          : 'bg-slate-900/80 backdrop-blur-xl border-emerald-500/30 text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.12)]'
      }`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3.5 relative z-10">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className={`group p-2.5 border rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-emerald-50 border-slate-200 text-slate-700 hover:text-emerald-700'
                  : 'bg-slate-800/90 hover:bg-emerald-500/20 border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400'
              }`}
              title="Navigate Back"
              aria-label="Navigate Back"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-emerald-600 dark:bg-emerald-950/90 border border-emerald-500/40 text-white dark:text-emerald-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{t.sheets.hubTitle}</h2>
            </div>
            <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {t.sheets.hubSubtitle}
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative z-10 w-full sm:w-auto">
          {accounts.length > 0 && currentPreviewSheet && (
            <button
              onClick={() => setShowConfirmSync(true)}
              disabled={isSyncing || contacts.length === 0}
              className={`flex-1 sm:flex-initial px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                isSyncing || contacts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? t.sheets.syncingStatus : `${t.sheets.syncContacts} (${contacts.length})`}</span>
            </button>
          )}

          <button
            onClick={handleConnectNewGoogleAccount}
            disabled={isAuthenticating}
            className={`flex-1 sm:flex-initial px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
            }`}
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isAuthenticating ? t.common.loading : `+ ${t.sheets.addGmailBtn}`}</span>
          </button>
        </div>
      </div>

      {/* Account Spaces Tab Strip */}
      {accounts.length > 0 && (
        <div className={`border rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5 transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 backdrop-blur-md border-slate-800'
        }`}>
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 shrink-0 ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              Account Spaces:
            </span>
            {accounts.map((acc) => {
              const isActive = currentAccount?.email.toLowerCase() === acc.email.toLowerCase();
              return (
                <button
                  key={acc.email}
                  onClick={() => handleSwitchAccount(acc.email)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md border border-emerald-400/40'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {acc.photoURL ? (
                    <img
                      src={acc.photoURL}
                      alt={acc.email}
                      className="w-4 h-4 rounded-full object-cover border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {acc.email[0].toUpperCase()}
                    </div>
                  )}
                  <span className="truncate max-w-[170px]">{acc.email}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-emerald-950/60 text-emerald-200'
                        : isLight
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {acc.sheets?.length || 0} {acc.sheets?.length === 1 ? 'sheet' : 'sheets'}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToManage(acc.email);
                      setShowDisconnectModal(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setAccountToManage(acc.email);
                        setShowDisconnectModal(true);
                      }
                    }}
                    className={`p-1 -mr-1 rounded transition-colors cursor-pointer ${
                      isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/50'
                    }`}
                    title={`Disconnect or remove ${acc.email}`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 pr-2">
            <span className={`text-[11px] font-medium hidden md:inline ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {accounts.length} accounts • {totalSheetsAcrossAccounts} sheets active
            </span>
          </div>
        </div>
      )}

      {/* Notifications / Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs backdrop-blur-md animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              : 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-200 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {authError && (
        <div className="p-4 bg-amber-950/80 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-2.5 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-200">Google Account Access Notice (Error 403: access_denied)</strong>
                <p className="mt-1 text-amber-300 leading-relaxed">{authError}</p>
              </div>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-amber-400 hover:text-amber-200 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
            <span className="font-bold block text-slate-200">Why does this happen with other Google accounts?</span>
            <p className="text-slate-400">
              When a Google Cloud project requests sensitive permissions (like Google Sheets), Google restricts sign-in to the project owner and designated <strong>Test Users</strong> until the OAuth consent screen is published to Production or the emails are added to the tester list.
            </p>
            <div className="pt-1.5 flex flex-wrap gap-2">
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-[10px] space-x-1 shadow-xs"
              >
                <span>Open Google Cloud Console (OAuth Consent Screen)</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* When NO accounts are connected: Empty Onboarding state */}
      {accounts.length === 0 && (
        <div className={`rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4 shadow-sm border relative overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800 text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
        }`}>
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-xs ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
          }`}>
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Connect Your First Google Account</h3>
            <p className={`text-xs mt-1 max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Sync business card contacts into multiple spreadsheets per Gmail account. Connect your work or personal Google account now.
            </p>
          </div>

          <button
            onClick={handleConnectNewGoogleAccount}
            disabled={isAuthenticating}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-3 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isAuthenticating ? 'Opening Google Sign-In...' : 'Connect Google Sheets Account'}</span>
          </button>
        </div>
      )}

      {/* Main Workspace Layout when account is connected */}
      {currentAccount && (
        <div className="space-y-6">
          {/* Individual Account Space Header Banner */}
          <div className={`border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center space-x-3.5">
              {currentAccount.photoURL ? (
                <img
                  src={currentAccount.photoURL}
                  alt={currentAccount.email}
                  className="w-12 h-12 rounded-full border-2 border-emerald-500/40 object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm border border-emerald-400/40 shadow-sm">
                  {currentAccount.email[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className={`text-sm font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{currentAccount.displayName || 'Google Account'}</h3>
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Individual Workspace Active</span>
                  </span>
                </div>
                <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{currentAccount.email}</p>
              </div>
            </div>

            {/* Quick Actions inside this account */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ {t.sheets.createNewSheetBtn}</span>
              </button>

              <button
                onClick={() => setShowLinkModal(true)}
                className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-slate-800/90 border-slate-700 hover:bg-slate-700/90 text-slate-200'
                }`}
              >
                <LinkIcon className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>{t.sheets.linkExistingSheetBtn}</span>
              </button>

              <button
                onClick={() => {
                  setAccountToManage(currentAccount.email);
                  setShowDisconnectModal(true);
                }}
                className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300 hover:border-rose-300'
                    : 'bg-slate-800/90 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-500/40'
                }`}
                title="Disconnect session or remove this Gmail connection"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Disconnect / Remove Gmail</span>
              </button>
            </div>
          </div>

          {/* Section: Maintained Sheets in this Account */}
          <div className={`border rounded-xl p-5 shadow-xs space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 ${
                  isLight ? 'text-slate-900' : 'text-slate-200'
                }`}>
                  <span>{t.sheets.sheetsCollectionTitle}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    isLight ? 'bg-slate-100 text-emerald-700 border border-emerald-300' : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {currentAccount.sheets?.length || 0}
                  </span>
                </h3>
                <p className={`text-[11px] mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Select which sheet is the active default target for new visiting card scans, or preview and manage individual sheets.
                </p>
              </div>

              {activeSheet && (
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-xs">
                  <Star className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                  <span>{t.sheets.activeSheetBadge}: {activeSheet.title}</span>
                </span>
              )}
            </div>

            {/* Sheets Grid */}
            {currentAccount.sheets && currentAccount.sheets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {currentAccount.sheets.map((sheet) => {
                  const isDefault = currentAccount.activeSheetId === sheet.id || (!currentAccount.activeSheetId && currentAccount.sheets[0]?.id === sheet.id);
                  const isBeingPreviewed = currentPreviewSheet?.id === sheet.id;

                  return (
                    <div
                      key={sheet.id}
                      className={`border rounded-xl p-4 transition-all flex flex-col justify-between space-y-3.5 ${
                        isBeingPreviewed
                          ? isLight
                            ? 'border-emerald-500 bg-emerald-50/90 shadow-md ring-1 ring-emerald-400'
                            : 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_18px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300'
                          : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <h4 className={`text-xs font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={sheet.title}>
                              {sheet.title}
                            </h4>
                          </div>

                          {isDefault ? (
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 flex items-center space-x-1 shadow-xs">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultSheet(sheet.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 cursor-pointer ${
                                isLight
                                  ? 'text-slate-700 hover:text-emerald-700 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:text-emerald-400 border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-950/40'
                              }`}
                            >
                              Set Active
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 mt-2">
                          <span className={`text-[10px] font-mono truncate max-w-[140px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            ID: {sheet.id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(sheet.id, sheet.id)}
                            className={`p-0.5 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Copy Spreadsheet ID"
                          >
                            {copiedId === sheet.id ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <div className={`flex items-center justify-between text-[11px] font-medium mt-2.5 pt-2 border-t ${
                          isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                        }`}>
                          <span>
                            {sheet.rowCount !== undefined ? `${sheet.rowCount} rows recorded` : 'Ready'}
                          </span>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                            {sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt).toLocaleDateString() : 'New'}
                          </span>
                        </div>
                      </div>

                      {/* Sheet Controls */}
                      <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                        isLight ? 'border-slate-200' : 'border-slate-800'
                      }`}>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSheetId(sheet.id);
                            if (currentAccount) {
                              const token = getAccessTokenForEmail(currentAccount.email);
                              if (token) loadSheetData(sheet.id, token);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer font-bold ${
                            isBeingPreviewed
                              ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                              : isLight
                              ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                          }`}
                        >
                          {isBeingPreviewed ? 'Viewing Records' : 'Preview Records'}
                        </button>

                        <div className="flex items-center space-x-1.5">
                          <a
                            href={sheet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1.5 rounded transition-colors ${
                              isLight ? 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/50'
                            }`}
                            title="Open in Google Sheets (new tab)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleRemoveSheet(sheet.id, sheet.title)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/50'
                            }`}
                            title="Unlink sheet from account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center p-8 border-2 border-dashed rounded-xl space-y-3 ${
                isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
              }`}>
                <FileSpreadsheet className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                <p className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>No spreadsheets in this account yet</p>
                <p className={`text-[11px] max-w-sm mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Create a new CRM spreadsheet or link an existing one to start recording business cards.
                </p>
                <div className="pt-2 flex items-center justify-center space-x-2.5">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer"
                  >
                    + Create First Sheet
                  </button>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-700 cursor-pointer"
                  >
                    Link Existing ID
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid: Column Mapping & Live Records Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Column Mapping & Summary */}
            <div className="space-y-6">
              {/* Sync Column Reference */}
              <div className={`border rounded-xl p-5 shadow-xs space-y-3.5 transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-extrabold uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}>
                    Column Mapping Structure
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">Contacts!A:J</span>
                </div>
                <p className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Business card OCR extracts entities and standardizes them into dedicated spreadsheet columns:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col A: Full Name</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Card OCR</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col B: Company</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Verified Org</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col C: Title</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Designation</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col D: Phone Numbers</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Clean Mobile List</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col E: Email Addresses</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Validated Inboxes</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col F: Website</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Domain URL</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col G: Address</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Physical Office</span>
                  </div>
                  <div className={`flex justify-between py-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col H: LinkedIn</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Profile URL</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Col I: Notes / Details</span>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Card Context</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 2 Columns: Live Google Sheet Data Preview */}
            <div className={`lg:col-span-2 border rounded-xl p-5 shadow-xs space-y-3.5 flex flex-col transition-colors ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div className="flex items-center space-x-2 min-w-0">
                  <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h3 className={`text-xs font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {currentPreviewSheet ? `Live Preview: ${currentPreviewSheet.title}` : 'Spreadsheet Preview'}
                  </h3>
                  {sheetRows.length > 0 && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/40 shrink-0 shadow-xs">
                      {sheetRows.length - 1} Contacts Recorded
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {currentPreviewSheet && currentAccount && (
                    <button
                      onClick={() => {
                        const token = getAccessTokenForEmail(currentAccount.email);
                        if (token) loadSheetData(currentPreviewSheet.id, token);
                      }}
                      disabled={isLoadingRows}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800 border-slate-700/60'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRows ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  )}

                  {currentPreviewSheet && (
                    <a
                      href={currentPreviewSheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {isLoadingRows ? (
                <div className={`flex-1 min-h-[320px] flex items-center justify-center text-xs font-medium space-x-2.5 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  <span>Fetching records from Google Sheets API...</span>
                </div>
              ) : sheetRows.length > 0 ? (
                <div className={`overflow-x-auto flex-1 max-h-[460px] rounded-lg border ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
                }`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`font-extrabold border-b sticky top-0 backdrop-blur-md z-10 ${
                        isLight
                          ? 'bg-slate-100 text-slate-900 border-slate-200'
                          : 'bg-slate-950/90 text-slate-300 border-slate-800'
                      }`}>
                        <th className="p-3">#</th>
                        {(sheetRows[0] || []).map((col, idx) => (
                          <th key={idx} className={`p-3 whitespace-nowrap font-mono text-[11px] ${
                            isLight ? 'text-emerald-700 font-extrabold' : 'text-emerald-400/90'
                          }`}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                      {sheetRows.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className={`transition-colors ${
                          isLight ? 'hover:bg-slate-50 text-slate-900' : 'hover:bg-slate-800/40 text-slate-200'
                        }`}>
                          <td className={`p-3 font-mono text-[11px] font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{rowIdx + 1}</td>
                          {row.map((val, colIdx) => (
                            <td key={colIdx} className={`p-3 max-w-xs truncate font-medium ${
                              isLight ? 'text-slate-900' : 'text-slate-200'
                            }`}>
                              {val || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`flex-1 min-h-[320px] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl space-y-3 ${
                  isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                  }`}>
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {currentPreviewSheet
                        ? 'Spreadsheet is ready with standard contact headers'
                        : 'No spreadsheet selected for preview'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md mt-1 leading-relaxed">
                      {currentPreviewSheet
                        ? 'Contacts scanned via visiting cards or synced from CRM directory will populate here in real time.'
                        : 'Create a sheet or link an existing ID above to start synchronizing contacts.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Batch Sync */}
      {showConfirmSync && currentPreviewSheet && currentAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-emerald-500/40 text-slate-100'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400'
              }`}>
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{t.sheets.syncModalTitle}</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.sheets.syncModalDesc}</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>Google Account:</strong> <span className="font-mono text-emerald-600 dark:text-emerald-400">{currentAccount.email}</span>
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>Target Sheet:</strong> <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{currentPreviewSheet.title}</span>
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>Contacts to Sync:</strong> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{contacts.length} business contacts</span>
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Each contact will be written with name, company, title, phones, emails, and address.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSync(false)}
                className={`px-4 py-2 text-xs font-semibold cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={executeBatchSync}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer active:scale-95"
              >
                {t.sheets.syncConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Sheet Modal */}
      {showCreateModal && currentAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-emerald-500/40 text-slate-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400'
                }`}>
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{t.sheets.createModalTitle}</h3>
                  <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Workspace: {currentAccount.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`text-sm cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSheetInCurrentAccount} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Spreadsheet Title
                </label>
                <input
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder={t.sheets.sheetNamePlaceholder}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                  }`}
                />
                <p className={`text-[10px] mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.sheets.createModalDesc}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSheet}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  {isCreatingSheet && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingSheet ? t.common.loading : t.sheets.createConfirmBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Existing Sheet Modal */}
      {showLinkModal && currentAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-emerald-500/40 text-slate-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{t.sheets.linkModalTitle}</h3>
                <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Adding to {currentAccount.email}</p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className={`text-sm cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkExistingSheet} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Google Sheet ID or Full Browser URL
                </label>
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder={t.sheets.sheetUrlPlaceholder}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                  }`}
                  required
                />
                <p className={`text-[10px] mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.sheets.linkModalDesc}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className={`px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer active:scale-95"
                >
                  {t.sheets.linkConfirmBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect or Remove Gmail Connection Modal */}
      {showDisconnectModal && (accountToManage || currentAccount?.email) && (() => {
        const targetEmail = accountToManage || currentAccount?.email || '';
        const targetAcc = accounts.find((a) => a.email.toLowerCase() === targetEmail.toLowerCase()) || currentAccount;
        const sheetCount = targetAcc?.sheets?.length || 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 border ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-700/80 text-slate-100'
            }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                  }`}>
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Manage Gmail Connection</h3>
                    <p className={`text-[11px] font-mono truncate max-w-[280px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {targetEmail}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className={`text-sm cursor-pointer p-1 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  ✕
                </button>
              </div>

              {/* Account summary chip */}
              <div className={`border rounded-xl p-3 flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex items-center space-x-2.5">
                  {targetAcc?.photoURL ? (
                    <img
                      src={targetAcc.photoURL}
                      alt={targetEmail}
                      className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                      {targetEmail[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{targetAcc?.displayName || 'Google Account'}</p>
                    <p className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{targetEmail}</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                  isLight ? 'bg-slate-200/80 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  {sheetCount} {sheetCount === 1 ? 'Sheet' : 'Sheets'} Linked
                </span>
              </div>

              {/* Action 1: Disconnect Gmail Account (Session Sign-Out) */}
              <div className={`border rounded-xl p-3.5 space-y-2 transition-all ${
                isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-900/60 border-indigo-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className={`text-xs font-bold ${isLight ? 'text-indigo-950' : 'text-indigo-200'}`}>Disconnect Gmail Account</h4>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-950/80 text-indigo-300'
                  }`}>
                    Preserves Sheets
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Signs out the active Google authentication session and revokes local tokens in this browser.
                  Your spreadsheet references remain saved in CardFlow so you can easily reconnect whenever you want.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleDisconnectSession(targetEmail)}
                    className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Gmail Session Only</span>
                  </button>
                </div>
              </div>

              {/* Action 2: Remove Gmail Connection (Complete Unlink) */}
              <div className={`border rounded-xl p-3.5 space-y-2 transition-all ${
                isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-900/60 border-rose-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Unlink className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h4 className={`text-xs font-bold ${isLight ? 'text-rose-950' : 'text-rose-200'}`}>Remove Gmail Connection Completely</h4>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950/80 text-rose-300'
                  }`}>
                    Unlink & Remove
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Completely removes this Gmail account partition and unlinks its spreadsheet references from CardFlow.
                  Spreadsheets inside your Google Drive will <span className="text-slate-200 font-semibold">never</span> be deleted or modified.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveConnectionCompletely(targetEmail)}
                    className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Connection Completely</span>
                  </button>
                </div>
              </div>

              {/* Close footer */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
