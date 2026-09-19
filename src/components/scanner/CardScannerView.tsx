import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  Check,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Share2,
  UserCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  ScanLine,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import { VisitingCardScanResult, Contact } from '../../types';
import { SuccessToast } from '../common/SuccessToast';
import { LiveContinuousScanner } from './LiveContinuousScanner';
import { useLanguage } from '../../context/LanguageContext';
import { requestCameraStream } from '../../utils/camera';
import {
  getAccessToken,
  getAccessTokenForEmail,
  setAccessTokenForEmail,
  googleSignIn,
  isUserCancelledAuth,
  isGoogleUnverifiedTesterError,
} from '../../services/firebaseAuth';
import {
  GoogleAccountSpace,
  ConnectedSheetInfo,
  getStoredGoogleAccounts,
  getActiveAccountEmail,
  appendContactToGoogleSheet,
  createGoogleSheet,
  addOrUpdateAccountSpace,
} from '../../services/googleSheets';

interface CardScannerViewProps {
  onContactSaved: (contact: Contact) => void;
  onNavigateToContacts: () => void;
  onGoBack?: () => void;
}

function optimizeImageForCardScan(input: string | File): Promise<string> {
  return new Promise((resolve) => {
    const processDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const MAX_DIMENSION = 1600;
        let width = img.width || 1200;
        let height = img.height || 800;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(jpegUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      processDataUrl(input);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => processDataUrl(e.target?.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    }
  });
}

const SCANNER_SESSION_KEY = 'cardflow_active_scanner_session';

interface ScannerSessionData {
  side1Image: string | null;
  side2Image: string | null;
  extractedData: VisitingCardScanResult | null;
  tagsInput: string;
  savedPlatformContact: Contact | null;
  activeSidePreview: 'side1' | 'side2';
  platformAccountEmail: string | null;
  platformSheetId: string | null;
  sheetsAccountEmail: string | null;
  sheetsSheetId: string | null;
}

const loadStoredSession = (): Partial<ScannerSessionData> => {
  try {
    const raw = sessionStorage.getItem(SCANNER_SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const CardScannerView: React.FC<CardScannerViewProps> = ({
  onContactSaved,
  onNavigateToContacts,
  onGoBack,
}) => {
  const { t } = useLanguage();
  const initialSession = useRef(loadStoredSession()).current;

  // Scanner Mode: 'manual' (File upload / 2-side photo capture) or 'live' (Live Stream Continuous Scan)
  const [scanMode, setScanMode] = useState<'manual' | 'live'>('manual');

  // Dual sides state
  const [side1Image, setSide1Image] = useState<string | null>(initialSession.side1Image || null);
  const [side2Image, setSide2Image] = useState<string | null>(initialSession.side2Image || null);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<number>(1);
  const [scanElapsedTime, setScanElapsedTime] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Data & Editing
  const [extractedData, setExtractedData] = useState<VisitingCardScanResult | null>(initialSession.extractedData || null);
  const [activeSidePreview, setActiveSidePreview] = useState<'side1' | 'side2'>(initialSession.activeSidePreview || 'side1');

  // Destination, Tags & Platform Controls
  const [syncToSheets, setSyncToSheets] = useState(true);
  const [tagsInput, setTagsInput] = useState(initialSession.tagsInput || 'Visiting Card');
  const [savedPlatformContact, setSavedPlatformContact] = useState<Contact | null>(initialSession.savedPlatformContact || null);

  // Google Multi-Account List
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountSpace[]>(() => getStoredGoogleAccounts());

  // INDEPENDENT Destination 1: Save Contact to Platform (CRM Directory)
  const [platformAccountEmail, setPlatformAccountEmail] = useState<string | null>(
    () => initialSession.platformAccountEmail || getActiveAccountEmail() || (getStoredGoogleAccounts()[0]?.email || null)
  );
  const [platformSheetId, setPlatformSheetId] = useState<string | null>(
    () => initialSession.platformSheetId || null
  );
  const [isConnectingPlatformGoogle, setIsConnectingPlatformGoogle] = useState(false);
  const [isCreatingPlatformSheet, setIsCreatingPlatformSheet] = useState(false);

  // INDEPENDENT Destination 2: Google Sheets Synchronization
  const [sheetsAccountEmail, setSheetsAccountEmail] = useState<string | null>(
    () => initialSession.sheetsAccountEmail || getActiveAccountEmail() || (getStoredGoogleAccounts()[0]?.email || null)
  );
  const [sheetsSheetId, setSheetsSheetId] = useState<string | null>(
    () => initialSession.sheetsSheetId || null
  );
  const [isConnectingSheetsGoogle, setIsConnectingSheetsGoogle] = useState(false);
  const [isCreatingSheetsSheet, setIsCreatingSheetsSheet] = useState(false);
  const [syncedSheetToastLabel, setSyncedSheetToastLabel] = useState<string | undefined>(undefined);

  // Success Toast & State
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastTitle, setToastTitle] = useState('Contact saved successfully');
  const [toastMessage, setToastMessage] = useState('Business card contact added to your CRM directory.');
  const [savedContactName, setSavedContactName] = useState('');
  const [wasSyncedToSheets, setWasSyncedToSheets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<'contacts' | 'sync' | null>(null);

  // WebCam capture modal state
  const [cameraActiveSide, setCameraActiveSide] = useState<'side1' | 'side2' | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // File Inputs
  const side1InputRef = useRef<HTMLInputElement>(null);
  const side2InputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [isDraggingSide1, setIsDraggingSide1] = useState(false);
  const [isDraggingSide2, setIsDraggingSide2] = useState(false);

  // Automatically synchronize active scan session to sessionStorage
  useEffect(() => {
    try {
      if (side1Image || side2Image || extractedData) {
        const sessionData: ScannerSessionData = {
          side1Image,
          side2Image,
          extractedData,
          tagsInput,
          savedPlatformContact,
          activeSidePreview,
          platformAccountEmail,
          platformSheetId,
          sheetsAccountEmail,
          sheetsSheetId,
        };
        sessionStorage.setItem(SCANNER_SESSION_KEY, JSON.stringify(sessionData));
      } else {
        sessionStorage.removeItem(SCANNER_SESSION_KEY);
      }
    } catch (err) {
      console.warn('Failed to save scanner session to storage:', err);
    }
  }, [
    side1Image,
    side2Image,
    extractedData,
    tagsInput,
    savedPlatformContact,
    activeSidePreview,
    platformAccountEmail,
    platformSheetId,
    sheetsAccountEmail,
    sheetsSheetId,
  ]);

  // Timer for scanning animation
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      setScanElapsedTime(0);
      timer = setInterval(() => {
        setScanElapsedTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  const toggleCameraFacingMode = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle Camera initialization
  useEffect(() => {
    if (cameraActiveSide) {
      requestCameraStream(cameraFacingMode)
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setErrorMessage(
            err?.message || 'Camera access was denied or not available on this device.'
          );
          setCameraActiveSide(null);
        });
    } else if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraActiveSide, cameraFacingMode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      if (cameraActiveSide === 'side1') setSide1Image(dataUrl);
      if (cameraActiveSide === 'side2') setSide2Image(dataUrl);
    }
    setCameraActiveSide(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'side1' | 'side2') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (side === 'side1') setSide1Image(dataUrl);
        if (side === 'side2') setSide2Image(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, side: 'side1' | 'side2') => {
    e.preventDefault();
    e.stopPropagation();
    if (side === 'side1') setIsDraggingSide1(false);
    if (side === 'side2') setIsDraggingSide2(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (side === 'side1') setSide1Image(dataUrl);
        if (side === 'side2') setSide2Image(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerScan = async () => {
    if (!side1Image) {
      setErrorMessage('Please upload Side 1 (front) of the visiting card.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setScanStep(1);

    const stepTimer1 = setTimeout(() => setScanStep(2), 400);
    const stepTimer2 = setTimeout(() => setScanStep(3), 900);

    try {
      const readySide1 = await optimizeImageForCardScan(side1Image);
      const readySide2 = side2Image ? await optimizeImageForCardScan(side2Image) : undefined;

      const result = await api.scanCard(readySide1, readySide2);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setScanStep(4);

      setExtractedData(result.data);
      setSavedPlatformContact(null);
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'Error occurred during visiting card extraction.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFieldChange = (field: keyof VisitingCardScanResult, val: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: val,
    });
  };

  const handleAddPhone = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      mobile_numbers: [...extractedData.mobile_numbers, ''],
    });
  };

  const handleUpdatePhone = (idx: number, val: string) => {
    if (!extractedData) return;
    const next = [...extractedData.mobile_numbers];
    next[idx] = val;
    setExtractedData({ ...extractedData, mobile_numbers: next });
  };

  const handleRemovePhone = (idx: number) => {
    if (!extractedData) return;
    const next = extractedData.mobile_numbers.filter((_, i) => i !== idx);
    setExtractedData({ ...extractedData, mobile_numbers: next });
  };

  const handleAddEmail = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      email_addresses: [...extractedData.email_addresses, ''],
    });
  };

  const handleUpdateEmail = (idx: number, val: string) => {
    if (!extractedData) return;
    const next = [...extractedData.email_addresses];
    next[idx] = val;
    setExtractedData({ ...extractedData, email_addresses: next });
  };

  const handleRemoveEmail = (idx: number) => {
    if (!extractedData) return;
    const next = extractedData.email_addresses.filter((_, i) => i !== idx);
    setExtractedData({ ...extractedData, email_addresses: next });
  };

  // Sync Google account spaces whenever extracted data changes
  useEffect(() => {
    const accs = getStoredGoogleAccounts();
    setGoogleAccounts(accs);
    if (accs.length > 0) {
      const active = getActiveAccountEmail() || accs[0].email;
      if (!platformAccountEmail) {
        setPlatformAccountEmail(active);
      }
      if (!sheetsAccountEmail) {
        setSheetsAccountEmail(active);
      }
    }
  }, [extractedData]);

  // Platform Section: Update selected sheet when platform account changes
  useEffect(() => {
    if (platformAccountEmail) {
      const acc = googleAccounts.find(
        (a) => a.email.toLowerCase() === platformAccountEmail.toLowerCase()
      );
      if (acc && acc.sheets.length > 0) {
        const currentValid = acc.sheets.some((s) => s.id === platformSheetId);
        if (!currentValid) {
          const activeS = acc.sheets.find((s) => s.id === acc.activeSheetId) || acc.sheets[0];
          setPlatformSheetId(activeS.id);
        }
      } else {
        setPlatformSheetId(null);
      }
    }
  }, [platformAccountEmail, googleAccounts]);

  // Sheets Section: Update selected sheet when sheets account changes
  useEffect(() => {
    if (sheetsAccountEmail) {
      const acc = googleAccounts.find(
        (a) => a.email.toLowerCase() === sheetsAccountEmail.toLowerCase()
      );
      if (acc && acc.sheets.length > 0) {
        const currentValid = acc.sheets.some((s) => s.id === sheetsSheetId);
        if (!currentValid) {
          const activeS = acc.sheets.find((s) => s.id === acc.activeSheetId) || acc.sheets[0];
          setSheetsSheetId(activeS.id);
        }
      } else {
        setSheetsSheetId(null);
      }
    }
  }, [sheetsAccountEmail, googleAccounts]);

  const handleConnectGoogleForSection = async (targetSection: 'platform' | 'sheets') => {
    if (targetSection === 'platform') {
      setIsConnectingPlatformGoogle(true);
    } else {
      setIsConnectingSheetsGoogle(true);
    }
    try {
      const result = await googleSignIn();
      const userEmail = result.user.email;
      if (userEmail) {
        setAccessTokenForEmail(userEmail, result.accessToken);
        const space = addOrUpdateAccountSpace({
          email: userEmail,
          displayName: result.user.displayName || undefined,
          photoURL: result.user.photoURL || undefined,
        });
        if (space.sheets.length === 0) {
          try {
            await createGoogleSheet(
              result.accessToken,
              `CardFlow CRM - ${userEmail.split('@')[0]} Contacts`,
              userEmail
            );
          } catch (initErr) {
            console.warn('Initial sheet creation deferred:', initErr);
          }
        }
        const updated = getStoredGoogleAccounts();
        setGoogleAccounts(updated);
        const found = updated.find((a) => a.email.toLowerCase() === userEmail.toLowerCase());
        const firstSheetId = found?.sheets[0]?.id || null;

        if (targetSection === 'platform') {
          setPlatformAccountEmail(userEmail);
          setPlatformSheetId(firstSheetId);
        } else {
          setSheetsAccountEmail(userEmail);
          setSheetsSheetId(firstSheetId);
        }
      }
    } catch (err: any) {
      if (isUserCancelledAuth(err)) {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup was blocked by your browser. Please allow popups.');
        return;
      }
      if (isGoogleUnverifiedTesterError(err)) {
        setErrorMessage(
          'Google blocked sign-in (Error 403: access_denied): In testing mode, Google only permits authorized test accounts. Please add this email under "Test users" in the Google Cloud Console OAuth consent screen.'
        );
        return;
      }
      console.warn('Google sign in from scanner failed:', err);
      setErrorMessage(err.message || 'Could not connect Google account.');
    } finally {
      if (targetSection === 'platform') {
        setIsConnectingPlatformGoogle(false);
      } else {
        setIsConnectingSheetsGoogle(false);
      }
    }
  };

  const handleCreateNewSheetForSection = async (targetSection: 'platform' | 'sheets') => {
    const targetEmail = targetSection === 'platform' ? platformAccountEmail : sheetsAccountEmail;
    if (!targetEmail) return;

    if (targetSection === 'platform') {
      setIsCreatingPlatformSheet(true);
    } else {
      setIsCreatingSheetsSheet(true);
    }

    try {
      let token = getAccessTokenForEmail(targetEmail);
      if (!token) {
        try {
          const res = await googleSignIn();
          token = res.accessToken;
        } catch (authErr: any) {
          if (isUserCancelledAuth(authErr)) {
            return;
          }
          throw authErr;
        }
      }
      const titlePrompt = window.prompt(
        'Enter title for new spreadsheet table in this account:',
        `CardFlow CRM - ${new Date().toLocaleDateString()}`
      );
      if (!titlePrompt) {
        return;
      }
      const created = await createGoogleSheet(token, titlePrompt, targetEmail);
      const updated = getStoredGoogleAccounts();
      setGoogleAccounts(updated);

      if (targetSection === 'platform') {
        setPlatformSheetId(created.id);
      } else {
        setSheetsSheetId(created.id);
      }
    } catch (err: any) {
      console.error('Quick sheet creation failed:', err);
      setErrorMessage(err.message || 'Failed to create spreadsheet table.');
    } finally {
      if (targetSection === 'platform') {
        setIsCreatingPlatformSheet(false);
      } else {
        setIsCreatingSheetsSheet(false);
      }
    }
  };

  const handleToggleTag = (tag: string) => {
    const currentTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (currentTags.includes(tag)) {
      const updated = currentTags.filter((t) => t !== tag);
      setTagsInput(updated.join(', '));
    } else {
      const updated = [...currentTags, tag];
      setTagsInput(updated.join(', '));
    }
  };

  const handleSaveContact = async (syncWithSheets: boolean = false) => {
    if (!extractedData) return;
    setSavingAction(syncWithSheets ? 'sync' : 'contacts');
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (!syncWithSheets) {
        // =========================================================================
        // CASE 1: User clicks "Save to Platform" (Save Contact to CRM Directory ONLY)
        // -> Strictly stores/updates contact in CRM directory only.
        // -> Does NOT sync to Google Sheets, does NOT set synced_to_sheets flag.
        // -> Review page stays open for inspection, further edits, or optional future sync.
        // =========================================================================
        const platformPayload = {
          name: extractedData.name,
          company_name: extractedData.company_name,
          designation: extractedData.designation,
          mobile_numbers: extractedData.mobile_numbers.filter(Boolean),
          email_addresses: extractedData.email_addresses.filter(Boolean),
          website: extractedData.website,
          address: extractedData.address,
          linkedin: extractedData.linkedin,
          other_details: extractedData.other_details,
          source: 'CARD_SCAN' as const,
          tags,
          synced_account_email: '',
          synced_sheet_id: '',
          synced_sheet_title: '',
          sync_to_sheets: false,
          synced_to_sheets: false,
          synced_at: undefined,
        };

        let savedContact: Contact;
        if (savedPlatformContact) {
          savedContact = await api.updateContact(savedPlatformContact.id, platformPayload);
          setToastTitle('CRM Contact Updated');
          setToastMessage('Contact details updated in your CRM directory.');
        } else {
          savedContact = await api.createContact(platformPayload);
          setToastTitle('Saved to CRM Directory');
          setToastMessage('Contact stored in CRM directory only (not in Google Sheets).');
        }

        setSavedPlatformContact(savedContact);
        onContactSaved(savedContact);

        setSavedContactName(
          savedContact.name
            ? `${savedContact.name} (${savedContact.company_name || 'Contact'})`
            : savedContact.company_name || 'Contact'
        );
        setWasSyncedToSheets(false);
        setSyncedSheetToastLabel(undefined);
        setShowSuccessToast(true);
      } else {
        // =========================================================================
        // User clicked "Save and Sync to Google Sheets" / "Sync to Google Sheets"
        // -> Uses sheetsAccountEmail & sheetsSheetId
        // =========================================================================
        let currentAcc = googleAccounts.find(
          (a) => a.email.toLowerCase() === sheetsAccountEmail?.toLowerCase()
        ) || (googleAccounts[0] || null);

        let currentSheet = currentAcc?.sheets.find((s) => s.id === sheetsSheetId) || (currentAcc?.sheets[0] || null);
        let sheetsSyncSuccess = false;
        let syncLabel = '';

        if (googleAccounts.length === 0) {
          try {
            const result = await googleSignIn();
            const userEmail = result.user.email;
            if (userEmail) {
              setAccessTokenForEmail(userEmail, result.accessToken);
              const space = addOrUpdateAccountSpace({
                email: userEmail,
                displayName: result.user.displayName || undefined,
                photoURL: result.user.photoURL || undefined,
              });
              let targetSheet = space.sheets[0];
              if (!targetSheet) {
                try {
                  targetSheet = await createGoogleSheet(
                    result.accessToken,
                    `CardFlow CRM - ${userEmail.split('@')[0]} Contacts`,
                    userEmail
                  );
                } catch (initErr) {
                  console.warn('Initial sheet creation deferred:', initErr);
                }
              }
              const updatedAccounts = getStoredGoogleAccounts();
              setGoogleAccounts(updatedAccounts);
              currentAcc = space;
              currentSheet = targetSheet || space.sheets[0];
              setSheetsAccountEmail(userEmail);
              if (currentSheet) setSheetsSheetId(currentSheet.id);
            }
          } catch (authErr: any) {
            if (isUserCancelledAuth(authErr)) {
              console.log('Google Auth popup closed, continuing save to CRM directory.');
            } else if (isGoogleUnverifiedTesterError(authErr)) {
              setErrorMessage(
                'Google OAuth test restriction. Contact was saved directly into the CRM directory.'
              );
            } else {
              console.warn('Google sign in attempt failed:', authErr);
            }
          }
        }

        if (currentAcc && (!currentSheet || !currentSheet.id)) {
          try {
            let token = currentAcc.email ? getAccessTokenForEmail(currentAcc.email) : null;
            if (!token) token = await getAccessToken();
            if (token) {
              currentSheet = await createGoogleSheet(
                token,
                `CardFlow CRM - ${currentAcc.email.split('@')[0]} Contacts`,
                currentAcc.email
              );
              const updatedAccounts = getStoredGoogleAccounts();
              setGoogleAccounts(updatedAccounts);
              if (currentSheet) setSheetsSheetId(currentSheet.id);
            }
          } catch (createErr) {
            console.warn('Auto create sheet failed:', createErr);
          }
        }

        let sTargetEmail = sheetsAccountEmail || currentAcc?.email || (googleAccounts[0]?.email || '');
        let sTargetSheetId = currentSheet?.id || sheetsSheetId || (currentAcc?.sheets[0]?.id || '');
        let sTargetSheetTitle = currentSheet?.title || currentAcc?.sheets?.find((s) => s.id === sTargetSheetId)?.title || '';

        // Ensure we have a valid access token for Google Sheets sync
        let syncToken = sTargetEmail ? getAccessTokenForEmail(sTargetEmail) : null;
        if (!syncToken) syncToken = await getAccessToken();

        if (!syncToken && sTargetEmail) {
          try {
            const authResult = await googleSignIn({ emailHint: sTargetEmail, promptSelectAccount: false });
            if (authResult?.accessToken) {
              syncToken = authResult.accessToken;
              setAccessTokenForEmail(sTargetEmail, syncToken);
            }
          } catch (authPromptErr) {
            console.warn('Google auth prompt failed or closed:', authPromptErr);
          }
        }

        // Ensure target sheet exists
        if (syncToken && sTargetEmail && !sTargetSheetId) {
          try {
            const created = await createGoogleSheet(
              syncToken,
              `CardFlow CRM - ${sTargetEmail.split('@')[0]} Contacts`,
              sTargetEmail
            );
            sTargetSheetId = created.id;
            sTargetSheetTitle = created.title;
            const updatedAccs = getStoredGoogleAccounts();
            setGoogleAccounts(updatedAccs);
            setSheetsSheetId(created.id);
          } catch (createErr: any) {
            console.warn('Auto create sheet failed:', createErr);
          }
        }

        // Directly append the contact row into Google Sheets
        if (syncToken && sTargetSheetId) {
          try {
            const appendOk = await appendContactToGoogleSheet(
              syncToken,
              sTargetSheetId,
              {
                name: extractedData.name,
                company_name: extractedData.company_name,
                designation: extractedData.designation,
                mobile_numbers: extractedData.mobile_numbers.filter(Boolean),
                email_addresses: extractedData.email_addresses.filter(Boolean),
                website: extractedData.website,
                address: extractedData.address,
                linkedin: extractedData.linkedin,
                other_details: extractedData.other_details,
                notes: 'Scanned via Visiting Card Scanner',
              },
              sTargetEmail
            );
            sheetsSyncSuccess = Boolean(appendOk);
          } catch (syncErr: any) {
            console.warn('Initial Google Sheet append failed, checking for expired token:', syncErr);
            // If token expired (401 / unauthenticated), refresh credentials and retry
            if (
              syncErr?.message?.includes('401') ||
              syncErr?.message?.includes('UNAUTHENTICATED') ||
              syncErr?.message?.includes('invalid authentication')
            ) {
              try {
                const refreshed = await googleSignIn({
                  emailHint: sTargetEmail || undefined,
                  promptSelectAccount: false,
                });
                if (refreshed?.accessToken) {
                  syncToken = refreshed.accessToken;
                  if (sTargetEmail) {
                    setAccessTokenForEmail(sTargetEmail, syncToken);
                  }
                  const retryOk = await appendContactToGoogleSheet(
                    syncToken,
                    sTargetSheetId,
                    {
                      name: extractedData.name,
                      company_name: extractedData.company_name,
                      designation: extractedData.designation,
                      mobile_numbers: extractedData.mobile_numbers.filter(Boolean),
                      email_addresses: extractedData.email_addresses.filter(Boolean),
                      website: extractedData.website,
                      address: extractedData.address,
                      linkedin: extractedData.linkedin,
                      other_details: extractedData.other_details,
                      notes: 'Scanned via Visiting Card Scanner',
                    },
                    sTargetEmail
                  );
                  sheetsSyncSuccess = Boolean(retryOk);
                }
              } catch (reauthErr) {
                console.error('Re-auth retry failed:', reauthErr);
              }
            } else {
              setErrorMessage(`Google Sheet sync failed: ${syncErr?.message || 'Error writing to sheet'}`);
            }
          }
        }

        syncLabel = sTargetSheetTitle && sTargetEmail ? `${sTargetSheetTitle} (${sTargetEmail})` : '';

        const sheetsPayload = {
          name: extractedData.name,
          company_name: extractedData.company_name,
          designation: extractedData.designation,
          mobile_numbers: extractedData.mobile_numbers.filter(Boolean),
          email_addresses: extractedData.email_addresses.filter(Boolean),
          website: extractedData.website,
          address: extractedData.address,
          linkedin: extractedData.linkedin,
          other_details: extractedData.other_details,
          source: 'CARD_SCAN' as const,
          tags,
          synced_account_email: sTargetEmail || savedPlatformContact?.synced_account_email,
          synced_sheet_id: sTargetSheetId || savedPlatformContact?.synced_sheet_id,
          synced_sheet_title: sTargetSheetTitle || savedPlatformContact?.synced_sheet_title,
          sync_to_sheets: true,
          synced_to_sheets: sheetsSyncSuccess,
          synced_at: sheetsSyncSuccess ? new Date().toISOString() : undefined,
        };

        if (savedPlatformContact) {
          // =======================================================================
          // CASE 3: Contact was ALREADY saved to platform previously
          // -> Check if user already clicked save to platform.
          // -> Since it is ALREADY inside CRM directory, UPDATE existing record (no duplicates).
          // -> Syncs into Google Sheets and updates CRM sync status.
          // =======================================================================
          const updatedContact = await api.updateContact(savedPlatformContact.id, sheetsPayload);
          setSavedPlatformContact(updatedContact);
          onContactSaved(updatedContact);

          setSavedContactName(
            updatedContact.name
              ? `${updatedContact.name} (${updatedContact.company_name || 'Contact'})`
              : updatedContact.company_name || 'Contact'
          );
          setToastTitle(sheetsSyncSuccess ? 'Synced to Google Sheets' : 'Saved to Sheets Section');
          setToastMessage(
            sheetsSyncSuccess
              ? 'Contact synced to your Google Sheet spreadsheet.'
              : 'Contact queued in Google Sheets section. Click Sync contacts in Sheets Grid to write to spreadsheet.'
          );
          setWasSyncedToSheets(sheetsSyncSuccess);
          setSyncedSheetToastLabel(
            syncLabel || (sTargetSheetTitle && sTargetEmail ? `${sTargetSheetTitle} (${sTargetEmail})` : undefined)
          );
          setShowSuccessToast(true);

          setTimeout(() => {
            setSide1Image(null);
            setSide2Image(null);
            setExtractedData(null);
            setSavedPlatformContact(null);
            try {
              sessionStorage.removeItem(SCANNER_SESSION_KEY);
            } catch {}
          }, 500);
        } else {
          // =======================================================================
          // CASE 2: User clicks ONLY "Save and Sync to Google Sheets" (not in CRM yet)
          // -> Creates new contact in CRM directory + syncs to Google Sheets.
          // =======================================================================
          const createdContact = await api.createContact(sheetsPayload);
          setSavedPlatformContact(createdContact);
          onContactSaved(createdContact);

          setSavedContactName(
            createdContact.name
              ? `${createdContact.name} (${createdContact.company_name || 'Contact'})`
              : createdContact.company_name || 'Contact'
          );
          setToastTitle(sheetsSyncSuccess ? 'Saved to CRM & Synced to Sheets' : 'Saved to Google Sheets Queue');
          setToastMessage(
            sheetsSyncSuccess
              ? 'Contact saved into CRM directory and synced into Google Sheets.'
              : 'Contact saved in platform for Google Sheets. Open Sheets Grid and click Sync contacts to write to your spreadsheet.'
          );
          setWasSyncedToSheets(sheetsSyncSuccess);
          setSyncedSheetToastLabel(
            syncLabel || (sTargetSheetTitle && sTargetEmail ? `${sTargetSheetTitle} (${sTargetEmail})` : undefined)
          );
          setShowSuccessToast(true);

          setTimeout(() => {
            setSide1Image(null);
            setSide2Image(null);
            setExtractedData(null);
            setSavedPlatformContact(null);
            try {
              sessionStorage.removeItem(SCANNER_SESSION_KEY);
            } catch {}
          }, 500);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save contact.');
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  const resetAll = () => {
    setSide1Image(null);
    setSide2Image(null);
    setExtractedData(null);
    setSavedPlatformContact(null);
    setErrorMessage(null);
    try {
      sessionStorage.removeItem(SCANNER_SESSION_KEY);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* 2-3 Second Contact Saved Popup Toast */}
      <SuccessToast
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        title={toastTitle}
        message={toastMessage}
        contactName={savedContactName}
        syncedToSheets={wasSyncedToSheets}
        syncedSheetLabel={syncedSheetToastLabel}
        duration={2800}
      />

      {/* Top Error Alert */}
      {errorMessage && (
        <div className="bg-rose-950/70 border border-rose-500/50 backdrop-blur-md rounded-xl p-4 flex items-center justify-between text-xs text-rose-200 animate-in fade-in shadow-[0_0_20px_rgba(244,63,94,0.15)]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Camera Capture Modal */}
      {cameraActiveSide && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cyber-panel-glow max-w-lg w-full overflow-hidden space-y-4 p-5 rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Capture Card {cameraActiveSide === 'side1' ? 'Front (Side 1)' : 'Back (Side 2)'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Align visiting card inside holographic viewfinder and capture photo
                </p>
              </div>
              <button
                onClick={() => setCameraActiveSide(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded-lg hover:bg-slate-800/60"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-cyan-500/30">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Holographic targeting reticle */}
              <div className="absolute inset-8 border border-cyan-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-300"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-300"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300"></div>
                <span className="text-cyan-300 text-xs font-mono font-semibold bg-slate-950/80 border border-cyan-500/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  ALIGN BUSINESS CARD HERE
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title={`Switch Camera (Currently: ${cameraFacingMode === 'environment' ? 'Rear/Back' : 'Front'})`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{cameraFacingMode === 'environment' ? 'Switch to Front Cam' : 'Switch to Back Cam'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCameraActiveSide(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-950" />
                  <span>Snap Picture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 1: Scanner Input Mode */}
      {!extractedData ? (
        scanMode === 'live' ? (
          <LiveContinuousScanner
            onContactSaved={onContactSaved}
            onNavigateToContacts={onNavigateToContacts}
            onSwitchToManual={() => setScanMode('manual')}
          />
        ) : (
        <div className="space-y-4">
          {/* Streamlined Sub-Navbar with Segmented Tabs: Manual Scan first, Live Scan beside it */}
          <div className="cyber-panel px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl">
            <div className="flex items-center space-x-2.5">
              {onGoBack && (
                <button
                  type="button"
                  onClick={onGoBack}
                  className="group p-1.5 bg-slate-800/60 hover:bg-cyan-500/20 border border-slate-700/70 hover:border-cyan-500/40 rounded-xl text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="Navigate Back"
                  aria-label="Navigate Back"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </button>
              )}
              {/* Segmented Mode Switcher */}
              <div className="flex items-center p-0.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setScanMode('manual')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.liveScan.manualScanTab}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('live')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer text-slate-400 hover:text-cyan-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.liveScan.liveScanTab}</span>
                </button>
              </div>

              {(side1Image || side2Image) && (
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{side1Image && side2Image ? 'Dual Sides Ready' : 'Front Side Ready'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {(side1Image || side2Image) && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors px-2 py-1"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToContacts}
                className="text-xs font-semibold text-slate-300 hover:text-cyan-300 flex items-center space-x-1 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60"
              >
                <span>Contacts</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Dual Sided Upload Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Side 1: Front (Required) */}
            <div
              className={`cyber-panel p-4 flex flex-col transition-all duration-300 relative group overflow-hidden ${
                isDraggingSide1 ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.25)]' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingSide1(true);
              }}
              onDragLeave={() => setIsDraggingSide1(false)}
              onDrop={(e) => handleDrop(e, 'side1')}
            >
              {/* Subtle top edge neon highlight */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    1
                  </span>
                  <h3 className="text-xs font-bold text-slate-100">Front Side (Primary)</h3>
                  {side1Image ? (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.2 rounded-full flex items-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.2 rounded">
                      Required
                    </span>
                  )}
                </div>
                {side1Image && (
                  <button
                    onClick={() => setSide1Image(null)}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
                    title="Remove front image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Viewfinder Drop Zone */}
              <div className="relative flex-1 min-h-[230px] rounded-xl overflow-hidden flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/80 transition-all group scan-grid-pattern">
                {/* Viewfinder Corner Brackets */}
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 rounded-tl pointer-events-none" />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 rounded-tr pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 rounded-bl pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 rounded-br pointer-events-none" />

                {side1Image ? (
                  <div className="w-full h-full p-3 flex flex-col items-center justify-center relative">
                    <img
                      src={side1Image}
                      alt="Card Side 1"
                      className="max-h-52 object-contain rounded-lg shadow-md border border-slate-700/60"
                    />
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => side1InputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold shadow-lg hover:bg-slate-800 transition-colors"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraActiveSide('side1')}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg hover:from-cyan-400 hover:to-indigo-500 transition-colors flex items-center space-x-1"
                      >
                        <Camera className="w-3 h-3 text-slate-950" />
                        <span>Retake</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-5 space-y-2.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                      <ScanLine className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{t.scanner.dropzoneFront}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WEBP • Neural AI OCR Vision</p>
                    </div>
                    <div className="flex items-center justify-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => side1InputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t.scanner.browseFiles}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraActiveSide('side1')}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.scanner.useCamera}</span>
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={side1InputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'side1')}
                  className="hidden"
                />
              </div>
            </div>

            {/* Side 2: Back (Optional) */}
            <div
              className={`cyber-panel p-4 flex flex-col transition-all duration-300 relative group overflow-hidden ${
                isDraggingSide2 ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.25)]' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingSide2(true);
              }}
              onDragLeave={() => setIsDraggingSide2(false)}
              onDrop={(e) => handleDrop(e, 'side2')}
            >
              {/* Subtle top edge highlight */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-xs font-bold text-slate-100">Back Side (Secondary)</h3>
                  {side2Image ? (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.2 rounded-full flex items-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-800/60 border border-slate-700/60 px-1.5 py-0.2 rounded">
                      Optional
                    </span>
                  )}
                </div>
                {side2Image && (
                  <button
                    onClick={() => setSide2Image(null)}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
                    title="Remove back image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Viewfinder Drop Zone */}
              <div className="relative flex-1 min-h-[230px] rounded-xl overflow-hidden flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/80 transition-all group scan-grid-pattern">
                {/* Viewfinder Corner Brackets */}
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-slate-600 rounded-tl pointer-events-none" />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-slate-600 rounded-tr pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-slate-600 rounded-bl pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-slate-600 rounded-br pointer-events-none" />

                {side2Image ? (
                  <div className="w-full h-full p-3 flex flex-col items-center justify-center relative">
                    <img
                      src={side2Image}
                      alt="Card Side 2"
                      className="max-h-52 object-contain rounded-lg shadow-md border border-slate-700/60"
                    />
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => side2InputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold shadow-lg hover:bg-slate-800 transition-colors"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraActiveSide('side2')}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg hover:from-cyan-400 hover:to-indigo-500 transition-colors flex items-center space-x-1"
                      >
                        <Camera className="w-3 h-3 text-slate-950" />
                        <span>Retake</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-5 space-y-2.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                      <Upload className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{t.scanner.dropzoneBack}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Captures secondary phones, websites, & branch details</p>
                    </div>
                    <div className="flex items-center justify-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => side2InputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t.scanner.browseFiles}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraActiveSide('side2')}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.scanner.useCamera}</span>
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={side2InputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'side2')}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Command Bar: Extract Information */}
          <div className="cyber-panel px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl">
            <div className="flex items-center space-x-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  !side1Image
                    ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                    : side1Image && side2Image
                    ? 'bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse'
                    : 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                }`}
              />
              <span className="text-xs font-semibold text-slate-300">
                {!side1Image
                  ? 'Upload card front side to begin AI extraction'
                  : side1Image && side2Image
                  ? 'Dual-sided card ready for neural OCR extraction'
                  : 'Front side ready for AI extraction'}
              </span>
            </div>

            <button
              id="extract-information-btn"
              disabled={!side1Image || isScanning}
              onClick={handleTriggerScan}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shrink-0 cursor-pointer ${
                !side1Image || isScanning
                  ? 'bg-slate-800/70 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-slate-950 font-black shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-98'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-cyan-300">{t.scanner.extracting}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.scanner.scanButton}</span>
                </>
              )}
            </button>
          </div>

          {/* High-Production Loading Screen when Scanning */}
          {isScanning && (
            <div
              id="scanning-loading-screen"
              className="cyber-panel-glow p-6 space-y-5 animate-in fade-in zoom-in-98 duration-300 rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                      <span>Analyzing Visiting Card...</span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Elapsed: {scanElapsedTime}s • Neural OCR vision in progress
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  Step {scanStep} of 4
                </span>
              </div>

              {/* Visual Card Laser Scan Beam Animation */}
              {side1Image && (
                <div className="relative w-full max-w-md mx-auto h-48 bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2 border border-cyan-500/30">
                  <img
                    src={side1Image}
                    alt="Scanning target"
                    className="max-h-44 object-contain opacity-85 rounded"
                  />
                  {/* Glowing Holographic Laser Scan Line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[scanLaser_2s_ease-in-out_infinite]" />
                  <style>{`
                    @keyframes scanLaser {
                      0% { top: 5%; opacity: 0.2; }
                      50% { top: 90%; opacity: 1; }
                      100% { top: 5%; opacity: 0.2; }
                    }
                  `}</style>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 h-2 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    style={{ width: `${(scanStep / 4) * 100}%` }}
                  ></div>
                </div>

                {/* Micro Steps with Status Indicator */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      scanStep >= 1
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {scanStep > 1 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      )}
                      <span>1. Image Contrast</span>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      scanStep >= 2
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {scanStep > 2 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : scanStep === 2 ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                      )}
                      <span>2. Dual-Sided OCR</span>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      scanStep >= 3
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {scanStep > 3 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : scanStep === 3 ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                      )}
                      <span>3. Entity Structuring</span>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      scanStep >= 4
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {scanStep >= 4 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                      )}
                      <span>4. Verification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )
      ) : (
        /* Screen 2: Review, Verification & Save - Minimized Top Header & Split View */
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Minimized Top Banner Bar */}
          <div className="cyber-panel px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                type="button"
                onClick={() => setExtractedData(null)}
                className="group p-2 bg-slate-850 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 rounded-xl text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Back to Card Upload"
                aria-label="Back to Card Upload"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </button>
              {/* Card Mini Thumbnails */}
              <div className="flex items-center -space-x-2 shrink-0">
                {side1Image && (
                  <img
                    src={side1Image}
                    alt="Front thumbnail"
                    className="w-9 h-7 object-cover rounded border border-cyan-500/40 shadow-xs"
                  />
                )}
                {side2Image && (
                  <img
                    src={side2Image}
                    alt="Back thumbnail"
                    className="w-9 h-7 object-cover rounded border border-indigo-500/40 shadow-xs"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                    {extractedData.name || extractedData.company_name || 'Extracted Card Contact'}
                  </h2>
                  <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>OCR Parsed</span>
                  </span>
                  <span className="text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    తెలుగు & Indic Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {extractedData.designation ? `${extractedData.designation} • ` : ''}
                  {extractedData.company_name || 'Visiting card parsed'}
                  {extractedData.execution_time_ms && (
                    <span className="text-cyan-400/80 font-mono ml-1.5 hidden md:inline">
                      ({extractedData.execution_time_ms}ms)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={resetAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scan Another Card</span>
              </button>
            </div>
          </div>

          {/* Split-View Layout: Left Side Card Visual vs. Right Side Extracted Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Sticky Visual Source Card Preview (5 Columns) */}
            <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
              <div className="cyber-panel p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <ScanLine className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-slate-100">Visiting Card Image</h4>
                  </div>
                  {side2Image ? (
                    <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg text-[11px] border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setActiveSidePreview('side1')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          activeSidePreview === 'side1'
                            ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Front Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSidePreview('side2')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          activeSidePreview === 'side2'
                            ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Back Side
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded">
                      Front Side Only
                    </span>
                  )}
                </div>

                {/* Card Stage Image Display */}
                <div className="relative bg-black rounded-xl p-2 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden border border-slate-800 shadow-inner group">
                  <img
                    src={(activeSidePreview === 'side1' ? side1Image : side2Image) || side1Image || ''}
                    alt="Card Preview"
                    className="max-h-[340px] w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] rounded font-mono">
                    {activeSidePreview === 'side1' ? 'Side 1 (Front)' : 'Side 2 (Back)'}
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>AI Vision Accuracy</span>
                    <span className="text-cyan-400 font-mono font-bold">100% High Resolution</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Proofread the extracted text against the original card image on the left. All fields can be adjusted directly before saving.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Editable Contact Form (7 Columns) */}
            <div className="lg:col-span-7 cyber-panel p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                    Extracted Contact Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Edit or verify extracted information below
                  </p>
                </div>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  Editable Fields
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Contact Full Name *
                  </label>
                  <input
                    type="text"
                    value={extractedData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Company / Organization *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={extractedData.company_name}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      placeholder="e.g. Acme Inc"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                {/* Designation / Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={extractedData.designation}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                    placeholder="e.g. Vice President, Sales"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Website URL</label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={extractedData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      placeholder="www.company.com"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                {/* Phone Numbers List */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">Phone Numbers</label>
                    <button
                      type="button"
                      onClick={handleAddPhone}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Number</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {extractedData.mobile_numbers.map((phone, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => handleUpdatePhone(idx, e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                          />
                        </div>
                        {extractedData.mobile_numbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhone(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Addresses List */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">Email Addresses</label>
                    <button
                      type="button"
                      onClick={handleAddEmail}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Email</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {extractedData.email_addresses.map((email, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleUpdateEmail(idx, e.target.value)}
                            placeholder="name@domain.com"
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                          />
                        </div>
                        {extractedData.email_addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">LinkedIn Profile</label>
                  <div className="relative">
                    <Share2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={extractedData.linkedin}
                      onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                {/* Physical Address */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Office / Physical Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <textarea
                      rows={2}
                      value={extractedData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                {/* Other Details / Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Other Details / Discovered Notes
                  </label>
                  <textarea
                    rows={2}
                    value={extractedData.other_details}
                    onChange={(e) => handleFieldChange('other_details', e.target.value)}
                    placeholder="Additional context from card..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>

                {/* Tags */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>

                {/* 1. Direct Save to Platform (Contact CRM Directory) */}
                <div className="sm:col-span-2 cyber-panel-glow rounded-xl p-4 space-y-3.5 border border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-100 block">
                            Save Contact to Platform (CRM Directory)
                          </span>
                          {savedPlatformContact && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              Saved in CRM Directory
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Store contact directly into your CardFlow CRM directory (Local/Cloud database). Keeps review page open to optionally sync with Google Sheets.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Independent Target Gmail & Spreadsheet Table Configuration for Platform */}
                  <div className="pt-2 border-t border-indigo-500/20 space-y-3">
                    {googleAccounts.length === 0 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/80 p-3 rounded-lg border border-indigo-500/20 text-xs">
                        <span className="text-slate-400 leading-relaxed text-[11px]">
                          Optional: Connect a Google account to associate this platform CRM contact with your account space.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConnectGoogleForSection('platform')}
                          disabled={isConnectingPlatformGoogle}
                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
                        >
                          {isConnectingPlatformGoogle ? 'Connecting...' : '+ Connect Gmail'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. Platform Account Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-300">
                              1. Target Gmail Account (Platform)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleConnectGoogleForSection('platform')}
                              disabled={isConnectingPlatformGoogle}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
                            >
                              + Connect Another Gmail
                            </button>
                          </div>
                          <select
                            value={platformAccountEmail || ''}
                            onChange={(e) => setPlatformAccountEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-cyan-500 font-medium"
                          >
                            {googleAccounts.map((acc) => (
                              <option key={acc.email} value={acc.email}>
                                {acc.email} ({acc.sheets?.length || 0} tables)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Platform Sheet Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-300">
                              2. Target Spreadsheet Table (Platform)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleCreateNewSheetForSection('platform')}
                              disabled={isCreatingPlatformSheet}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{isCreatingPlatformSheet ? 'Creating...' : 'New Table'}</span>
                            </button>
                          </div>
                          {(() => {
                            const currentAcc = googleAccounts.find(
                              (a) => a.email.toLowerCase() === platformAccountEmail?.toLowerCase()
                            );
                            const availableSheets = currentAcc?.sheets || [];
                            return (
                              <select
                                value={platformSheetId || ''}
                                onChange={(e) => setPlatformSheetId(e.target.value)}
                                disabled={availableSheets.length === 0}
                                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-cyan-500 font-medium"
                              >
                                {availableSheets.length === 0 ? (
                                  <option value="">No tables in this account - click "New Table"</option>
                                ) : (
                                  availableSheets.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title} ({s.rowCount !== undefined ? `${s.rowCount} rows` : 'Active Matrix'})
                                    </option>
                                  ))
                                )}
                              </select>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Platform Target Summary */}
                    {platformAccountEmail && platformSheetId && (
                      <div className="flex items-center space-x-2 text-[11px] text-cyan-200 bg-slate-900/90 px-3 py-2 rounded-lg border border-cyan-500/30">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          Platform Target: <strong>{googleAccounts.find(a => a.email.toLowerCase() === platformAccountEmail.toLowerCase())?.sheets.find(s => s.id === platformSheetId)?.title || 'Selected Table'}</strong> under <strong>{platformAccountEmail}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {savedPlatformContact ? (
                    <div className="p-3 bg-indigo-950/60 rounded-lg border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Stored in CRM as <strong>{savedPlatformContact.name || savedPlatformContact.company_name}</strong>. You can modify details above and click <strong>Update CRM Contact</strong>, or sync to Google Sheets below.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                      <span>
                        Saves this record into your internal CRM directory. If you also wish to mirror it to Google Sheets, you can do so in the independent section below.
                      </span>
                    </div>
                  )}

                  {/* Action Buttons for Platform Save */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {savedPlatformContact
                        ? 'Contact record exists in CRM directory.'
                        : 'Saves to CRM directory only (no Google Sheets sync yet).'}
                    </span>
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end shrink-0">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        id="save-to-contacts-btn"
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveContact(false)}
                        className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {isSaving && savingAction === 'contacts' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isSaving && savingAction === 'contacts'
                            ? t.common.loading
                            : savedPlatformContact
                            ? t.scanner.saveToPlatform
                            : t.scanner.saveToPlatform}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Google Sheets Multi-Account & Multi-Sheet Synchronization Section */}
                <div className="sm:col-span-2 cyber-panel rounded-xl p-4 space-y-3.5 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 block">
                        Google Sheets Synchronization (Sheets Directory)
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Saves contact to CRM directory and synchronizes directly into Google Sheets
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20 space-y-3">
                    {googleAccounts.length === 0 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/80 p-3.5 rounded-lg border border-emerald-500/30 text-xs">
                        <span className="text-slate-400 leading-relaxed">
                          No Google accounts connected yet. Connect your Google account to automatically mirror contacts into your spreadsheet.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConnectGoogleForSection('sheets')}
                          disabled={isConnectingSheetsGoogle}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-semibold shrink-0 transition-colors shadow-xs cursor-pointer"
                        >
                          {isConnectingSheetsGoogle ? 'Connecting...' : '+ Connect Gmail Account'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. Account Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-300">
                              1. Target Gmail Account (Sheets Sync)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleConnectGoogleForSection('sheets')}
                              disabled={isConnectingSheetsGoogle}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              + Connect Another Gmail
                            </button>
                          </div>
                          <select
                            value={sheetsAccountEmail || ''}
                            onChange={(e) => setSheetsAccountEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-emerald-500 font-medium"
                          >
                            {googleAccounts.map((acc) => (
                              <option key={acc.email} value={acc.email}>
                                {acc.email} ({acc.sheets?.length || 0} tables)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Sheet Selector in selected account */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-300">
                              2. Target Spreadsheet Table (Sheets Sync)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleCreateNewSheetForSection('sheets')}
                              disabled={isCreatingSheetsSheet}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{isCreatingSheetsSheet ? 'Creating...' : 'New Table'}</span>
                            </button>
                          </div>
                          {(() => {
                            const currentAcc = googleAccounts.find(
                              (a) => a.email.toLowerCase() === sheetsAccountEmail?.toLowerCase()
                            );
                            const availableSheets = currentAcc?.sheets || [];
                            return (
                              <select
                                value={sheetsSheetId || ''}
                                onChange={(e) => setSheetsSheetId(e.target.value)}
                                disabled={availableSheets.length === 0}
                                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-emerald-500 font-medium"
                              >
                                {availableSheets.length === 0 ? (
                                  <option value="">No tables in this account - click "New Table"</option>
                                ) : (
                                  availableSheets.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title} ({s.rowCount !== undefined ? `${s.rowCount} rows` : 'Active Matrix'})
                                    </option>
                                  ))
                                )}
                              </select>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Selected Destination Summary */}
                    {sheetsAccountEmail && sheetsSheetId && (
                      <div className="flex items-center space-x-2 text-[11px] text-emerald-200 bg-slate-900/90 px-3 py-2 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Sheets Target: Row will be appended to <strong>{googleAccounts.find(a => a.email.toLowerCase() === sheetsAccountEmail.toLowerCase())?.sheets.find(s => s.id === sheetsSheetId)?.title || 'Selected Sheet'}</strong> under <strong>{sheetsAccountEmail}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Action Buttons for Google Sheets Sync */}
                  <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-emerald-300 font-medium">
                      Saves contact into CRM directory and synchronizes directly into Google Sheets. Closes review to scan next card.
                    </span>
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end shrink-0">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        id="save-and-sync-to-sheet-btn"
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveContact(true)}
                        className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:via-teal-300 hover:to-cyan-300 rounded-lg shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer active:scale-98"
                      >
                        {isSaving && savingAction === 'sync' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
                        )}
                        <span>
                          {isSaving && savingAction === 'sync'
                            ? t.sheets.syncingStatus
                            : t.scanner.saveAndSyncSheets}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
