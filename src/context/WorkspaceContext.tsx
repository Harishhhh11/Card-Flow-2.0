import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  GoogleAccountSpace,
  getStoredGoogleAccounts,
  getActiveAccountEmail,
  setActiveAccountEmail,
  getActiveAccountSpace,
} from '../services/googleSheets';
import { getClientDeviceId, getWorkspaceScope } from '../services/api';

interface WorkspaceContextType {
  workspaceScope: string;
  deviceId: string;
  activeAccountEmail: string | null;
  activeAccountSpace: GoogleAccountSpace | null;
  connectedAccounts: GoogleAccountSpace[];
  isIsolated: boolean;
  switchAccountScope: (email: string | null) => void;
  refreshWorkspaceState: () => void;
  deviceLabel: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Helper to determine friendly device label
function getFriendlyDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Device Client';
  const ua = navigator.userAgent;
  let device = 'Desktop Client';
  if (/iPhone/i.test(ua)) device = 'Apple iPhone';
  else if (/iPad/i.test(ua)) device = 'Apple iPad';
  else if (/Android/i.test(ua)) device = 'Android Device';
  else if (/Macintosh/i.test(ua)) device = 'macOS Workstation';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux Workstation';

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${device} • ${browser}`;
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId] = useState<string>(() => getClientDeviceId());
  const [deviceLabel] = useState<string>(() => getFriendlyDeviceLabel());
  const [activeAccountEmail, setActiveEmailState] = useState<string | null>(() => getActiveAccountEmail());
  const [connectedAccounts, setConnectedAccounts] = useState<GoogleAccountSpace[]>(() => getStoredGoogleAccounts());
  const [workspaceScope, setWorkspaceScopeState] = useState<string>(() => getWorkspaceScope());

  const refreshWorkspaceState = useCallback(() => {
    const currentEmail = getActiveAccountEmail();
    setActiveEmailState(currentEmail);
    setConnectedAccounts(getStoredGoogleAccounts());
    setWorkspaceScopeState(getWorkspaceScope());
  }, []);

  useEffect(() => {
    const handleWorkspaceChanged = () => {
      refreshWorkspaceState();
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'cardflow_active_google_account_email' ||
        e.key === 'cardflow_google_accounts_spaces'
      ) {
        refreshWorkspaceState();
      }
    };

    window.addEventListener('cardflow:workspace-changed', handleWorkspaceChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cardflow:workspace-changed', handleWorkspaceChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshWorkspaceState]);

  const switchAccountScope = useCallback((email: string | null) => {
    setActiveAccountEmail(email);
    refreshWorkspaceState();
  }, [refreshWorkspaceState]);

  const activeAccountSpace = getActiveAccountSpace();

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceScope,
        deviceId,
        activeAccountEmail,
        activeAccountSpace,
        connectedAccounts,
        isIsolated: true,
        switchAccountScope,
        refreshWorkspaceState,
        deviceLabel,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
