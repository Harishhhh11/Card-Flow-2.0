import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Mail,
  Phone,
  Globe,
  Building2,
  Trash2,
  Edit2,
  Filter,
  CheckCircle2,
  ScanLine,
  Tag as TagIcon,
  Table,
  LayoutGrid,
  Layers,
  UploadCloud,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Eye,
  GitPullRequest,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Contact, Lead } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { SuccessToast } from '../common/SuccessToast';
import { GoogleSheetsTableFormat } from './GoogleSheetsTableFormat';
import { LiveSyncDataView } from './LiveSyncDataView';
import { ContactDetailModal } from './ContactDetailModal';
import { AddContactModal } from './AddContactModal';
import {
  ConnectedSheetInfo,
  GoogleAccountSpace,
  getStoredGoogleAccounts,
  getActiveAccountEmail,
  setActiveAccountEmail,
  addOrUpdateAccountSpace,
  addSheetToAccount,
  setActiveSheetForAccount,
  createGoogleSheet,
  appendContactToGoogleSheet,
  batchSyncContactsToSheet,
  fetchSheetRows,
} from '../../services/googleSheets';
import {
  initAuth,
  googleSignIn,
  getAccessTokenForEmail,
  setAccessTokenForEmail,
  isUserCancelledAuth,
  isGoogleUnverifiedTesterError,
} from '../../services/firebaseAuth';

interface ContactsViewProps {
  contacts: Contact[];
  onRefresh: () => void;
  onOpenScanner: () => void;
  onLeadCreated?: (lead: Lead) => void;
  onContactDeleted?: (id: string) => void;
  onContactSaved?: (contact: Contact) => void;
  onGoBack?: () => void;
  onNavigate?: (tab: any) => void;
}

