import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { CardScannerView } from './components/scanner/CardScannerView';
import { ContactsView } from './components/contacts/ContactsView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { TechBackground } from './components/common/TechBackground';
import { FirstTimeOnboardingModal } from './components/common/FirstTimeOnboardingModal';
import { UserSettingsModal } from './components/common/UserSettingsModal';
import { isOnboardingCompleted, clearUserProfile } from './services/userProfile';
import { useTheme } from './context/ThemeContext';
import { useWorkspace } from './context/WorkspaceContext';
import { api } from './services/api';
import {
  NavigationTab,
  Contact,
  Lead,
  User,
  Organization,
} from './types';

export const App: React.FC = () => {
  const { theme, themeConfig } = useTheme();
  const { workspaceScope } = useWorkspace();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [navHistory, setNavHistory] = useState<NavigationTab[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !isOnboardingCompleted());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Core CRM State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation History handlers
  const handleNavigate = (newTab: NavigationTab) => {
    if (newTab === activeTab) return;
    setNavHistory((prev) => [...prev, activeTab]);
    setActiveTab(newTab);
  };

  const handleGoBack = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((list) => list.slice(0, list.length - 1));
      setActiveTab(prev);
    } else if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  };

  const previousTab =
    navHistory.length > 0
      ? navHistory[navHistory.length - 1]
      : activeTab !== 'dashboard'
      ? 'dashboard'
      : null;

  const canGoBack = navHistory.length > 0 || activeTab !== 'dashboard';

  // Load all initial enterprise data from backend API
  const loadWorkspaceData = async () => {
    try {
      const [
        authData,
        orgData,
        contactsData,
        leadsData,
      ] = await Promise.all([
        api.getCurrentUser(),
        api.getOrganization(),
        api.getContacts(),
        api.getLeads(),
      ]);

      if (authData?.user) {
        setCurrentUser(authData.user);
      } else if (authData && !authData.organization) {
        setCurrentUser(authData as any);
      }

      if (orgData) {
        setOrganization(orgData);
      } else if (authData?.organization) {
        setOrganization(authData.organization);
      }

      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch (err) {
      console.error('Failed to load initial workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadWorkspaceData();
  }, [workspaceScope]);

  const handleContactSaved = (savedContact: Contact) => {
    setContacts((prev) => {
      const existsIndex = prev.findIndex((c) => String(c.id) === String(savedContact.id));
      if (existsIndex !== -1) {
        const copy = [...prev];
        copy[existsIndex] = savedContact;
        return copy;
      }
      return [savedContact, ...prev];
    });
  };

  const handleContactDeleted = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => String(c.id) !== String(contactId)));
  };

  const handleLeadCreated = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  const handleLogout = () => {
    clearUserProfile();
    setShowOnboarding(true);
    setIsSettingsOpen(false);
  };

  return (
    <div
      id="cardflow-enterprise-app"
      className={`flex h-screen ${themeConfig.bgClass} overflow-hidden font-sans relative selection:bg-cyan-500 selection:text-black transition-colors duration-500`}
    >
      {/* Animated Interactive Cyber Particle Canvas */}
      <TechBackground />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        user={currentUser}
        organization={organization}
        contactCount={contacts.length}
        leadCount={leads.length}
        isOpenOnMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Top Navbar with Left Arrow Back Button */}
        <Navbar
          activeTab={activeTab}
          onOpenScanner={() => handleNavigate('scanner')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sheetsSynced={true}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
          previousTab={previousTab}
        />

        {/* Scrollable View Container with Advanced Page Animations */}
        <main className="flex-1 overflow-y-auto bg-transparent relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="w-12 h-12 border-2 border-indigo-500/20 rounded-full absolute inset-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
                </div>
              </div>
              <div className="text-center space-y-1">
                <span className="font-extrabold text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  INITIALIZING CARDFLOW MATRIX
                </span>
                <p className="text-[11px] text-slate-500 font-mono">Loading Gemini AI OCR & Cloud Sync Engine...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DashboardOverview
                    contacts={contacts}
                    leads={leads}
                    onNavigate={handleNavigate}
                  />
                </motion.div>
              )}

              {/* Card Scanner is kept mounted to preserve scan session, files, and previews */}
              <div className={activeTab === 'scanner' ? 'block' : 'hidden'}>
                {activeTab === 'scanner' && (
                  <motion.div
                    key="scanner"
                    initial={{ opacity: 0, y: 12, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.99 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <CardScannerView
                      onContactSaved={handleContactSaved}
                      onNavigateToContacts={() => handleNavigate('contacts')}
                      onGoBack={handleGoBack}
                    />
                  </motion.div>
                )}
              </div>

              {activeTab === 'contacts' && (
                <motion.div
                  key="contacts"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ContactsView
                    contacts={contacts}
                    onRefresh={loadWorkspaceData}
                    onOpenScanner={() => handleNavigate('scanner')}
                    onLeadCreated={handleLeadCreated}
                    onContactDeleted={handleContactDeleted}
                    onContactSaved={handleContactSaved}
                    onGoBack={handleGoBack}
                    onNavigate={handleNavigate}
                  />
                </motion.div>
              )}

              {activeTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <IntegrationsView
                    contacts={contacts}
                    contactsCount={contacts.length}
                    onGoBack={handleGoBack}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* First Time User Onboarding Modal */}
      <FirstTimeOnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Account Profile & Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;


