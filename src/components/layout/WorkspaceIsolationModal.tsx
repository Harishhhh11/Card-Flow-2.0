import React, { useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  Plus,
  RefreshCw,
  LogOut,
  X,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { googleSignIn, setAccessTokenForEmail, logoutGoogle } from '../../services/firebaseAuth';
import { addOrUpdateAccountSpace, removeAccountSpace } from '../../services/googleSheets';

interface WorkspaceIsolationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceIsolationModal: React.FC<WorkspaceIsolationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    workspaceScope,
    deviceId,
    deviceLabel,
    activeAccountEmail,
    connectedAccounts,
    switchAccountScope,
    refreshWorkspaceState,
  } = useWorkspace();

  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectNewAccount = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const authResult = await googleSignIn({ promptSelectAccount: true });
      if (authResult?.user?.email && authResult?.accessToken) {
        const userEmail = authResult.user.email;
        setAccessTokenForEmail(userEmail, authResult.accessToken);
        addOrUpdateAccountSpace({
          email: userEmail,
          displayName: authResult.user.displayName || undefined,
          photoURL: authResult.user.photoURL || undefined,
        });
        switchAccountScope(userEmail);
        refreshWorkspaceState();
      }
    } catch (err: any) {
      if (!err?.message?.includes('closed') && !err?.message?.includes('cancelled')) {
        setErrorMsg(err.message || 'Failed to authenticate Google account');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchToDeviceOnly = () => {
    switchAccountScope(null);
    refreshWorkspaceState();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="cyber-panel-glow max-w-lg w-full overflow-hidden space-y-4 p-5 sm:p-6 rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] bg-slate-900/95 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Multi-Device & Account Isolation</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                  Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Data quarantine & independent partition management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isolation Guarantee Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200/90 leading-relaxed flex items-start space-x-3">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-cyan-300 block mb-0.5">Strict Partition Guarantee:</strong>
            Changes, card scans, contact updates, or deletions executed in this browser or account will{' '}
            <span className="text-white font-bold underline decoration-cyan-400/50">never</span> affect other devices, browser tabs, or Gmail accounts.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Current Active Workspace Scope */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Active Tenant Identity</span>
            <span className="text-[11px] font-mono text-cyan-400 lowercase">{workspaceScope}</span>
          </div>

          {/* Current Device Box */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
                {deviceLabel.includes('iPhone') || deviceLabel.includes('Android') ? (
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Laptop className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{deviceLabel}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  ID: {deviceId.substring(0, 18)}...
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyDeviceId}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-lg transition-colors shrink-0"
            >
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>

          {/* Connected Google Accounts for this Browser */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Google Account Partitions
            </label>

            {/* Device-only mode option */}
            <div
              onClick={handleSwitchToDeviceOnly}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                !activeAccountEmail
                  ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Device Local Workspace</div>
                  <div className="text-[10px] text-slate-400">
                    Scoped strictly to this physical browser/hardware
                  </div>
                </div>
              </div>
              {!activeAccountEmail && (
                <span className="flex items-center text-[10px] font-bold text-cyan-400">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-cyan-400" /> Active
                </span>
              )}
            </div>

            {/* List of Connected Google Accounts */}
            {connectedAccounts.map((account) => {
              const isActive =
                activeAccountEmail &&
                activeAccountEmail.toLowerCase() === account.email.toLowerCase();

              return (
                <div
                  key={account.email}
                  onClick={() => {
                    switchAccountScope(account.email);
                    refreshWorkspaceState();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-950/50 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                      {account.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {account.email}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {account.sheets.length} Sheets Connected • Isolated CRM Partition
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {isActive && (
                      <span className="flex items-center text-[10px] font-bold text-indigo-400">
                        <CheckCircle2 className="w-4 h-4 mr-1 text-indigo-400" /> Active
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Disconnect session for ${account.email}? Click OK to sign out or Cancel to keep.`)) {
                          await logoutGoogle(account.email);
                          setAccessTokenForEmail(account.email, null);
                          removeAccountSpace(account.email);
                          refreshWorkspaceState();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Disconnect / Remove Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Google Account */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              onClick={handleConnectNewAccount}
              disabled={isConnecting}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Another Gmail Account</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Enterprise Multi-Tenant Engine</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