export type TableFormatMode = 'crm' | 'sheets' | 'live';

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onRefresh,
  onOpenScanner,
  onLeadCreated,
  onContactDeleted,
  onContactSaved,
  onGoBack,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const { isLight } = useTheme();
  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  // Google Accounts & Sheets linking state
  const [accounts, setAccounts] = useState<GoogleAccountSpace[]>(() => getStoredGoogleAccounts());
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>('ALL');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('ALL');

  // Table Format Mode: 'crm' (Full Directory), 'sheets' (Spreadsheet Matrix), 'live' (Live Cloud API)
  const [tableFormat, setTableFormat] = useState<TableFormatMode>('crm');

  // Live Sheet Data for 'live' mode
  const [liveSheetRows, setLiveSheetRows] = useState<string[][]>([]);
  const [isLoadingLiveRows, setIsLoadingLiveRows] = useState(false);

  // Syncing & In-progress states
  const [isSyncingBatch, setIsSyncingBatch] = useState(false);
  const [isSyncingContactId, setIsSyncingContactId] = useState<string | null>(null);
  const [isConnectingAccount, setIsConnectingAccount] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Status message banner
  const [statusBanner, setStatusBanner] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Modals
  const [inspectContact, setInspectContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');

  // Toast
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Contact saved successfully');
  const [savedContactName, setSavedContactName] = useState('');

  const refreshAccounts = () => {
    const updated = getStoredGoogleAccounts();
    setAccounts(updated);
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = initAuth((authUser, authToken) => {
      if (authUser.email) {
        addOrUpdateAccountSpace({
          email: authUser.email,
          displayName: authUser.displayName || undefined,
          photoURL: authUser.photoURL || undefined,
        });
        setAccessTokenForEmail(authUser.email, authToken);
        refreshAccounts();
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Currently active account object
  const currentAccount =
    selectedAccountEmail !== 'ALL'
      ? accounts.find((a) => a.email.toLowerCase() === selectedAccountEmail.toLowerCase()) || null
      : accounts[0] || null;

  // Available sheets across active account or all accounts
  const availableSheets: (ConnectedSheetInfo & { accountEmail?: string })[] =
    selectedAccountEmail === 'ALL'
      ? accounts.flatMap((acc) =>
          acc.sheets.map((s) => ({ ...s, accountEmail: acc.email }))
        )
      : (currentAccount?.sheets || []).map((s) => ({
          ...s,
          accountEmail: currentAccount?.email,
        }));

  // Currently active sheet object
  const currentSheet =
    (selectedSheetId !== 'ALL' &&
      availableSheets.find((s) => s.id === selectedSheetId)) ||
    currentAccount?.sheets.find((s) => s.id === currentAccount.activeSheetId) ||
    availableSheets[0] ||
    null;

  // Fetch live rows when in 'live' cloud mode
  const loadLiveSheetRows = async () => {
    if (!currentSheet?.id) return;
    const targetEmail = currentSheet.accountEmail || currentAccount?.email;
    if (!targetEmail) return;
    const token = getAccessTokenForEmail(targetEmail);
    if (!token) {
      setLiveSheetRows([]);
      return;
    }

    setIsLoadingLiveRows(true);
    try {
      const data = await fetchSheetRows(token, currentSheet.id);
      setLiveSheetRows(data.rows || []);
    } catch (err: any) {
      console.warn('Failed to fetch live rows:', err);
      setLiveSheetRows([]);
    } finally {
      setIsLoadingLiveRows(false);
    }
  };

  useEffect(() => {
    if ((tableFormat === 'sheets' || tableFormat === 'live') && currentSheet?.id) {
      loadLiveSheetRows();
    }
  }, [tableFormat, currentSheet?.id, currentAccount?.email]);

  // Handle Connecting a new Gmail Account
  const handleConnectGmail = async () => {
    setIsConnectingAccount(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result?.user?.email) {
        addOrUpdateAccountSpace({
          email: result.user.email,
          displayName: result.user.displayName || undefined,
          photoURL: result.user.photoURL || undefined,
        });
        setAccessTokenForEmail(result.user.email, result.accessToken);
        refreshAccounts();
        setSelectedAccountEmail(result.user.email);
        setStatusBanner({
          text: `Successfully connected Google account (${result.user.email})!`,
          type: 'success',
        });
      }
    } catch (err: any) {
      if (isUserCancelledAuth(err)) return;
      if (isGoogleUnverifiedTesterError(err)) {
        setAuthError(
          'Google blocked sign-in (Error 403: access_denied): In testing mode, Google only permits authorized test accounts. Please add this email under "Test users" in the Google Cloud Console OAuth consent screen.'
        );
      } else {
        setAuthError(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsConnectingAccount(false);
    }
  };

  // Create a new sheet for current account
  const handleCreateNewSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAcc = currentAccount || accounts[0];
    if (!targetAcc) {
      alert('Please select or connect a Google account first.');
      return;
    }
    const token = getAccessTokenForEmail(targetAcc.email);
    if (!token) {
      alert(`Please sign in with ${targetAcc.email} to authorize sheet creation.`);
      return;
    }

    setIsCreatingSheet(true);
    try {
      const newSheet = await createGoogleSheet(
        token,
        newSheetTitle,
        targetAcc.email,
        filteredContacts
      );
      refreshAccounts();
      setSelectedSheetId(newSheet.id);
      setShowCreateSheetModal(false);
      setNewSheetTitle('');

      if (filteredContacts.length > 0) {
        await Promise.all(
          filteredContacts.map((c) =>
            api.updateContact(c.id, {
              synced_to_sheets: true,
              synced_account_email: targetAcc.email,
              synced_sheet_id: newSheet.id,
              synced_sheet_title: newSheet.title,
              synced_at: new Date().toISOString(),
            })
          )
        );
        onRefresh();
      }

      setStatusBanner({
        text: `Created new spreadsheet "${newSheet.title}" under ${targetAcc.email} with ${filteredContacts.length} contacts synced!`,
        type: 'success',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create Google Sheet');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Sync a single contact to sheet
  const handleSyncContactToSheet = async (
    contact: Contact,
    targetEmail?: string,
    targetSheetId?: string
  ): Promise<boolean> => {
    setIsSyncingContactId(contact.id);
    try {
      let accEmail =
        targetEmail ||
        contact.synced_account_email ||
        (selectedAccountEmail !== 'ALL' ? selectedAccountEmail : undefined) ||
        currentAccount?.email ||
        accounts[0]?.email;

      let token = accEmail ? getAccessTokenForEmail(accEmail) : null;

      // If no account is connected or token is missing, prompt Google sign-in immediately
      if (!accEmail || !token) {
        try {
          const authResult = await googleSignIn(
            accEmail ? { emailHint: accEmail, promptSelectAccount: false } : undefined
          );
          if (authResult?.user?.email && authResult?.accessToken) {
            accEmail = authResult.user.email;
            token = authResult.accessToken;
            setAccessTokenForEmail(accEmail, token);
            addOrUpdateAccountSpace({
              email: accEmail,
              displayName: authResult.user.displayName || undefined,
              photoURL: authResult.user.photoURL || undefined,
            });
            const updatedAccs = getStoredGoogleAccounts();
            setAccounts(updatedAccs);
          }
        } catch (authErr: any) {
          if (!isUserCancelledAuth(authErr)) {
            setStatusBanner({
              text: isGoogleUnverifiedTesterError(authErr)
                ? 'Google OAuth test user restriction. Please ensure your email is added under Test Users in Cloud Console.'
                : `Please authorize Google Sheets access for ${accEmail || 'your Google account'}.`,
              type: 'error',
            });
          }
          return false;
        }
      }

      if (!accEmail || !token) {
        setStatusBanner({
          text: 'Google authentication required to sync contacts to Google Sheets.',
          type: 'error',
        });
        return false;
      }

      const freshAccounts = getStoredGoogleAccounts();
      const acc = freshAccounts.find((a) => a.email.toLowerCase() === accEmail!.toLowerCase()) || freshAccounts[0];

      let sheetId =
        targetSheetId ||
        contact.synced_sheet_id ||
        (selectedSheetId !== 'ALL' ? selectedSheetId : undefined) ||
        acc?.activeSheetId ||
        acc?.sheets[0]?.id;
      let sheetTitle = acc?.sheets.find((s) => s.id === sheetId)?.title || 'Contacts';

      if (!sheetId) {
        try {
          const newSheet = await createGoogleSheet(
            token,
            `CardFlow CRM - ${accEmail.split('@')[0]} Contacts`,
            accEmail,
            [contact]
          );
          sheetId = newSheet.id;
          sheetTitle = newSheet.title;
          const updatedWithSheet = getStoredGoogleAccounts();
          setAccounts(updatedWithSheet);
          setSelectedAccountEmail(accEmail);
          setSelectedSheetId(newSheet.id);
        } catch (createErr: any) {
          if (
            createErr?.message?.includes('401') ||
            createErr?.message?.includes('UNAUTHENTICATED') ||
            createErr?.message?.includes('invalid authentication')
          ) {
            try {
              const reauth = await googleSignIn({ emailHint: accEmail, promptSelectAccount: false });
              if (reauth?.accessToken) {
                token = reauth.accessToken;
                setAccessTokenForEmail(accEmail, token);
                const newSheet = await createGoogleSheet(
                  token,
                  `CardFlow CRM - ${accEmail.split('@')[0]} Contacts`,
                  accEmail,
                  [contact]
                );
                sheetId = newSheet.id;
                sheetTitle = newSheet.title;
                const updatedWithSheet = getStoredGoogleAccounts();
                setAccounts(updatedWithSheet);
                setSelectedAccountEmail(accEmail);
                setSelectedSheetId(newSheet.id);
              }
            } catch (reauthErr) {
              console.error('Re-auth retry failed during sheet creation:', reauthErr);
            }
          }
          if (!sheetId) {
            setStatusBanner({
              text: createErr.message || 'Could not create Google Sheet for sync',
              type: 'error',
            });
            return false;
          }
        }
      } else {
        try {
          await appendContactToGoogleSheet(
            token,
            sheetId,
            {
              name: contact.name,
              company_name: contact.company_name,
              designation: contact.designation,
              mobile_numbers: contact.mobile_numbers,
              email_addresses: contact.email_addresses,
              website: contact.website,
              address: contact.address,
              linkedin: contact.linkedin,
              other_details: contact.notes || contact.other_details,
            },
            accEmail
          );
        } catch (err: any) {
          if (
            err?.message?.includes('401') ||
            err?.message?.includes('UNAUTHENTICATED') ||
            err?.message?.includes('invalid authentication')
          ) {
            try {
              const reauth = await googleSignIn({ emailHint: accEmail, promptSelectAccount: false });
              if (reauth?.accessToken) {
                token = reauth.accessToken;
                setAccessTokenForEmail(accEmail, token);
                await appendContactToGoogleSheet(
                  token,
                  sheetId,
                  {
                    name: contact.name,
                    company_name: contact.company_name,
                    designation: contact.designation,
                    mobile_numbers: contact.mobile_numbers,
                    email_addresses: contact.email_addresses,
                    website: contact.website,
                    address: contact.address,
                    linkedin: contact.linkedin,
                    other_details: contact.notes || contact.other_details,
                  },
                  accEmail
                );
              }
            } catch (reauthErr: any) {
              setStatusBanner({
                text: 'Google session expired. Please re-authorize and try again.',
                type: 'error',
              });
              return false;
            }
          } else {
            setStatusBanner({
              text: err.message || 'Failed to sync contact to Google Sheet',
              type: 'error',
            });
            return false;
          }
        }
      }

      // Update contact in CRM local/backend state with confirmed sync status
      const updated = await api.updateContact(contact.id, {
        sync_to_sheets: true,
        synced_to_sheets: true,
        synced_account_email: accEmail,
        synced_sheet_id: sheetId,
        synced_sheet_title: sheetTitle,
        synced_at: new Date().toISOString(),
      });

      // Synchronously update the parent state in App.tsx
      if (onContactSaved) {
        onContactSaved(updated);
      }

      onRefresh();
      refreshAccounts();
      loadLiveSheetRows();
      setStatusBanner({
        text: `Successfully synced "${contact.name || contact.company_name}" directly to Google Sheet "${sheetTitle}"!`,
        type: 'success',
      });
      return true;
    } catch (finalErr: any) {
      console.error('Contact sync failed:', finalErr);
      setStatusBanner({
        text: finalErr.message || 'Failed to sync contact to Google Sheet.',
        type: 'error',
      });
      return false;
    } finally {
      setIsSyncingContactId(null);
    }
  };

  // Batch Sync Filtered Contacts to Selected Sheet
  const handleBatchSyncFiltered = async () => {
    let targetAcc =
      (selectedAccountEmail !== 'ALL' && currentAccount) ||
      accounts.find((a) =>
        a.sheets.some((s) => s.id === (currentSheet?.id || selectedSheetId))
      ) ||
      accounts[0] ||
      null;

    let token = targetAcc?.email ? getAccessTokenForEmail(targetAcc.email) : null;

    if (!targetAcc?.email || !token) {
      try {
        const result = await googleSignIn(
          targetAcc?.email ? { emailHint: targetAcc.email, promptSelectAccount: false } : undefined
        );
        if (result?.user?.email && result?.accessToken) {
          const userEmail = result.user.email;
          token = result.accessToken;
          setAccessTokenForEmail(userEmail, token);
          const space = addOrUpdateAccountSpace({
            email: userEmail,
            displayName: result.user.displayName || undefined,
            photoURL: result.user.photoURL || undefined,
          });
          const freshAccs = getStoredGoogleAccounts();
          setAccounts(freshAccs);
          targetAcc = space;
          setSelectedAccountEmail(userEmail);
        }
      } catch (authErr: any) {
        if (!isUserCancelledAuth(authErr)) {
          setStatusBanner({
            text: 'Please sign in to authorize Google Sheets sync.',
            type: 'error',
          });
        }
        return;
      }
    }

    if (!targetAcc?.email || !token) {
      setStatusBanner({
        text: 'Valid Google authentication required to sync.',
        type: 'error',
      });
      return;
    }

    // STRICT REQUIREMENT: Only push contacts whose status is "In Platform" (!c.synced_to_sheets)
    const inPlatformPool = (
      pendingSheetsContacts.length > 0 ? pendingSheetsContacts : contacts
    ).filter((c: Contact) => !c.synced_to_sheets);

    const contactsToSync = inPlatformPool;

    if (contactsToSync.length === 0) {
      setStatusBanner({
        text: 'All contacts are already synced! No contacts with status "In Platform" to push.',
        type: 'info',
      });
      return;
    }

    let targetSheet = currentSheet;
    if (!targetSheet?.id) {
      try {
        setIsSyncingBatch(true);
        const newSheet = await createGoogleSheet(
          token,
          `CardFlow CRM - ${targetAcc.email.split('@')[0]} Contacts`,
          targetAcc.email,
          contactsToSync
        );
        refreshAccounts();
        setSelectedSheetId(newSheet.id);

        const updatedList = await Promise.all(
          contactsToSync.map((c: Contact) =>
            api.updateContact(c.id, {
              sync_to_sheets: true,
              synced_to_sheets: true,
              synced_account_email: targetAcc!.email,
              synced_sheet_id: newSheet.id,
              synced_sheet_title: newSheet.title,
              synced_at: new Date().toISOString(),
            })
          )
        );

        if (onContactSaved) {
          updatedList.forEach((c) => onContactSaved(c));
        }

        onRefresh();
        refreshAccounts();
        loadLiveSheetRows();
        setStatusBanner({
          text: `Created Google Sheet "${newSheet.title}" and synced ${contactsToSync.length} contacts!`,
          type: 'success',
        });
        return;
      } catch (createErr: any) {
        setStatusBanner({
          text: createErr.message || 'Failed to initialize Google Sheet for sync.',
          type: 'error',
        });
        return;
      } finally {
        setIsSyncingBatch(false);
      }
    }

    // Direct automatic sync to existing sheet
    setIsSyncingBatch(true);
    try {
      let result;
      try {
        result = await batchSyncContactsToSheet(
          token,
          targetSheet.id,
          contactsToSync,
          targetAcc.email
        );
      } catch (syncErr: any) {
        // Token expired retry
        if (
          syncErr?.message?.includes('401') ||
          syncErr?.message?.includes('UNAUTHENTICATED') ||
          syncErr?.message?.includes('invalid authentication')
        ) {
          const reauth = await googleSignIn({ emailHint: targetAcc.email, promptSelectAccount: false });
          if (reauth?.accessToken) {
            token = reauth.accessToken;
            setAccessTokenForEmail(targetAcc.email, token);
            result = await batchSyncContactsToSheet(
              token,
              targetSheet.id,
              contactsToSync,
              targetAcc.email
            );
          } else {
            throw syncErr;
          }
        } else {
          throw syncErr;
        }
      }

      // Mark all contactsToSync as synced in backend and UI
      const updatedContacts = await Promise.all(
        contactsToSync.map((c: Contact) =>
          api.updateContact(c.id, {
            sync_to_sheets: true,
            synced_to_sheets: true,
            synced_account_email: targetAcc!.email,
            synced_sheet_id: targetSheet!.id,
            synced_sheet_title: targetSheet!.title,
            synced_at: new Date().toISOString(),
          })
        )
      );

      if (onContactSaved) {
        updatedContacts.forEach((c) => onContactSaved(c));
      }

      onRefresh();
      refreshAccounts();
      loadLiveSheetRows();
      setStatusBanner({
        text: `Successfully pushed ${result?.count || contactsToSync.length} contact(s) with status "In Platform" directly to Google Sheet "${targetSheet.title}"!`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusBanner({
        text: err.message || 'Failed to sync contacts to Google Sheets.',
        type: 'error',
      });
    } finally {
      setIsSyncingBatch(false);
    }
  };

  // Handle Add Contact submission
  const handleAddContactSubmit = async (
    formData: any,
    targetEmail?: string,
    targetSheet?: string,
    syncNow?: boolean
  ) => {
    const sheetTitle = accounts
      .find((a) => a.email.toLowerCase() === (targetEmail || '').toLowerCase())
      ?.sheets.find((s) => s.id === targetSheet)?.title || '';

    const created = await api.createContact({
      name: formData.name,
      company_name: formData.company_name,
      designation: formData.designation,
      mobile_numbers: formData.phone ? [formData.phone] : [],
      email_addresses: formData.email ? [formData.email] : [],
      website: formData.website,
      address: formData.address,
      linkedin: formData.linkedin,
      notes: formData.notes,
      source: 'MANUAL',
      tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      sync_to_sheets: Boolean(syncNow),
      synced_to_sheets: false,
      synced_account_email: syncNow ? targetEmail || '' : '',
      synced_sheet_id: syncNow ? targetSheet || '' : '',
      synced_sheet_title: syncNow ? sheetTitle : '',
    });

    setSavedContactName(created.name || created.company_name || 'Contact');
    setToastMessage(syncNow ? 'Contact added to CRM & queued for Google Sheets' : 'Contact added & registered in CRM');
    setShowSuccessToast(true);
    onRefresh();
  };

  // Filter Contacts for CRM Directory (all contacts matching search & source filter)
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email_addresses.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.mobile_numbers.some((m) => m.includes(searchTerm)) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource = selectedSource === 'ALL' || c.source === selectedSource;

    return matchesSearch && matchesSource;
  });

  // Contacts displayed in Google Sheets Grid view (all contacts matching active account and sheet filters)
  const syncedSheetsContacts = contacts.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email_addresses.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.mobile_numbers.some((m) => m.includes(searchTerm)) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource = selectedSource === 'ALL' || c.source === selectedSource;

    // Filter by selected Gmail account
    const matchesAccount =
      selectedAccountEmail === 'ALL' ||
      !c.synced_account_email ||
      c.synced_account_email.toLowerCase() === selectedAccountEmail.toLowerCase();

    // Filter by selected Sheet/Table
    const matchesSheet =
      selectedSheetId === 'ALL' ||
      !c.synced_sheet_id ||
      c.synced_sheet_id === selectedSheetId;

    return matchesSearch && matchesSource && matchesAccount && matchesSheet;
  });

  // Pending contacts for Google Sheets section (strictly contacts that are not yet synced to sheets)
  const pendingSheetsContacts = contacts.filter((c: Contact) => {
    if (c.synced_to_sheets) return false;

    const matchesSearch =
      searchTerm === '' ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email_addresses.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.mobile_numbers.some((m) => m.includes(searchTerm)) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource = selectedSource === 'ALL' || c.source === selectedSource;

    // Filter by selected Gmail account
    const matchesAccount =
      selectedAccountEmail === 'ALL' ||
      !c.synced_account_email ||
      c.synced_account_email.toLowerCase() === selectedAccountEmail.toLowerCase();

    // Filter by selected Sheet/Table
    const matchesSheet =
      selectedSheetId === 'ALL' ||
      !c.synced_sheet_id ||
      c.synced_sheet_id === selectedSheetId;

    return matchesSearch && matchesSource && matchesAccount && matchesSheet;
  });

  const handleDeleteContact = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      setContactToDelete(contact);
    } else {
      // Direct delete if contact object is not found in local array
      executeDeleteContact(id, 'Contact');
    }
  };

  const executeDeleteContact = async (id: string, name?: string) => {
    setIsDeletingContact(true);
    try {
      await api.deleteContact(id);
      if (onContactDeleted) {
        onContactDeleted(id);
      }
      onRefresh();
      if (inspectContact?.id === id) {
        setInspectContact(null);
      }
      setContactToDelete(null);
      setStatusBanner({
        text: `Deleted "${name || 'Contact'}" from CRM directory.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusBanner({
        text: err.message || 'Failed to delete contact from CRM.',
        type: 'error',
      });
    } finally {
      setIsDeletingContact(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Full Name',
      'Company Name',
      'Designation',
      'Mobile Numbers',
      'Email Addresses',
      'Website',
      'Physical Address',
      'LinkedIn',
      'Source',
      'Synced Gmail',
      'Synced Sheet',
      'Notes',
    ];
    const rows = filteredContacts.map((c) => [
      `"${c.name}"`,
      `"${c.company_name}"`,
      `"${c.designation}"`,
      `"${c.mobile_numbers.join('; ')}"`,
      `"${c.email_addresses.join('; ')}"`,
      `"${c.website}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.linkedin || ''}"`,
      `"${c.source}"`,
      `"${c.synced_account_email || ''}"`,
      `"${c.synced_sheet_title || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `cardflow_crm_contacts_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* Unified Action Header with Back Button */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 transition-all ${
          isLight
            ? 'bg-white border border-slate-300 shadow-slate-200/60 shadow-sm text-slate-900'
            : 'cyber-panel shadow-[0_0_20px_rgba(6,182,212,0.1)] text-slate-100'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className={`group p-2 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-900/90 hover:bg-cyan-950/60 border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300'
              }`}
              title="Navigate Back"
              aria-label="Navigate Back"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className={`text-sm sm:text-base font-extrabold tracking-tight leading-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {t.contacts.hubTitle}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 shrink-0 ${
                isLight
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              }`}>
                <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{t.contacts.sheetsLinked}</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                isLight
                  ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
              }`}>
                {contacts.length} {t.contacts.recordsCount}
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs truncate mt-0.5 font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t.contacts.hubSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 shrink-0">
          <button
            onClick={exportCSV}
            className={`flex-1 sm:flex-initial px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.contacts.exportCsv}</span>
          </button>
          <button
            onClick={onOpenScanner}
            className={`flex-1 sm:flex-initial px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-950'
                : 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500/40 hover:border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t.contacts.scanCard}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.contacts.addContact}</span>
          </button>
        </div>
      </div>

      {/* Auth Error Banner if unverified tester or auth failed */}
      {authError && (
        <div className="p-3.5 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-start justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300">Google Account Notice</strong>
              <p className="mt-0.5 text-amber-200/90">{authError}</p>
            </div>
          </div>
          <button onClick={() => setAuthError(null)} className="text-amber-400 hover:text-amber-200 font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* Success / Status Banner */}
      {statusBanner && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-slate-200 px-1 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Google Sheets Multi-Gmail & Multi-Table Control Deck */}
      <div className="cyber-panel rounded-2xl p-3.5 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-3 sm:space-y-3.5 border border-cyan-500/30">
        {/* Row 1: Gmail Accounts Selector & View Mode Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-3.5">
          {/* Gmail Accounts Section */}
          <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 shrink-0">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>{t.contacts.connectedAccounts}:</span>
              </span>

              {/* Connect Gmail on small screens right next to label */}
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnectingAccount}
                className="sm:hidden px-2.5 py-1 bg-slate-900 border border-dashed border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all shadow-xs shrink-0"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>{isConnectingAccount ? 'Connecting...' : t.contacts.addGoogleAccount}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* All Accounts Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedAccountEmail('ALL');
                  setSelectedSheetId('ALL');
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  selectedAccountEmail === 'ALL'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {t.contacts.allAccounts} ({contacts.length})
              </button>

              {/* Choose Gmail Account Dropdown Menu */}
              <div className="relative flex-1 sm:w-64 min-w-0">
                <select
                  aria-label="Choose Gmail account"
                  value={selectedAccountEmail}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setSelectedAccountEmail(newEmail);
                    if (newEmail === 'ALL') {
                      setSelectedSheetId('ALL');
                    } else {
                      const acc = accounts.find(
                        (a) => a.email.toLowerCase() === newEmail.toLowerCase()
                      );
                      setSelectedSheetId(acc?.activeSheetId || acc?.sheets[0]?.id || 'ALL');
                    }
                  }}
                  className="w-full appearance-none bg-slate-900/90 border border-slate-700 hover:border-cyan-500/60 text-slate-200 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-xs cursor-pointer truncate"
                >
                  <option value="ALL">{t.contacts.allAccounts} ({accounts.length})</option>
                  {accounts.map((acc) => (
                    <option key={acc.email} value={acc.email}>
                      {acc.displayName ? `${acc.displayName} (${acc.email})` : acc.email} — {acc.sheets.length} Sheets
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Connect Gmail on tablet/desktop */}
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnectingAccount}
                className="hidden sm:flex px-3 py-1.5 bg-slate-900 border border-dashed border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-300 rounded-lg text-xs font-semibold items-center space-x-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isConnectingAccount ? 'Connecting...' : t.contacts.addGoogleAccount}</span>
              </button>
            </div>
          </div>

          {/* Table View Format Switcher Tabs: Responsive strip */}
          <div className="flex flex-wrap sm:flex-nowrap items-center p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner text-xs gap-1 w-full xl:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setTableFormat('crm')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                tableFormat === 'crm'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.contacts.viewModes.standard}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tableFormat === 'crm'
                    ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {filteredContacts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTableFormat('sheets')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                tableFormat === 'sheets'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{t.contacts.viewModes.sheetsGrid}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tableFormat === 'sheets'
                    ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {syncedSheetsContacts.length}
              </span>
            </button>

            {currentSheet && (
              <button
                type="button"
                onClick={() => setTableFormat('live')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  tableFormat === 'live'
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{t.contacts.viewModes.liveSync}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Sheet / Table Format: All Tables + Select Table Dropdown + (New Sheet in Sheets Grid only) */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Sheet / Table:</span>
            </span>

            {/* New Sheet & External link buttons for mobile row */}
            <div className="flex items-center gap-1.5 sm:hidden">
              {tableFormat === 'sheets' && (
                <button
                  type="button"
                  onClick={() => setShowCreateSheetModal(true)}
                  className="px-2.5 py-1 bg-slate-900 border border-emerald-500/50 hover:bg-emerald-950/50 text-emerald-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors shadow-xs"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>New Sheet</span>
                </button>
              )}
              {currentSheet?.url && (
                <a
                  href={currentSheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-emerald-400 rounded-lg transition-colors inline-flex items-center shadow-xs"
                  title="Open active spreadsheet in Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1">
            {/* All Tables Button */}
            <button
              type="button"
              onClick={() => setSelectedSheetId('ALL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedSheetId === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              All Tables ({availableSheets.length})
            </button>

            {/* Select Table Dropdown Menu */}
            <div className="relative flex-1 sm:w-72 min-w-0">
              <select
                aria-label="Select table or sheet"
                value={selectedSheetId}
                onChange={(e) => {
                  const newSheetId = e.target.value;
                  setSelectedSheetId(newSheetId);
                  if (newSheetId !== 'ALL') {
                    const targetAcc = accounts.find((a) =>
                      a.sheets.some((s) => s.id === newSheetId)
                    );
                    if (targetAcc) {
                      setActiveSheetForAccount(targetAcc.email, newSheetId);
                      if (selectedAccountEmail === 'ALL') {
                        setSelectedAccountEmail(targetAcc.email);
                      }
                    }
                  }
                }}
                className="w-full appearance-none bg-slate-900/90 border border-slate-700 hover:border-emerald-500/60 text-slate-200 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs cursor-pointer truncate"
              >
                <option value="ALL">Select Table / Sheet ({availableSheets.length} Available)</option>
                {availableSheets.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.title} {sh.rowCount ? `(${sh.rowCount} rows)` : ''} {sh.accountEmail ? `• ${sh.accountEmail.split('@')[0]}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* New Sheet Button on tablet/desktop */}
            {tableFormat === 'sheets' && (
              <button
                type="button"
                onClick={() => setShowCreateSheetModal(true)}
                className="hidden sm:flex px-3 py-1.5 bg-slate-900 border border-emerald-500/50 hover:bg-emerald-950/60 text-emerald-300 rounded-lg text-xs font-semibold items-center space-x-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Sheet</span>
              </button>
            )}

            {currentSheet?.url && (
              <a
                href={currentSheet.url}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-emerald-400 rounded-lg transition-colors items-center shadow-xs shrink-0"
                title="Open active spreadsheet in Google Sheets"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-panel rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.contacts.filterPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        {/* Source Pills */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg text-[11px] overflow-x-auto shrink-0 border border-slate-800">
          {['ALL', 'CARD_SCAN', 'MANUAL'].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-2.5 py-1 rounded font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSource === src
                  ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {src === 'ALL'
                ? t.contacts.allStatus
                : src === 'CARD_SCAN'
                ? t.contacts.cardScanOnly
                : 'Manual Entry'}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering Based on Table Format */}
      {tableFormat === 'sheets' ? (
        <div className="space-y-6">
          <GoogleSheetsTableFormat
            contacts={syncedSheetsContacts}
            liveRows={liveSheetRows}
            isLoadingLiveRows={isLoadingLiveRows}
            onRefreshLiveRows={loadLiveSheetRows}
            selectedAccount={currentAccount}
            selectedSheet={currentSheet}
            isCloudLiveMode={false}
            onViewContact={(contact) => setInspectContact(contact)}
            onDeleteContact={handleDeleteContact}
            onSyncContactToSheet={(c) => handleSyncContactToSheet(c)}
            isSyncingContactId={isSyncingContactId}
            onBatchSyncContacts={handleBatchSyncFiltered}
            isBatchSyncing={isSyncingBatch}
            syncCount={pendingSheetsContacts.length}
          />
        </div>
      ) : tableFormat === 'live' ? (
        <div className="space-y-6">
          <LiveSyncDataView
            contacts={syncedSheetsContacts}
            liveRows={liveSheetRows}
            isLoadingLiveRows={isLoadingLiveRows}
            onRefreshLiveRows={loadLiveSheetRows}
            selectedAccount={currentAccount}
            selectedSheet={currentSheet}
            onSyncInPlatform={handleBatchSyncFiltered}
            isBatchSyncing={isSyncingBatch}
            onSyncContact={(c) => handleSyncContactToSheet(c)}
            isSyncingContactId={isSyncingContactId}
            onViewContact={(contact) => setInspectContact(contact)}
          />
        </div>
      ) : (
        /* CRM Directory: Adaptive Responsive View (Mobile Cards on small screens, Structured Table on tablet/desktop) */
        <div className="space-y-3">
          {/* Mobile Card Layout (Visible on small screens: hidden on md:) */}
          <div className="block md:hidden space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="cyber-panel rounded-xl p-8 text-center text-slate-400 text-xs">
                No contacts found matching criteria. Scan a card or add a record.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSyncingThis = isSyncingContactId === contact.id;
                return (
                  <div
                    key={contact.id}
                    className="cyber-panel rounded-xl p-3.5 shadow-xs space-y-3 transition-all hover:border-cyan-500/40"
                  >
                    {/* Header Row: Avatar, Name, Company, Call & Email shortcuts */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
                          {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-100 text-sm leading-snug truncate">
                            {contact.name || 'Unnamed Contact'}
                          </h3>
                          <p className="text-xs text-slate-400 truncate font-medium">
                            {contact.company_name || 'No Company'}
                          </p>
                          {contact.designation && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {contact.designation}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick Communication Icons */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {contact.mobile_numbers[0] && (
                          <a
                            href={`tel:${contact.mobile_numbers[0]}`}
                            className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900/80 text-emerald-400 flex items-center justify-center transition-colors shadow-xs"
                            title="Call Contact"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.email_addresses[0] && (
                          <a
                            href={`mailto:${contact.email_addresses[0]}`}
                            className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-900/80 text-cyan-300 flex items-center justify-center transition-colors shadow-xs"
                            title="Email Contact"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Contact Details Grid */}
                    <div className="bg-slate-900/80 rounded-lg p-2.5 space-y-1.5 text-xs text-slate-300 border border-slate-800">
                      {contact.mobile_numbers[0] && (
                        <div className="flex items-center space-x-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-200">{contact.mobile_numbers[0]}</span>
                        </div>
                      )}
                      {contact.email_addresses[0] && (
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-cyan-300 truncate font-medium">{contact.email_addresses[0]}</span>
                        </div>
                      )}
                      {contact.website && (
                        <div className="flex items-center space-x-2 truncate">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-cyan-400 truncate underline decoration-slate-600"
                          >
                            {contact.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Tags, Sync Status & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1 ${
                            contact.source === 'CARD_SCAN'
                              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-850 text-slate-400 border border-slate-750'
                          }`}
                        >
                          {contact.source === 'CARD_SCAN' && <ScanLine className="w-2.5 h-2.5" />}
                          <span>{contact.source === 'CARD_SCAN' ? 'Card OCR' : 'Manual'}</span>
                        </span>

                        {contact.synced_to_sheets ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Synced to Sheet</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSyncContactToSheet(contact)}
                            disabled={isSyncingThis}
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 px-2.5 py-1 rounded-full transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            <UploadCloud className={`w-3 h-3 ${isSyncingThis ? 'animate-bounce' : ''}`} />
                            <span>{isSyncingThis ? 'Syncing...' : 'Sync to Sheet'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => setInspectContact(contact)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 border border-slate-750 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Structured Table Layout (Visible on md: and up) */}
          <div className="hidden md:block cyber-panel rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[200px]">{t.contacts.tableColumns.name}</th>
                    <th className="py-3 px-4 min-w-[160px]">{t.contacts.tableColumns.company}</th>
                    <th className="py-3 px-4 min-w-[180px]">{t.contacts.tableColumns.phone}</th>
                    <th className="py-3 px-4 min-w-[140px]">{t.contacts.tableColumns.status}</th>
                    <th className="py-3 px-4 min-w-[130px]">{t.sheets.hubTitle}</th>
                    <th className="py-3 px-4 text-right min-w-[100px]">{t.contacts.tableColumns.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs text-slate-200">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-500 text-xs">
                        {t.contacts.noContactsFound}
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSyncingThis = isSyncingContactId === contact.id;
                      return (
                        <tr key={contact.id} className="hover:bg-slate-900/60 transition-colors group">
                          {/* Name & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                                {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-100 leading-tight truncate">
                                  {contact.name || 'Unnamed Contact'}
                                </p>
                                {contact.website && (
                                  <a
                                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-slate-400 hover:text-cyan-400 truncate flex items-center space-x-1 mt-0.5"
                                  >
                                    <Globe className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[130px]">
                                      {contact.website.replace(/^https?:\/\//, '')}
                                    </span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Company & Designation */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-200 truncate">{contact.company_name || '-'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{contact.designation || 'Business Contact'}</p>
                          </td>

                          {/* Phone & Email */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              {contact.mobile_numbers[0] ? (
                                <div className="flex items-center space-x-1 text-[11px] text-slate-300 truncate">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{contact.mobile_numbers[0]}</span>
                                </div>
                              ) : null}
                              {contact.email_addresses[0] ? (
                                <div className="flex items-center space-x-1 text-[11px] text-cyan-400 truncate max-w-[190px]">
                                  <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span className="truncate">{contact.email_addresses[0]}</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Source & Tags */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1 ${
                                  contact.source === 'CARD_SCAN'
                                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-slate-850 text-slate-400 border border-slate-750'
                                }`}
                              >
                                {contact.source === 'CARD_SCAN' && <ScanLine className="w-2.5 h-2.5" />}
                                <span>{contact.source === 'CARD_SCAN' ? 'Card OCR' : contact.source.replace('_', ' ')}</span>
                              </span>
                              {contact.tags.slice(0, 2).map((t, idx) => (
                                <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded truncate max-w-[80px] border border-slate-700">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Sheets Sync status with Account */}
                          <td className="py-3 px-4">
                            {contact.synced_to_sheets ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Synced</span>
                                </span>
                                {contact.synced_account_email && (
                                  <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                    {contact.synced_account_email.split('@')[0]}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  In Platform
                                </span>
                                <button
                                  onClick={() => handleSyncContactToSheet(contact)}
                                  disabled={isSyncingThis}
                                  title="Sync this contact directly to Google Sheet"
                                  className="px-2 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-full inline-flex items-center space-x-1 transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                >
                                  <UploadCloud className={`w-3 h-3 ${isSyncingThis ? 'animate-bounce' : ''}`} />
                                  <span>{isSyncingThis ? 'Syncing...' : 'Sync to Sheet'}</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => setInspectContact(contact)}
                                title="View & Edit Contact Details"
                                className="px-2 py-1 bg-slate-800 hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
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
            </div>
          </div>
        </div>
      )}

      {/* Inspect & Edit Contact Modal */}
      {inspectContact && (
        <ContactDetailModal
          contact={inspectContact}
          onClose={() => setInspectContact(null)}
          onUpdateContact={(updated) => {
            onRefresh();
            setInspectContact(updated);
          }}
          onDeleteContact={handleDeleteContact}
          onLeadCreated={onLeadCreated}
          accounts={accounts}
          onSyncContactToSheet={(c, targetEmail, targetSheetId) =>
            handleSyncContactToSheet(c, targetEmail, targetSheetId)
          }
        />
      )}

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <AddContactModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddContactSubmit}
          accounts={accounts}
          defaultAccountEmail={selectedAccountEmail !== 'ALL' ? selectedAccountEmail : undefined}
          defaultSheetId={selectedSheetId !== 'ALL' ? selectedSheetId : undefined}
        />
      )}

      {/* Create Sheet Modal */}
      {showCreateSheetModal && currentAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-panel rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-4 border border-emerald-500/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Create New Google Sheet</h3>
              </div>
              <button
                onClick={() => setShowCreateSheetModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Create a new spreadsheet table under <strong className="text-slate-200">{currentAccount.email}</strong> with automated schema for CRM contacts.
            </p>

            <form onSubmit={handleCreateNewSheet} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Spreadsheet Title</label>
                <input
                  type="text"
                  required
                  placeholder={`CRM Contacts - ${new Date().toLocaleDateString()}`}
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateSheetModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSheet}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  {isCreatingSheet ? 'Creating...' : 'Create Spreadsheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-panel rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(244,63,94,0.25)] space-y-4 border border-rose-500/40 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete Contact</h3>
                <p className="text-xs text-slate-400">This will remove the contact from your CRM directory.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-100">
                {contactToDelete.name || contactToDelete.company_name || 'Unnamed Contact'}
              </p>
              {contactToDelete.company_name && contactToDelete.name && (
                <p className="text-slate-400">{contactToDelete.company_name} • {contactToDelete.designation || 'Contact'}</p>
              )}
              {contactToDelete.email_addresses[0] && (
                <p className="text-slate-400">{contactToDelete.email_addresses[0]}</p>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete this contact from your CRM database?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                disabled={isDeletingContact}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteContact(contactToDelete.id, contactToDelete.name || contactToDelete.company_name)}
                disabled={isDeletingContact}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center space-x-1.5 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeletingContact ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Contact</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <SuccessToast
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        contactName={savedContactName}
        message={toastMessage}
      />
    </div>
  );
};
