import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  ScanLine,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  FastForward,
  RotateCcw,
  Users,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Pause,
  Play,
  Square,
  Globe,
  Tag,
  FileText,
  Lock,
  Minimize2,
  Maximize2,
  Eye,
  UserCheck,
  Zap,
  Target,
  Layers,
  Sparkle,
  Clock,
  Timer,
  Filter,
  Upload,
} from 'lucide-react';
import { api } from '../../services/api';
import { VisitingCardScanResult, Contact } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { requestCameraStream } from '../../utils/camera';
import {
  GoogleAccountSpace,
  getStoredGoogleAccounts,
  getActiveAccountEmail,
  appendContactToGoogleSheet,
  createGoogleSheet,
  addOrUpdateAccountSpace,
} from '../../services/googleSheets';
import {
  getAccessToken,
  getAccessTokenForEmail,
  setAccessTokenForEmail,
  googleSignIn,
  isUserCancelledAuth,
} from '../../services/firebaseAuth';

interface LiveScannedCardItem {
  id: string;
  frontImage: string;
  backImage?: string;
  data: VisitingCardScanResult;
  timestamp: string;
  status: 'pending' | 'saved_crm' | 'synced_sheets' | 'error';
  errorMessage?: string;
}

interface LiveContinuousScannerProps {
  onContactSaved: (contact: Contact) => void;
  onNavigateToContacts: () => void;
  onSwitchToManual: () => void;
}

// Pleasant audio chime synthesizer using Web Audio API
const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio synthesis fallback silent
  }
};

// High-speed auto-lock detection chime
const playLockChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.08); // C6

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Silent
  }
};

export const LiveContinuousScanner: React.FC<LiveContinuousScannerProps> = ({
  onContactSaved,
  onNavigateToContacts,
  onSwitchToManual,
}) => {
  const { t } = useLanguage();

  type LivePhase =
    | 'camera_live'
    | 'processing_front'
    | 'success_front'
    | 'prompt_back'
    | 'processing_back'
    | 'success_card'
    | 'review_batch';

  const [phase, setPhase] = useState<LivePhase>('camera_live');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraMinimized, setIsCameraMinimized] = useState<boolean>(false);
  const [zoomPreviewImage, setZoomPreviewImage] = useState<string | null>(null);
  const [showNullFilterModal, setShowNullFilterModal] = useState<boolean>(false);

  // Helper to verify if extracted data has real contact details
  const hasExtractedContactData = (data: VisitingCardScanResult | null | undefined): boolean => {
    if (!data) return false;
    const nameVal = (data.name || '').trim();
    const isGenericName =
      !nameVal ||
      nameVal === 'Unnamed Contact' ||
      nameVal === 'Business Contact' ||
      nameVal === 'Unknown' ||
      nameVal.toLowerCase().includes('sample');
    const hasCompany = Boolean((data.company_name || '').trim());
    const hasPhone = Boolean(data.mobile_numbers && data.mobile_numbers.some((p) => p && p.trim().length > 0));
    const hasEmail = Boolean(data.email_addresses && data.email_addresses.some((e) => e && e.trim().length > 0));
    const hasDesignation = Boolean((data.designation || '').trim());
    const hasWebsite = Boolean((data.website || '').trim());
    const hasAddress = Boolean((data.address || '').trim());
    const hasOtherDetails = Boolean((data.other_details || '').trim().length > 10);

    return !isGenericName || hasCompany || hasPhone || hasEmail || hasDesignation || hasWebsite || hasAddress || hasOtherDetails;
  };

  // Helper to identify empty / null card scan items
  const isNullCard = (card: LiveScannedCardItem): boolean => {
    if (!card || !card.data) return true;
    return !hasExtractedContactData(card.data);
  };

  // Auto-Detection & Instant Extraction System
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoScanMode, setAutoScanMode] = useState<'single' | 'dual'>('dual');
  const [detectionStatus, setDetectionStatus] = useState<'searching' | 'detected' | 'locked' | 'extracting'>('searching');
  const [detectionProgress, setDetectionProgress] = useState<number>(0);
  const [lastExtractedBanner, setLastExtractedBanner] = useState<{
    name: string;
    company?: string;
    count: number;
  } | null>(null);

  // 2-Second Step Cooldown & Re-Arming System
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [cooldownPhaseText, setCooldownPhaseText] = useState<string>('');
  const cooldownTimerRef = useRef<NodeJS.Timeout[]>([]);

  const isAutoExtractingRef = useRef<boolean>(false);
  const cooldownUntilRef = useRef<number>(0);
  const steadyCountRef = useRef<number>(0);
  const lastSampleLumaRef = useRef<number[] | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const clearCooldownTimers = () => {
    cooldownTimerRef.current.forEach((t) => clearTimeout(t));
    cooldownTimerRef.current = [];
  };

  const triggerCooldownCountdown = (targetPhase: LivePhase, message: string, onComplete?: () => void) => {
    clearCooldownTimers();
    isAutoExtractingRef.current = true;
    steadyCountRef.current = 0;
    lastSampleLumaRef.current = null;
    cooldownUntilRef.current = Date.now() + 2300;
    setDetectionStatus('searching');
    setDetectionProgress(0);
    setCooldownPhaseText(message);
    setCooldownSeconds(2);

    const t1 = setTimeout(() => {
      setCooldownSeconds(1);
    }, 1000);

    const t2 = setTimeout(() => {
      setCooldownSeconds(null);
      setPhase(targetPhase);
      steadyCountRef.current = 0;
      lastSampleLumaRef.current = null;
      isAutoExtractingRef.current = false;
      cooldownUntilRef.current = Date.now() + 250;
      if (onComplete) onComplete();
    }, 2000);

    cooldownTimerRef.current = [t1, t2];
  };

  // Batch accumulation list
  const [batchCards, setBatchCards] = useState<LiveScannedCardItem[]>([]);
  const [currentCardNumber, setCurrentCardNumber] = useState<number>(1);

  // Current In-Progress Card Buffers
  const [currentFrontImage, setCurrentFrontImage] = useState<string | null>(null);
  const [currentBackImage, setCurrentBackImage] = useState<string | null>(null);
  const [currentFrontData, setCurrentFrontData] = useState<VisitingCardScanResult | null>(null);

  // Editing Modal State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<VisitingCardScanResult | null>(null);
  const [editNewPhone, setEditNewPhone] = useState('');
  const [editNewEmail, setEditNewEmail] = useState('');

  // Dual destination settings for Edit Modal and Single card saves
  const [editAccountEmail, setEditAccountEmail] = useState<string | null>(null);
  const [editSheetId, setEditSheetId] = useState<string | null>(null);
  const [isConnectingEditGoogle, setIsConnectingEditGoogle] = useState<boolean>(false);
  const [isCreatingEditSheet, setIsCreatingEditSheet] = useState<boolean>(false);

  // Video & Stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Google Accounts & Sheets Batch Destination
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountSpace[]>(() => getStoredGoogleAccounts());
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(() => {
    return getActiveAccountEmail() || (getStoredGoogleAccounts()[0]?.email || null);
  });
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [batchTags, setBatchTags] = useState('Visiting Card, Live Scan');

  // New Sheet Modal
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Saving states & notifications
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Single card action in-flight ids
  const [savingSingleId, setSavingSingleId] = useState<string | null>(null);
  const [savingActionType, setSavingActionType] = useState<'crm' | 'sheets' | null>(null);

  // Sync Google Account & active sheet on mount or change
  useEffect(() => {
    const accs = getStoredGoogleAccounts();
    setGoogleAccounts(accs);
    const activeEmail = selectedAccountEmail || getActiveAccountEmail() || accs[0]?.email || null;
    if (activeEmail && !selectedAccountEmail) {
      setSelectedAccountEmail(activeEmail);
    }
    const acc = accs.find((a) => a.email.toLowerCase() === (activeEmail || '').toLowerCase()) || accs[0];
    if (acc && acc.sheets && acc.sheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(acc.sheets[0].id);
    }
  }, [selectedAccountEmail, selectedSheetId]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Camera facing mode state (environment = Back camera, user = Front camera)
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');

  // Start Camera Stream
  const startCamera = useCallback(async (modeOverride?: 'environment' | 'user') => {
    setCameraError(null);
    const targetMode = modeOverride || cameraFacingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const mediaStream = await requestCameraStream(targetMode);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Live camera error:', err);
      setCameraError(
        err?.message || t.liveScan.cameraPermissionNeeded || 'Could not start video source. Please check camera permissions.'
      );
    }
  }, [cameraFacingMode, t.liveScan.cameraPermissionNeeded]);

  const toggleCameraFacingMode = useCallback(() => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  }, [cameraFacingMode, startCamera]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera when in live modes
  useEffect(() => {
    if (phase !== 'review_batch') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [phase, startCamera, stopCamera]);

  // Grab snapshot from video stream
  const grabFrameFromVideo = (): string | null => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // Auto-dismiss last extracted banner after 3.8 seconds
  useEffect(() => {
    if (lastExtractedBanner) {
      const timer = setTimeout(() => {
        setLastExtractedBanner(null);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [lastExtractedBanner]);

  // -------------------------------------------------------------
  // Workflow Step 1: Capture and Extract Front Side (Manual or Auto)
  // -------------------------------------------------------------
  const handleAutoExtractFront = async (frame: string) => {
    if (isAutoExtractingRef.current) return;
    isAutoExtractingRef.current = true;
    setDetectionStatus('extracting');
    setPhase('processing_front');
    setCurrentFrontImage(frame);
    playLockChime();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    try {
      const response = await api.scanCard(frame);
      const extracted = response.data;

      // Ensure extracted data contains actual card text / contact details
      if (!hasExtractedContactData(extracted)) {
        showToast('No card text detected in frame. Please align visiting card clearly.', 'error');
        setPhase('camera_live');
        setDetectionStatus('searching');
        setDetectionProgress(0);
        isAutoExtractingRef.current = false;
        cooldownUntilRef.current = Date.now() + 2000;
        return;
      }

      playSuccessChime();

      if (autoScanMode === 'single') {
        const nextNum = batchCards.length + 1;
        const newCardItem: LiveScannedCardItem = {
          id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          frontImage: frame,
          data: extracted,
          timestamp: new Date().toISOString(),
          status: 'pending',
        };
        setBatchCards((prev) => [...prev, newCardItem]);
        setLastExtractedBanner({
          name: extracted.name || 'Business Contact',
          company: extracted.company_name,
          count: nextNum,
        });
        setPhase('success_card');

        // Show brief success badge (700ms), then start 2-second pause before detecting next card
        setTimeout(() => {
          setCurrentFrontImage(null);
          setCurrentFrontData(null);
          setCurrentCardNumber(nextNum + 1);
          triggerCooldownCountdown('camera_live', `Ready for Card #${nextNum + 1} in`);
        }, 750);
      } else {
        // Dual-sided auto mode
        setCurrentFrontData(extracted);
        setPhase('success_front');

        // Show front success (750ms), then start 2-second pause before detecting backside
        setTimeout(() => {
          triggerCooldownCountdown('prompt_back', 'Flip to Backside — Ready in');
        }, 750);
      }
    } catch (err: any) {
      console.error('Auto front extraction error:', err);
      setCameraError(`Extraction error: ${err.message || 'Please realign card and try again.'}`);
      setPhase('camera_live');
      setDetectionStatus('searching');
      setDetectionProgress(0);
      isAutoExtractingRef.current = false;
      cooldownUntilRef.current = Date.now() + 1500;
    }
  };

  const handleCaptureFront = async () => {
    if (phase !== 'camera_live' || isAutoExtractingRef.current || cooldownSeconds !== null) return;
    const frame = grabFrameFromVideo();
    if (!frame) return;
    await handleAutoExtractFront(frame);
  };

  // -------------------------------------------------------------
  // Workflow Step 2A: Skip Backside (Proceed with Front-Only)
  // -------------------------------------------------------------
  const handleSkipBackside = () => {
    if (!currentFrontData || !currentFrontImage) return;

    const nextNum = batchCards.length + 1;
    const newCardItem: LiveScannedCardItem = {
      id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      frontImage: currentFrontImage,
      data: currentFrontData,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    playSuccessChime();
    setBatchCards((prev) => [...prev, newCardItem]);
    setLastExtractedBanner({
      name: currentFrontData.name || 'Business Contact',
      company: currentFrontData.company_name,
      count: nextNum,
    });
    setPhase('success_card');

    setTimeout(() => {
      setCurrentFrontImage(null);
      setCurrentBackImage(null);
      setCurrentFrontData(null);
      setCurrentCardNumber(nextNum + 1);
      triggerCooldownCountdown('camera_live', `Ready for Card #${nextNum + 1} in`);
    }, 750);
  };

  // -------------------------------------------------------------
  // Workflow Step 2B: Capture & Merge Backside
  // -------------------------------------------------------------
  const handleAutoExtractBack = async (backFrame: string) => {
    if (isAutoExtractingRef.current || !currentFrontImage) return;
    isAutoExtractingRef.current = true;
    setDetectionStatus('extracting');
    setPhase('processing_back');
    setCurrentBackImage(backFrame);
    playLockChime();

    try {
      const response = await api.scanCard(currentFrontImage, backFrame);
      const merged = response.data;
      playSuccessChime();

      const nextNum = batchCards.length + 1;
      const newCardItem: LiveScannedCardItem = {
        id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        frontImage: currentFrontImage,
        backImage: backFrame,
        data: merged,
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      setBatchCards((prev) => [...prev, newCardItem]);
      setLastExtractedBanner({
        name: merged.name || 'Business Contact',
        company: merged.company_name,
        count: nextNum,
      });
      setPhase('success_card');

      setTimeout(() => {
        setCurrentFrontImage(null);
        setCurrentBackImage(null);
        setCurrentFrontData(null);
        setCurrentCardNumber(nextNum + 1);
        triggerCooldownCountdown('camera_live', `Ready for Card #${nextNum + 1} in`);
      }, 750);
    } catch (err: any) {
      console.error('Backside extraction error:', err);
      handleSkipBackside();
    }
  };

  const handleCaptureBack = async () => {
    if (phase !== 'prompt_back' || !currentFrontImage || isAutoExtractingRef.current || cooldownSeconds !== null) return;
    const backFrame = grabFrameFromVideo();
    if (!backFrame) return;
    await handleAutoExtractBack(backFrame);
  };

  // -------------------------------------------------------------
  // Real-Time Card Structure Detection & Auto-Capture Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (!autoScanEnabled || isPaused || cooldownSeconds !== null || (phase !== 'camera_live' && phase !== 'prompt_back')) {
      return;
    }

    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = document.createElement('canvas');
      sampleCanvasRef.current.width = 160;
      sampleCanvasRef.current.height = 100;
    }

    const interval = setInterval(() => {
      if (
        isPaused ||
        cooldownSeconds !== null ||
        isAutoExtractingRef.current ||
        Date.now() < cooldownUntilRef.current ||
        !videoRef.current ||
        videoRef.current.readyState < 2
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = sampleCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Sample central 65% width and 50% height (matching the target card viewport frame)
      const cropW = video.videoWidth * 0.65;
      const cropH = video.videoHeight * 0.50;
      const cropX = (video.videoWidth - cropW) / 2;
      const cropY = (video.videoHeight - cropH) / 2;

      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cw, ch);
      const imgData = ctx.getImageData(0, 0, cw, ch);
      const data = imgData.data;

      // Extract 2D luminance grid for card-structure and text-density analysis
      const lumaGrid: number[][] = [];
      let sumLuma = 0;
      let sumSqLuma = 0;
      let totalPixels = 0;

      for (let y = 0; y < ch; y += 2) {
        const row: number[] = [];
        for (let x = 0; x < cw; x += 2) {
          const idx = (y * cw + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          row.push(luma);
          sumLuma += luma;
          sumSqLuma += luma * luma;
          totalPixels++;
        }
        lumaGrid.push(row);
      }

      const gridRows = lumaGrid.length;
      const gridCols = lumaGrid[0]?.length || 0;
      if (gridRows === 0 || gridCols === 0 || totalPixels === 0) return;

      const mean = sumLuma / totalPixels;
      const variance = sumSqLuma / totalPixels - mean * mean;
      const stdDev = Math.sqrt(Math.max(0, variance));

      // 1. Text & High-Frequency Typographic Edge Analysis (Sobel dx + dy gradient filter)
      // Business cards feature sharp printed text rows (letters, numbers, icons).
      // Smooth human skin, plain clothing, room walls have very few sharp typographic transitions.
      let sharpTextEdges = 0;
      let sampledEdgeCount = 0;
      const rowEdges: number[] = new Array(gridRows).fill(0);

      for (let r = Math.floor(gridRows * 0.12); r < Math.floor(gridRows * 0.88); r++) {
        for (let c = 1; c < gridCols - 1; c++) {
          const dx = Math.abs(lumaGrid[r][c + 1] - lumaGrid[r][c - 1]);
          const dy =
            r > 0 && r < gridRows - 1
              ? Math.abs(lumaGrid[r + 1][c] - lumaGrid[r - 1][c])
              : 0;
          const gradient = dx + dy;

          if (gradient > 38 && dx > 20) {
            sharpTextEdges++;
            rowEdges[r]++;
          }
          sampledEdgeCount++;
        }
      }

      const textEdgeDensity = sampledEdgeCount > 0 ? sharpTextEdges / sampledEdgeCount : 0;
      // Real visiting cards have text rows spanning at least 8 distinct horizontal rows
      const textRowCount = rowEdges.filter((cnt) => cnt >= 4).length;

      // 2. Strict Card-Structure Verification
      // A legitimate visiting card has:
      // - Standard deviation >= 26 (distinct high contrast text/background)
      // - Mean luminance in reasonable ambient range (28 to 230)
      // - Text Edge Density between 0.09 (9%) and 0.36 (36%)
      // - Text row count >= 8
      const isCardStructure =
        stdDev >= 26 &&
        mean >= 28 &&
        mean <= 230 &&
        textEdgeDensity >= 0.09 &&
        textEdgeDensity <= 0.36 &&
        textRowCount >= 8;

      // 40 spatial probe points for frame-to-frame stillness validation
      const currentSamples: number[] = [];
      const stepR = Math.max(1, Math.floor(gridRows / 8));
      const stepC = Math.max(1, Math.floor(gridCols / 5));
      for (let r = 0; r < gridRows; r += stepR) {
        for (let c = 0; c < gridCols; c += stepC) {
          if (lumaGrid[r] && lumaGrid[r][c] !== undefined) {
            currentSamples.push(lumaGrid[r][c]);
          }
        }
      }

      if (isCardStructure) {
        let diff = 0;
        if (lastSampleLumaRef.current && lastSampleLumaRef.current.length === currentSamples.length) {
          for (let i = 0; i < currentSamples.length; i++) {
            diff += Math.abs(currentSamples[i] - lastSampleLumaRef.current[i]);
          }
          diff = diff / currentSamples.length;
        }
        lastSampleLumaRef.current = currentSamples;

        // Stillness verification (user holding card steady in view)
        const isSteady = diff < 8;

        if (isSteady) {
          steadyCountRef.current += 1;
          // Require 7 steady samples at 160ms = ~1.1s steady hold before locking
          const progress = Math.min(100, Math.round((steadyCountRef.current / 7) * 100));
          setDetectionProgress(progress);
          setDetectionStatus('locked');

          if (steadyCountRef.current >= 7) {
            const frame = grabFrameFromVideo();
            if (frame) {
              if (phase === 'camera_live') {
                handleAutoExtractFront(frame);
              } else if (phase === 'prompt_back') {
                handleAutoExtractBack(frame);
              }
            }
          }
        } else {
          // Card moving or aligning
          steadyCountRef.current = Math.max(0, steadyCountRef.current - 1);
          setDetectionStatus('detected');
          setDetectionProgress(Math.min(30, steadyCountRef.current * 8));
        }
      } else {
        // No card structure present (face, body, background, or blank)
        steadyCountRef.current = 0;
        lastSampleLumaRef.current = null;
        setDetectionStatus('searching');
        setDetectionProgress(0);
      }
    }, 160);

    return () => clearInterval(interval);
  }, [autoScanEnabled, isPaused, cooldownSeconds, phase, autoScanMode]);

  // -------------------------------------------------------------
  // Transition to Batch Review Screen
  // -------------------------------------------------------------
  const handleStopLiveScan = () => {
    if (currentFrontData && currentFrontImage) {
      const finalCard: LiveScannedCardItem = {
        id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        frontImage: currentFrontImage,
        backImage: currentBackImage || undefined,
        data: currentFrontData,
        timestamp: new Date().toISOString(),
        status: 'pending',
      };
      setBatchCards((prev) => [...prev, finalCard]);
      setCurrentFrontImage(null);
      setCurrentFrontData(null);
    }
    setPhase('review_batch');
  };

  // Resume Live Camera
  const handleResumeLiveScan = () => {
    setPhase('camera_live');
    startCamera();
  };

  // Delete Card from Batch
  const handleDeleteCard = (cardId: string) => {
    setBatchCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // Open Edit Modal for a specific card
  const handleOpenEditModal = (card: LiveScannedCardItem) => {
    setEditingCardId(card.id);
    setEditFormData(JSON.parse(JSON.stringify(card.data)));
    setEditNewPhone('');
    setEditNewEmail('');
    const targetEmail = selectedAccountEmail || googleAccounts[0]?.email || null;
    setEditAccountEmail(targetEmail);
    const acc = googleAccounts.find((a) => a.email.toLowerCase() === targetEmail?.toLowerCase()) || googleAccounts[0];
    setEditSheetId(selectedSheetId || acc?.sheets[0]?.id || null);
  };

  const handleConnectEditGoogle = async () => {
    setIsConnectingEditGoogle(true);
    try {
      const result = await googleSignIn();
      const userEmail = result.user.email;
      if (userEmail) {
        setAccessTokenForEmail(userEmail, result.accessToken);
        const space = addOrUpdateAccountSpace({
          email: userEmail,
          displayName: result.user.displayName || undefined,
        });
        const updated = getStoredGoogleAccounts();
        setGoogleAccounts(updated);
        setEditAccountEmail(userEmail);
        setSelectedAccountEmail(userEmail);
        if (space.sheets && space.sheets.length > 0) {
          setEditSheetId(space.sheets[0].id);
          setSelectedSheetId(space.sheets[0].id);
        }
        showToast(`Connected Google Account: ${userEmail}`);
      }
    } catch (err: any) {
      if (!isUserCancelledAuth(err)) {
        showToast(`Google connect failed: ${err.message}`, 'error');
      }
    } finally {
      setIsConnectingEditGoogle(false);
    }
  };

  const handleCreateNewSheetForEdit = async () => {
    const acc = googleAccounts.find((a) => a.email.toLowerCase() === editAccountEmail?.toLowerCase()) || googleAccounts[0];
    if (!acc) {
      showToast('Please connect a Google Account first.', 'error');
      return;
    }
    let token = getAccessTokenForEmail(acc.email);
    if (!token) token = await getAccessToken();
    if (!token) {
      showToast('Please authenticate with Google first.', 'error');
      return;
    }

    const defaultTitle = `CardFlow CRM - Leads ${new Date().toLocaleDateString()}`;
    const titlePrompt = window.prompt ? window.prompt('Enter new spreadsheet name:', defaultTitle) : defaultTitle;
    const finalTitle = titlePrompt?.trim() || defaultTitle;

    setIsCreatingEditSheet(true);
    try {
      const sheet = await createGoogleSheet(token, finalTitle, acc.email);
      const updated = getStoredGoogleAccounts();
      setGoogleAccounts(updated);
      setEditSheetId(sheet.id);
      setSelectedSheetId(sheet.id);
      showToast(`Created spreadsheet: "${sheet.title}"`);
    } catch (err: any) {
      showToast(`Failed to create spreadsheet: ${err.message}`, 'error');
    } finally {
      setIsCreatingEditSheet(false);
    }
  };

  // Save changes from Edit Modal
  const handleSaveEditedCard = () => {
    if (!editingCardId || !editFormData) return;
    setBatchCards((prev) =>
      prev.map((c) => (c.id === editingCardId ? { ...c, data: { ...editFormData } } : c))
    );
    setEditingCardId(null);
    setEditFormData(null);
    showToast('Contact details updated successfully!');
  };

  // Save directly from Edit Modal into CRM Directory
  const handleSaveEditModalToCRM = async () => {
    if (!editingCardId || !editFormData) return;
    const card = batchCards.find((c) => c.id === editingCardId);
    if (!card) return;

    setSavingSingleId(editingCardId);
    setSavingActionType('crm');
    try {
      const parsedTags = batchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        name: editFormData.name || 'Business Contact',
        company_name: editFormData.company_name || '',
        designation: editFormData.designation || '',
        mobile_numbers: (editFormData.mobile_numbers || []).filter(Boolean),
        email_addresses: (editFormData.email_addresses || []).filter(Boolean),
        website: editFormData.website || '',
        address: editFormData.address || '',
        linkedin: editFormData.linkedin || '',
        other_details: editFormData.other_details || '',
        source: 'CARD_SCAN' as const,
        tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
        sync_to_sheets: false,
        synced_to_sheets: false,
      };
      const saved = await api.createContact(payload);
      onContactSaved(saved);

      setBatchCards((prev) =>
        prev.map((c) => (c.id === editingCardId ? { ...c, data: { ...editFormData }, status: 'saved_crm' } : c))
      );
      setEditingCardId(null);
      setEditFormData(null);
      showToast(`Saved "${saved.name}" to CRM directory!`);
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSavingSingleId(null);
      setSavingActionType(null);
    }
  };

  // Save directly from Edit Modal and Synchronize to Google Sheets
  const handleSaveEditModalToSheets = async () => {
    if (!editingCardId || !editFormData) return;
    const card = batchCards.find((c) => c.id === editingCardId);
    if (!card) return;

    setSavingSingleId(editingCardId);
    setSavingActionType('sheets');

    let currentAcc = googleAccounts.find(
      (a) => a.email.toLowerCase() === editAccountEmail?.toLowerCase()
    ) || googleAccounts[0];
    let currentSheet = currentAcc?.sheets.find((s) => s.id === editSheetId) || currentAcc?.sheets[0];

    if (!currentAcc || !currentSheet) {
      try {
        const result = await googleSignIn();
        const userEmail = result.user.email;
        if (userEmail) {
          setAccessTokenForEmail(userEmail, result.accessToken);
          const space = addOrUpdateAccountSpace({
            email: userEmail,
            displayName: result.user.displayName || undefined,
          });
          let targetSheet = space.sheets[0];
          if (!targetSheet) {
            targetSheet = await createGoogleSheet(
              result.accessToken,
              `CardFlow CRM - ${userEmail.split('@')[0]} Contacts`,
              userEmail
            );
          }
          const updated = getStoredGoogleAccounts();
          setGoogleAccounts(updated);
          currentAcc = space;
          currentSheet = targetSheet || space.sheets[0];
          setEditAccountEmail(userEmail);
          if (currentSheet) setEditSheetId(currentSheet.id);
        }
      } catch (authErr: any) {
        if (!isUserCancelledAuth(authErr)) {
          showToast('Google sign-in required for Google Sheets.', 'error');
        }
        setSavingSingleId(null);
        setSavingActionType(null);
        return;
      }
    }

    if (!currentAcc || !currentSheet) {
      showToast('Please select a Google Sheet spreadsheet.', 'error');
      setSavingSingleId(null);
      setSavingActionType(null);
      return;
    }

    let token = currentAcc.email ? getAccessTokenForEmail(currentAcc.email) : null;
    if (!token) token = await getAccessToken();

    let sheetsSuccess = false;
    if (token && currentSheet) {
      try {
        const syncSuccess = await appendContactToGoogleSheet(
          token,
          currentSheet.id,
          {
            name: editFormData.name,
            company_name: editFormData.company_name,
            designation: editFormData.designation,
            mobile_numbers: editFormData.mobile_numbers,
            email_addresses: editFormData.email_addresses,
            website: editFormData.website,
            address: editFormData.address,
            linkedin: editFormData.linkedin,
            other_details: editFormData.other_details,
            notes: 'Scanned via Live Continuous Scanner',
          },
          currentAcc.email
        );
        sheetsSuccess = Boolean(syncSuccess);
      } catch (sheetErr) {
        console.warn('Google Sheet append row error:', sheetErr);
      }
    }

    try {
      const parsedTags = batchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        name: editFormData.name || 'Business Contact',
        company_name: editFormData.company_name || '',
        designation: editFormData.designation || '',
        mobile_numbers: (editFormData.mobile_numbers || []).filter(Boolean),
        email_addresses: (editFormData.email_addresses || []).filter(Boolean),
        website: editFormData.website || '',
        address: editFormData.address || '',
        linkedin: editFormData.linkedin || '',
        other_details: editFormData.other_details || '',
        source: 'CARD_SCAN' as const,
        tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
        synced_account_email: currentAcc.email,
        synced_sheet_id: currentSheet.id,
        synced_sheet_title: currentSheet.title,
        sync_to_sheets: true,
        synced_to_sheets: sheetsSuccess,
        synced_at: sheetsSuccess ? new Date().toISOString() : undefined,
      };
      const saved = await api.createContact(payload);
      onContactSaved(saved);

      setBatchCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? { ...c, data: { ...editFormData }, status: sheetsSuccess ? 'synced_sheets' : 'saved_crm' }
            : c
        )
      );
      setEditingCardId(null);
      setEditFormData(null);
      showToast(
        sheetsSuccess
          ? `Synced "${saved.name}" directly to ${currentSheet.title} and CRM!`
          : `Saved to CRM directory.`
      );
    } catch (crmErr: any) {
      showToast(`Error saving: ${crmErr.message}`, 'error');
    } finally {
      setSavingSingleId(null);
      setSavingActionType(null);
    }
  };

  // -------------------------------------------------------------
  // Single Card Save Actions
  // -------------------------------------------------------------
  const handleSaveSingleCardToCRM = async (card: LiveScannedCardItem) => {
    setSavingSingleId(card.id);
    try {
      const parsedTags = batchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        name: card.data.name || 'Business Contact',
        company_name: card.data.company_name || '',
        designation: card.data.designation || '',
        mobile_numbers: (card.data.mobile_numbers || []).filter(Boolean),
        email_addresses: (card.data.email_addresses || []).filter(Boolean),
        website: card.data.website || '',
        address: card.data.address || '',
        linkedin: card.data.linkedin || '',
        other_details: card.data.other_details || '',
        source: 'CARD_SCAN' as const,
        tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
        sync_to_sheets: false,
        synced_to_sheets: false,
      };
      const saved = await api.createContact(payload);
      onContactSaved(saved);

      setBatchCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, status: 'saved_crm' } : c))
      );
      showToast(`Saved "${saved.name}" to CRM directory!`);
    } catch (err: any) {
      console.error('Save to CRM failed:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSavingSingleId(null);
    }
  };

  const handleSaveSingleCardToSheets = async (card: LiveScannedCardItem) => {
    setSavingSingleId(card.id);

    // Resolve Account and Sheet
    let currentAcc = googleAccounts.find(
      (a) => a.email.toLowerCase() === selectedAccountEmail?.toLowerCase()
    ) || googleAccounts[0];
    let currentSheet = currentAcc?.sheets.find((s) => s.id === selectedSheetId) || currentAcc?.sheets[0];

    if (!currentAcc || !currentSheet) {
      try {
        const result = await googleSignIn();
        const userEmail = result.user.email;
        if (userEmail) {
          setAccessTokenForEmail(userEmail, result.accessToken);
          const space = addOrUpdateAccountSpace({
            email: userEmail,
            displayName: result.user.displayName || undefined,
          });
          let targetSheet = space.sheets[0];
          if (!targetSheet) {
            targetSheet = await createGoogleSheet(
              result.accessToken,
              `CardFlow CRM - ${userEmail.split('@')[0]} Contacts`,
              userEmail
            );
          }
          const updated = getStoredGoogleAccounts();
          setGoogleAccounts(updated);
          currentAcc = space;
          currentSheet = targetSheet || space.sheets[0];
          setSelectedAccountEmail(userEmail);
          if (currentSheet) setSelectedSheetId(currentSheet.id);
        }
      } catch (authErr: any) {
        if (!isUserCancelledAuth(authErr)) {
          showToast('Google sign-in required for Google Sheets.', 'error');
        }
        setSavingSingleId(null);
        return;
      }
    }

    if (!currentAcc || !currentSheet) {
      showToast('Please select a Google Sheet spreadsheet.', 'error');
      setSavingSingleId(null);
      return;
    }

    let token = currentAcc.email ? getAccessTokenForEmail(currentAcc.email) : null;
    if (!token) token = await getAccessToken();

    let sheetsSuccess = false;
    if (token && currentSheet) {
      try {
        const syncSuccess = await appendContactToGoogleSheet(
          token,
          currentSheet.id,
          {
            name: card.data.name,
            company_name: card.data.company_name,
            designation: card.data.designation,
            mobile_numbers: card.data.mobile_numbers,
            email_addresses: card.data.email_addresses,
            website: card.data.website,
            address: card.data.address,
            linkedin: card.data.linkedin,
            other_details: card.data.other_details,
            notes: 'Scanned via Live Continuous Scanner',
          },
          currentAcc.email
        );
        sheetsSuccess = Boolean(syncSuccess);
      } catch (sheetErr) {
        console.warn('Google Sheet append row error:', sheetErr);
      }
    }

    try {
      const parsedTags = batchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        name: card.data.name || 'Business Contact',
        company_name: card.data.company_name || '',
        designation: card.data.designation || '',
        mobile_numbers: (card.data.mobile_numbers || []).filter(Boolean),
        email_addresses: (card.data.email_addresses || []).filter(Boolean),
        website: card.data.website || '',
        address: card.data.address || '',
        linkedin: card.data.linkedin || '',
        other_details: card.data.other_details || '',
        source: 'CARD_SCAN' as const,
        tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
        synced_account_email: currentAcc.email,
        synced_sheet_id: currentSheet.id,
        synced_sheet_title: currentSheet.title,
        sync_to_sheets: true,
        synced_to_sheets: sheetsSuccess,
        synced_at: sheetsSuccess ? new Date().toISOString() : undefined,
      };
      const saved = await api.createContact(payload);
      onContactSaved(saved);

      setBatchCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, status: sheetsSuccess ? 'synced_sheets' : 'saved_crm' } : c))
      );
      showToast(
        sheetsSuccess
          ? `Synced "${saved.name}" directly to ${currentSheet.title}!`
          : `Saved to CRM directory.`
      );
    } catch (crmErr: any) {
      showToast(`Error saving: ${crmErr.message}`, 'error');
    } finally {
      setSavingSingleId(null);
    }
  };

  // -------------------------------------------------------------
  // Batch Save All Actions
  // -------------------------------------------------------------
  const handleSaveBatchToCRM = async () => {
    if (batchCards.length === 0) return;
    setIsBatchSaving(true);
    setBatchSaveProgress({ current: 0, total: batchCards.length });

    let savedCount = 0;
    const updatedCards = [...batchCards];
    const parsedTags = batchTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    for (let i = 0; i < batchCards.length; i++) {
      const item = batchCards[i];
      try {
        const payload = {
          name: item.data.name || 'Business Contact',
          company_name: item.data.company_name || '',
          designation: item.data.designation || '',
          mobile_numbers: (item.data.mobile_numbers || []).filter(Boolean),
          email_addresses: (item.data.email_addresses || []).filter(Boolean),
          website: item.data.website || '',
          address: item.data.address || '',
          linkedin: item.data.linkedin || '',
          other_details: item.data.other_details || '',
          source: 'CARD_SCAN' as const,
          tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
          sync_to_sheets: false,
          synced_to_sheets: false,
        };
        const saved = await api.createContact(payload);
        onContactSaved(saved);
        updatedCards[i] = { ...updatedCards[i], status: 'saved_crm' };
        savedCount++;
      } catch (err: any) {
        console.error('Batch card save failed for:', item.data.name, err);
        updatedCards[i] = { ...updatedCards[i], status: 'error', errorMessage: err.message };
      }
      setBatchSaveProgress({ current: i + 1, total: batchCards.length });
    }

    setBatchCards(updatedCards);
    setIsBatchSaving(false);
    setBatchSaveProgress(null);
    showToast(`Saved ${savedCount} contacts into CRM directory!`);
  };

  const handleSaveBatchToSheets = async () => {
    if (batchCards.length === 0) return;

    let currentAcc = googleAccounts.find(
      (a) => a.email.toLowerCase() === selectedAccountEmail?.toLowerCase()
    ) || googleAccounts[0];

    let currentSheet = currentAcc?.sheets.find((s) => s.id === selectedSheetId) || currentAcc?.sheets[0];

    if (!currentAcc || !currentSheet) {
      try {
        const result = await googleSignIn();
        const userEmail = result.user.email;
        if (userEmail) {
          setAccessTokenForEmail(userEmail, result.accessToken);
          const space = addOrUpdateAccountSpace({
            email: userEmail,
            displayName: result.user.displayName || undefined,
          });
          let targetSheet = space.sheets[0];
          if (!targetSheet) {
            targetSheet = await createGoogleSheet(
              result.accessToken,
              `CardFlow CRM - ${userEmail.split('@')[0]} Contacts`,
              userEmail
            );
          }
          const updated = getStoredGoogleAccounts();
          setGoogleAccounts(updated);
          currentAcc = space;
          currentSheet = targetSheet || space.sheets[0];
          setSelectedAccountEmail(userEmail);
          if (currentSheet) setSelectedSheetId(currentSheet.id);
        }
      } catch (authErr: any) {
        if (!isUserCancelledAuth(authErr)) {
          showToast('Google sign-in required to sync with Google Sheets.', 'error');
        }
        return;
      }
    }

    if (!currentAcc || !currentSheet) {
      showToast('Please select or create a Google Sheet spreadsheet first.', 'error');
      return;
    }

    setIsBatchSaving(true);
    setBatchSaveProgress({ current: 0, total: batchCards.length });

    let token = currentAcc.email ? getAccessTokenForEmail(currentAcc.email) : null;
    if (!token) token = await getAccessToken();

    let syncedCount = 0;
    const updatedCards = [...batchCards];
    const parsedTags = batchTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    for (let i = 0; i < batchCards.length; i++) {
      const item = batchCards[i];
      let sheetsSuccess = false;

      if (token && currentSheet) {
        try {
          const syncSuccess = await appendContactToGoogleSheet(
            token,
            currentSheet.id,
            {
              name: item.data.name,
              company_name: item.data.company_name,
              designation: item.data.designation,
              mobile_numbers: item.data.mobile_numbers,
              email_addresses: item.data.email_addresses,
              website: item.data.website,
              address: item.data.address,
              linkedin: item.data.linkedin,
              other_details: item.data.other_details,
              notes: 'Imported via Live Continuous Scan',
            },
            currentAcc.email
          );
          sheetsSuccess = Boolean(syncSuccess);
        } catch (sheetErr) {
          console.warn('Google Sheet append row error:', sheetErr);
        }
      }

      try {
        const payload = {
          name: item.data.name || 'Business Contact',
          company_name: item.data.company_name || '',
          designation: item.data.designation || '',
          mobile_numbers: (item.data.mobile_numbers || []).filter(Boolean),
          email_addresses: (item.data.email_addresses || []).filter(Boolean),
          website: item.data.website || '',
          address: item.data.address || '',
          linkedin: item.data.linkedin || '',
          other_details: item.data.other_details || '',
          source: 'CARD_SCAN' as const,
          tags: parsedTags.length > 0 ? parsedTags : ['Visiting Card'],
          synced_account_email: currentAcc.email,
          synced_sheet_id: currentSheet.id,
          synced_sheet_title: currentSheet.title,
          sync_to_sheets: true,
          synced_to_sheets: sheetsSuccess,
          synced_at: sheetsSuccess ? new Date().toISOString() : undefined,
        };
        const saved = await api.createContact(payload);
        onContactSaved(saved);
        updatedCards[i] = { ...updatedCards[i], status: sheetsSuccess ? 'synced_sheets' : 'saved_crm' };
        if (sheetsSuccess) syncedCount++;
      } catch (crmErr: any) {
        console.error('CRM save error during batch:', crmErr);
      }

      setBatchSaveProgress({ current: i + 1, total: batchCards.length });
    }

    setBatchCards(updatedCards);
    setIsBatchSaving(false);
    setBatchSaveProgress(null);
    showToast(
      `Synced ${syncedCount} contacts directly into "${currentSheet.title}"!`
    );
  };

  // Google Account Connect / Switch
  const handleConnectGoogleAccount = async () => {
    try {
      const result = await googleSignIn();
      const userEmail = result.user.email;
      if (userEmail) {
        setAccessTokenForEmail(userEmail, result.accessToken);
        const space = addOrUpdateAccountSpace({
          email: userEmail,
          displayName: result.user.displayName || undefined,
        });
        const updated = getStoredGoogleAccounts();
        setGoogleAccounts(updated);
        setSelectedAccountEmail(userEmail);
        if (space.sheets && space.sheets.length > 0) {
          setSelectedSheetId(space.sheets[0].id);
        }
        showToast(`Connected Google Account: ${userEmail}`);
      }
    } catch (err: any) {
      if (!isUserCancelledAuth(err)) {
        showToast(`Google connect failed: ${err.message}`, 'error');
      }
    }
  };

  // Create new Sheet
  const handleCreateNewSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) return;

    const acc = googleAccounts.find((a) => a.email === selectedAccountEmail) || googleAccounts[0];
    let token = acc?.email ? getAccessTokenForEmail(acc.email) : null;
    if (!token) token = await getAccessToken();

    if (!token || !acc) {
      showToast('Please sign in to Google first.', 'error');
      return;
    }

    setIsCreatingSheet(true);
    try {
      const sheet = await createGoogleSheet(token, newSheetTitle.trim(), acc.email);
      const updated = getStoredGoogleAccounts();
      setGoogleAccounts(updated);
      setSelectedSheetId(sheet.id);
      setShowNewSheetModal(false);
      setNewSheetTitle('');
      showToast(`Created spreadsheet: "${sheet.title}"`);
    } catch (err: any) {
      showToast(`Failed to create spreadsheet: ${err.message}`, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const activeAccount = googleAccounts.find((a) => a.email === selectedAccountEmail) || googleAccounts[0];

  // List of empty / null card items
  const nullCardsList = batchCards.filter(isNullCard);

  const handleOpenFilterNullModal = () => {
    if (nullCardsList.length === 0) {
      showToast('No null or empty cards found! All scanned cards contain valid contact text.', 'success');
    } else {
      setShowNullFilterModal(true);
    }
  };

  const handleConfirmRemoveNullCards = () => {
    const removeCount = nullCardsList.length;
    setBatchCards((prev) => prev.filter((c) => !isNullCard(c)));
    setShowNullFilterModal(false);
    showToast(`Successfully filtered out and removed ${removeCount} empty/null scanned item(s)!`, 'success');
  };

  // -------------------------------------------------------------
  // RENDER: REVIEW & BATCH EXPORT SCREEN
  // -------------------------------------------------------------
  if (phase === 'review_batch') {
    return (
      <div className="space-y-3.5 animate-in fade-in duration-200">
        {/* Success/Error Toast */}
        {toastMessage && (
          <div
            className={`p-3 rounded-lg text-white shadow-md flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top ${
              toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Compact Sub-Header with Navigation */}
        <div className="bg-white border border-neutral-200 rounded-lg px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {batchCards.length}
            </span>
            <h2 className="text-xs font-bold text-neutral-900">
              {t.liveScan.batchCompletedTitle}
            </h2>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
              {batchCards.length} {t.liveScan.cardsExtractedCount}
            </span>
            {nullCardsList.length > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>{nullCardsList.length} Empty/Null Item(s)</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResumeLiveScan}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.liveScan.resumeLiveScanBtn}</span>
            </button>
            <button
              onClick={onSwitchToManual}
              className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              {t.liveScan.manualScanTab}
            </button>
          </div>
        </div>

        {/* Destination & Batch Action Panel */}
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-neutral-900">Google Sheets & CRM Destination</span>
            </div>

            {/* Batch Action Buttons (Neat & Compact with Filter Null Button) */}
            <div className="flex items-center space-x-2">
              <button
                disabled={isBatchSaving || batchCards.length === 0}
                onClick={handleOpenFilterNullModal}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer ${
                  nullCardsList.length > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold border border-amber-600 animate-pulse'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300'
                }`}
                title="Filter out empty scanned items where no card text was detected"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Null Data</span>
                {nullCardsList.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-white text-amber-800 font-extrabold rounded-full text-[10px]">
                    {nullCardsList.length}
                  </span>
                )}
              </button>

              <button
                disabled={isBatchSaving || batchCards.length === 0}
                onClick={handleSaveBatchToCRM}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.liveScan.saveAllToCRM}</span>
              </button>

              <button
                disabled={isBatchSaving || batchCards.length === 0}
                onClick={handleSaveBatchToSheets}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t.liveScan.saveAllToSheets}</span>
              </button>
            </div>
          </div>

          {/* Account, Sheet & Tag Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Account Selector */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Google Account
              </label>
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedAccountEmail || ''}
                  onChange={(e) => setSelectedAccountEmail(e.target.value)}
                  className="w-full text-xs font-medium border border-neutral-200 rounded-md px-2 py-1.5 bg-neutral-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {googleAccounts.map((acc) => (
                    <option key={acc.email} value={acc.email}>
                      {acc.email}
                    </option>
                  ))}
                  {googleAccounts.length === 0 && <option value="">No account connected</option>}
                </select>
                <button
                  type="button"
                  onClick={handleConnectGoogleAccount}
                  title="Connect / Switch Google Account"
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-200 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sheet Selector */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Target Spreadsheet
              </label>
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedSheetId || ''}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                  className="w-full text-xs font-medium border border-neutral-200 rounded-md px-2 py-1.5 bg-neutral-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  {activeAccount?.sheets?.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.title}
                    </option>
                  ))}
                  {(!activeAccount?.sheets || activeAccount.sheets.length === 0) && (
                    <option value="">No sheets found</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewSheetModal(true)}
                  title="Create New Sheet"
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tag Input */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Tags
              </label>
              <input
                type="text"
                value={batchTags}
                onChange={(e) => setBatchTags(e.target.value)}
                placeholder="Visiting Card, Live Scan"
                className="w-full text-xs font-medium border border-neutral-200 rounded-md px-2 py-1.5 bg-neutral-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Batch Progress Bar */}
        {isBatchSaving && batchSaveProgress && (
          <div className="p-3 bg-white border border-indigo-200 rounded-lg shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
              <span className="flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{t.liveScan.savingBatch}</span>
              </span>
              <span>
                {batchSaveProgress.current} / {batchSaveProgress.total}
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(batchSaveProgress.current / batchSaveProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Scanned Cards List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              {t.liveScan.reviewExtractedList} ({batchCards.length})
            </h3>
            <span className="text-[11px] text-neutral-400">
              Review, edit individual fields, or save one-by-one / batch
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {batchCards.map((card) => {
              const isSavingThis = savingSingleId === card.id;

              return (
                <div
                  key={card.id}
                  className="bg-white border border-neutral-200 rounded-xl p-3 shadow-2xs hover:border-neutral-300 transition-all space-y-2.5"
                >
                  {/* Top Card Line: Thumbnail, Name, Title, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative w-11 h-7 rounded bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                        <img
                          src={card.frontImage}
                          alt="Front thumbnail"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {card.backImage && (
                          <span className="absolute bottom-0 right-0 bg-indigo-600 text-[7px] text-white font-bold px-0.5 rounded-tl">
                            2S
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {card.data.name || 'Unnamed Contact'}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-neutral-500 truncate">
                          <span className="truncate font-medium text-neutral-700">
                            {card.data.company_name || 'Organization'}
                          </span>
                          {card.data.designation && (
                            <>
                              <span>•</span>
                              <span className="truncate text-neutral-500">{card.data.designation}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Status / Remove */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {card.status === 'synced_sheets' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>Synced</span>
                        </span>
                      ) : card.status === 'saved_crm' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          CRM
                        </span>
                      ) : null}

                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Extracted Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                    {card.data.mobile_numbers && card.data.mobile_numbers.length > 0 && (
                      <div className="flex items-center space-x-1 text-neutral-700 truncate">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{card.data.mobile_numbers.join(', ')}</span>
                      </div>
                    )}

                    {card.data.email_addresses && card.data.email_addresses.length > 0 && (
                      <div className="flex items-center space-x-1 text-neutral-700 truncate">
                        <Mail className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">{card.data.email_addresses.join(', ')}</span>
                      </div>
                    )}

                    {card.data.website && (
                      <div className="flex items-center space-x-1 text-neutral-700 truncate">
                        <Globe className="w-3 h-3 text-sky-600 shrink-0" />
                        <span className="truncate">{card.data.website}</span>
                      </div>
                    )}

                    {card.data.address && (
                      <div className="flex items-center space-x-1 text-neutral-600 sm:col-span-2 truncate">
                        <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{card.data.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons for Single Card */}
                  <div className="flex items-center justify-between pt-1 gap-2 border-t border-neutral-100">
                    <button
                      onClick={() => handleOpenEditModal(card)}
                      className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-neutral-500" />
                      <span>{t.liveScan.editCard}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        disabled={isSavingThis}
                        onClick={() => handleSaveSingleCardToCRM(card)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-neutral-600" />
                        <span>{t.liveScan.saveCardToCRM}</span>
                      </button>

                      <button
                        disabled={isSavingThis}
                        onClick={() => handleSaveSingleCardToSheets(card)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>{t.liveScan.saveCardToSheets}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {batchCards.length === 0 && (
            <div className="p-8 bg-white border border-neutral-200 rounded-xl text-center space-y-2 text-neutral-500">
              <ScanLine className="w-7 h-7 text-neutral-400 mx-auto" />
              <p className="text-xs font-semibold">{t.liveScan.noCardsInBatch}</p>
              <button
                onClick={handleResumeLiveScan}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
              >
                {t.liveScan.resumeLiveScanBtn}
              </button>
            </div>
          )}
        </div>

        {/* Edit Card Modal */}
        {editingCardId && editFormData && (() => {
          const activeCard = batchCards.find((c) => c.id === editingCardId);
          const editAcc = googleAccounts.find((a) => a.email.toLowerCase() === editAccountEmail?.toLowerCase()) || googleAccounts[0];

          return (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 my-auto">
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                  <div className="flex items-center space-x-2">
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900">{t.liveScan.editDetails}</h3>
                      <p className="text-[10px] text-neutral-500">Edit contact details and save to CRM or sync with Google Sheets</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCardId(null);
                      setEditFormData(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md hover:bg-neutral-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 overflow-y-auto space-y-4 text-xs">
                  {/* Card Visual Scanned Images Preview */}
                  {activeCard && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">
                      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                        Scanned Card Preview
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {activeCard.frontImage && (
                          <div className="relative group">
                            <img
                              src={activeCard.frontImage}
                              alt="Front preview"
                              className="h-20 w-auto rounded border border-neutral-300 object-cover shadow-2xs cursor-pointer"
                              onClick={() => setZoomPreviewImage(activeCard.frontImage || null)}
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomPreviewImage(activeCard.frontImage || null)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded text-[10px] font-bold"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Zoom
                            </button>
                            <span className="block text-center text-[9px] text-neutral-500 font-semibold mt-1">Front</span>
                          </div>
                        )}
                        {activeCard.backImage && (
                          <div className="relative group">
                            <img
                              src={activeCard.backImage}
                              alt="Back preview"
                              className="h-20 w-auto rounded border border-neutral-300 object-cover shadow-2xs cursor-pointer"
                              onClick={() => setZoomPreviewImage(activeCard.backImage || null)}
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomPreviewImage(activeCard.backImage || null)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded text-[10px] font-bold"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Zoom
                            </button>
                            <span className="block text-center text-[9px] text-neutral-500 font-semibold mt-1">Back</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Form fields */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 font-medium text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.company_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                        className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 font-medium text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Designation / Job Title
                      </label>
                      <input
                        type="text"
                        value={editFormData.designation || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 font-medium text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Mobile Numbers */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Mobile Numbers
                    </label>
                    <div className="space-y-1.5">
                      {editFormData.mobile_numbers.map((phone, pIdx) => (
                        <div key={pIdx} className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => {
                              const updated = [...editFormData.mobile_numbers];
                              updated[pIdx] = e.target.value;
                              setEditFormData({ ...editFormData, mobile_numbers: updated });
                            }}
                            className="w-full border border-neutral-300 rounded-md px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditFormData({
                                ...editFormData,
                                mobile_numbers: editFormData.mobile_numbers.filter((_, i) => i !== pIdx),
                              });
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <input
                          type="text"
                          placeholder="Add phone number..."
                          value={editNewPhone}
                          onChange={(e) => setEditNewPhone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editNewPhone.trim()) {
                              e.preventDefault();
                              setEditFormData({
                                ...editFormData,
                                mobile_numbers: [...editFormData.mobile_numbers, editNewPhone.trim()],
                              });
                              setEditNewPhone('');
                            }
                          }}
                          className="w-full border border-neutral-200 rounded-md px-2 py-1 text-xs bg-neutral-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editNewPhone.trim()) {
                              setEditFormData({
                                ...editFormData,
                                mobile_numbers: [...editFormData.mobile_numbers, editNewPhone.trim()],
                              });
                              setEditNewPhone('');
                            }
                          }}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold shrink-0"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email Addresses */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Email Addresses
                    </label>
                    <div className="space-y-1.5">
                      {editFormData.email_addresses.map((email, eIdx) => (
                        <div key={eIdx} className="flex items-center space-x-1.5">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              const updated = [...editFormData.email_addresses];
                              updated[eIdx] = e.target.value;
                              setEditFormData({ ...editFormData, email_addresses: updated });
                            }}
                            className="w-full border border-neutral-300 rounded-md px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditFormData({
                                ...editFormData,
                                email_addresses: editFormData.email_addresses.filter((_, i) => i !== eIdx),
                              });
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <input
                          type="email"
                          placeholder="Add email address..."
                          value={editNewEmail}
                          onChange={(e) => setEditNewEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editNewEmail.trim()) {
                              e.preventDefault();
                              setEditFormData({
                                ...editFormData,
                                email_addresses: [...editFormData.email_addresses, editNewEmail.trim()],
                              });
                              setEditNewEmail('');
                            }
                          }}
                          className="w-full border border-neutral-200 rounded-md px-2 py-1 text-xs bg-neutral-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editNewEmail.trim()) {
                              setEditFormData({
                                ...editFormData,
                                email_addresses: [...editFormData.email_addresses, editNewEmail.trim()],
                              });
                              setEditNewEmail('');
                            }
                          }}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold shrink-0"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        value={editFormData.website || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                        className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="text"
                        value={editFormData.linkedin || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, linkedin: e.target.value })}
                        className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Other Details / Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.other_details || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, other_details: e.target.value })}
                      className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-neutral-900 resize-none"
                    />
                  </div>

                  {/* Destination Selector for Google Sheets Direct Sync */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Google Sheets Sync Settings</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Google Account</label>
                        <div className="flex items-center space-x-1.5">
                          <select
                            value={editAccountEmail || ''}
                            onChange={(e) => {
                              setEditAccountEmail(e.target.value);
                              const targetAcc = googleAccounts.find((a) => a.email.toLowerCase() === e.target.value.toLowerCase());
                              if (targetAcc?.sheets && targetAcc.sheets.length > 0) {
                                setEditSheetId(targetAcc.sheets[0].id);
                              }
                            }}
                            className="w-full text-xs font-medium border border-neutral-300 rounded-md px-2 py-1.5 bg-white"
                          >
                            {googleAccounts.map((acc) => (
                              <option key={acc.email} value={acc.email}>
                                {acc.email}
                              </option>
                            ))}
                            {googleAccounts.length === 0 && <option value="">No account connected</option>}
                          </select>
                          <button
                            type="button"
                            onClick={handleConnectEditGoogle}
                            disabled={isConnectingEditGoogle}
                            title="Connect Google Account"
                            className="p-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-neutral-700 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Target Spreadsheet</label>
                        <div className="flex items-center space-x-1.5">
                          <select
                            value={editSheetId || ''}
                            onChange={(e) => setEditSheetId(e.target.value)}
                            className="w-full text-xs font-medium border border-neutral-300 rounded-md px-2 py-1.5 bg-white"
                          >
                            {editAcc?.sheets?.map((sheet) => (
                              <option key={sheet.id} value={sheet.id}>
                                {sheet.title}
                              </option>
                            ))}
                            {(!editAcc?.sheets || editAcc.sheets.length === 0) && (
                              <option value="">No sheets found</option>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={handleCreateNewSheetForEdit}
                            disabled={isCreatingEditSheet}
                            title="Create Spreadsheet"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shrink-0 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer with Triple Action Suite */}
                <div className="px-4 py-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCardId(null);
                      setEditFormData(null);
                    }}
                    className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-md text-xs font-semibold"
                  >
                    {t.liveScan.cancel}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEditedCard}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold transition-colors"
                    >
                      {t.liveScan.saveChanges}
                    </button>

                    <button
                      type="button"
                      disabled={savingSingleId === editingCardId}
                      onClick={handleSaveEditModalToCRM}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Save to CRM</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingSingleId === editingCardId}
                      onClick={handleSaveEditModalToSheets}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Save & Sync Sheets</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create New Sheet Modal */}
        {showNewSheetModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-900">Create New Google Spreadsheet</h3>
              <form onSubmit={handleCreateNewSheetSubmit} className="space-y-3 text-xs">
                <input
                  type="text"
                  placeholder="Spreadsheet title (e.g. Hyderabad Expo Leads)..."
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5"
                  autoFocus
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowNewSheetModal(false)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSheet || !newSheetTitle.trim()}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold disabled:opacity-50"
                  >
                    {isCreatingSheet ? 'Creating...' : 'Create Sheet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: LIVE CAMERA VIEWPORT & REAL-TIME SCANNING OVERLAY
  // -------------------------------------------------------------
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {/* Top Streamlined Sub-Navbar */}
      <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <h2 className="text-xs font-bold text-neutral-900 tracking-tight">
            {t.liveScan.liveScanTitle}
          </h2>

          {/* Auto-Extract Mode Toggle */}
          <button
            type="button"
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
              autoScanEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 border-neutral-300'
            }`}
            title="Toggle automatic card detection & extraction (QR-style)"
          >
            <Zap className={`w-3 h-3 ${autoScanEnabled ? 'text-emerald-600 fill-emerald-600' : 'text-neutral-400'}`} />
            <span>Auto: {autoScanEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 1-Side vs 2-Sided Mode Selector */}
          <div className="hidden sm:flex items-center bg-neutral-100 p-0.5 rounded-md border border-neutral-200 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setAutoScanMode('single')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                autoScanMode === 'single'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              1-Side (Fastest)
            </button>
            <button
              type="button"
              onClick={() => setAutoScanMode('dual')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                autoScanMode === 'dual'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              2-Sided (F+B)
            </button>
          </div>

          <span className="text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
            {t.liveScan.cardCount}: <span className="font-bold text-indigo-700">{batchCards.length}</span>
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 border transition-colors cursor-pointer ${
              isPaused
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
            }`}
            title={isPaused ? 'Resume live scanning' : 'Pause live scanning'}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 fill-current text-emerald-600" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 fill-current text-amber-600" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Stop & Review Batch Button */}
          <button
            onClick={handleStopLiveScan}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
            title="Stop scanning and review extracted cards"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>
              Stop & Review ({batchCards.length})
            </span>
          </button>

          {/* Minimize / Maximize Camera Toggle */}
          <button
            type="button"
            onClick={() => setIsCameraMinimized(!isCameraMinimized)}
            className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            title={isCameraMinimized ? 'Expand Camera View' : 'Minimize Camera View'}
          >
            {isCameraMinimized ? (
              <>
                <Maximize2 className="w-3 h-3 text-indigo-600" />
                <span className="hidden sm:inline">Expand</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3 text-neutral-600" />
                <span className="hidden sm:inline">Minimize</span>
              </>
            )}
          </button>

          {/* Switch to Manual Scan */}
          <button
            onClick={onSwitchToManual}
            className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            {t.liveScan.manualScanTab}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {cameraError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button onClick={() => setCameraError(null)} className="text-rose-500 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Live Camera Viewport Stage */}
      <div
        className={`relative rounded-xl overflow-hidden bg-black shadow-lg border border-neutral-800 flex items-center justify-center transition-all duration-300 ${
          isCameraMinimized ? 'h-48 sm:h-56 max-w-lg mx-auto' : 'aspect-4/3 sm:aspect-16/10'
        }`}
      >
        {/* Floating In-Viewport Minimize Button */}
        <button
          type="button"
          onClick={() => setIsCameraMinimized(!isCameraMinimized)}
          className="absolute top-2.5 right-2.5 z-20 bg-black/60 hover:bg-black/80 text-white/90 hover:text-white p-1.5 rounded-lg border border-white/20 transition-all shadow-md cursor-pointer"
          title={isCameraMinimized ? 'Expand Camera View' : 'Minimize Camera View'}
        >
          {isCameraMinimized ? <Maximize2 className="w-3.5 h-3.5 text-cyan-300" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>

        {/* HTML5 Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Ambient Darkened Vignette */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {/* Camera Source Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 z-40 bg-neutral-950/95 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3.5 p-6 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center max-w-sm space-y-1">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">Camera Source Error</h3>
              <p className="text-xs text-rose-200/90 font-medium">{cameraError}</p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Please grant camera permissions in your browser or switch to manual card upload mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>

              <button
                type="button"
                onClick={onSwitchToManual}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg border border-neutral-600 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Card Image Instead</span>
              </button>
            </div>
          </div>
        )}

        {/* Paused Overlay Screen */}
        {isPaused && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 p-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
              <Pause className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-sm font-bold text-white">Live Scanner Paused</h3>
            <p className="text-[11px] text-neutral-300 text-center max-w-xs">
              Automatic card extraction is currently paused. Tap Resume to scan your visiting cards.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Scanning</span>
              </button>
              <button
                type="button"
                onClick={handleStopLiveScan}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-full border border-neutral-600 cursor-pointer"
              >
                <span>Review Batch ({batchCards.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Instant Extracted Toast Notification */}
        {lastExtractedBanner && (
          <div className="absolute top-12 inset-x-4 sm:inset-x-12 z-30 flex items-center justify-center pointer-events-none animate-in slide-in-from-top-3 duration-300">
            <div className="bg-neutral-900/95 text-white border border-emerald-400/80 px-3.5 py-2 rounded-xl shadow-xl flex items-center space-x-2.5 max-w-md">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_#10b981]">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                  <span>✓ Card #{lastExtractedBanner.count} Auto-Extracted</span>
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {lastExtractedBanner.name} {lastExtractedBanner.company ? `• ${lastExtractedBanner.company}` : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ambient Targeting Frame & Laser Beam Animation */}
        <div
          className={`absolute inset-4 sm:inset-8 md:inset-10 border rounded-xl pointer-events-none flex flex-col justify-between p-2.5 transition-all duration-300 overflow-hidden ${
            phase === 'processing_front' || phase === 'processing_back'
              ? 'border-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-cyan-950/20'
              : detectionStatus === 'locked'
              ? 'border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-950/20'
              : 'border-white/35 bg-black/10'
          }`}
        >
          {/* Background Grid Pattern during Extraction or Scanning */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
              phase === 'processing_front' || phase === 'processing_back'
                ? 'opacity-35 extracting-grid-pattern'
                : 'opacity-20 scan-grid-pattern'
            }`}
          />

          {/* Glowing Targeting Corners */}
          <div className="flex justify-between items-start z-10">
            <div
              className={`w-6 h-6 border-t-2 border-l-2 rounded-tl transition-colors duration-200 ${
                phase === 'processing_front' || phase === 'processing_back'
                  ? 'border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                  : detectionStatus === 'locked'
                  ? 'border-emerald-400 shadow-[0_0_10px_#10b981]'
                  : 'border-indigo-400'
              }`}
            />
            <div
              className={`w-6 h-6 border-t-2 border-r-2 rounded-tr transition-colors duration-200 ${
                phase === 'processing_front' || phase === 'processing_back'
                  ? 'border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                  : detectionStatus === 'locked'
                  ? 'border-emerald-400 shadow-[0_0_10px_#10b981]'
                  : 'border-indigo-400'
              }`}
            />
          </div>

          {/* Central Animated Laser Beam (Hardware Accelerated GPU transform) */}
          {(phase === 'processing_front' || phase === 'processing_back') && (
            <div className="absolute inset-x-0 top-0 animate-scan-laser-fast pointer-events-none z-10">
              <div className="relative w-full">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_#06b6d4]" />
                <div className="w-full h-0.5 bg-white shadow-[0_0_8px_#ffffff]" />
                <div className="w-full h-14 bg-gradient-to-b from-cyan-400/25 to-transparent -mt-0.5" />
              </div>
            </div>
          )}

          {phase === 'camera_live' && !isPaused && (
            <div className="absolute inset-x-0 top-0 animate-scan-laser pointer-events-none z-10">
              <div className="relative w-full">
                <div
                  className={`w-full h-0.5 bg-gradient-to-r from-transparent ${
                    detectionStatus === 'locked' ? 'via-emerald-400 shadow-[0_0_12px_#34d399]' : 'via-indigo-400 shadow-[0_0_10px_#818cf8]'
                  } to-transparent`}
                />
                <div
                  className={`w-full h-8 bg-gradient-to-b ${
                    detectionStatus === 'locked' ? 'from-emerald-500/20' : 'from-indigo-500/15'
                  } to-transparent`}
                />
              </div>
            </div>
          )}

          {/* Central Radar Ping & HUD Data Overlay during AI Extraction */}
          {(phase === 'processing_front' || phase === 'processing_back') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full border border-cyan-400/60 animate-radar-ping" />
                <div className="w-8 h-8 rounded-full bg-cyan-500/30 border border-cyan-300 flex items-center justify-center shadow-[0_0_15px_#22d3ee]">
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-xs px-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/75 border border-cyan-400/60 text-cyan-300 animate-hud-blink">
                  [EXTRACTING VIA AI]
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/75 border border-indigo-400/60 text-indigo-300">
                  PARSING FIELDS...
                </span>
              </div>
            </div>
          )}

          {/* Auto-Locking Progress Ring & Reticle */}
          {phase === 'camera_live' && autoScanEnabled && !isPaused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {detectionStatus === 'locked' ? (
                <div className="flex flex-col items-center space-y-1 bg-black/75 px-3.5 py-2 rounded-xl border border-emerald-400/80 shadow-lg animate-in zoom-in-90 duration-150">
                  <div className="flex items-center space-x-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span className="text-[11px] font-bold text-emerald-300">
                      Card Structure Locked • Auto Extracting...
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-28 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${detectionProgress}%` }}
                    />
                  </div>
                </div>
              ) : detectionStatus === 'detected' ? (
                <div className="bg-black/65 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-400/50 flex items-center space-x-1 backdrop-blur-2xs">
                  <ScanLine className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>Visiting Card Detected — Hold Still</span>
                </div>
              ) : (
                <div className="w-10 h-10 border border-white/30 rounded-full flex items-center justify-center opacity-40">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                </div>
              )}
            </div>
          )}

          {/* Bottom Corner Brackets */}
          <div className="flex justify-between items-end z-10">
            <div
              className={`w-6 h-6 border-b-2 border-l-2 rounded-bl transition-colors duration-200 ${
                phase === 'processing_front' || phase === 'processing_back'
                  ? 'border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                  : detectionStatus === 'locked'
                  ? 'border-emerald-400 shadow-[0_0_10px_#10b981]'
                  : 'border-indigo-400'
              }`}
            />
            <div
              className={`w-6 h-6 border-b-2 border-r-2 rounded-br transition-colors duration-200 ${
                phase === 'processing_front' || phase === 'processing_back'
                  ? 'border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                  : detectionStatus === 'locked'
                  ? 'border-emerald-400 shadow-[0_0_10px_#10b981]'
                  : 'border-indigo-400'
              }`}
            />
          </div>
        </div>

        {/* Dynamic Instructional Banner */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-center pointer-events-none z-20">
          {cooldownSeconds !== null && !isPaused ? (
            <div className="bg-cyan-950/95 text-cyan-200 text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-cyan-400/60 shadow-lg flex items-center space-x-2 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              <span>{cooldownPhaseText} <strong className="text-white font-mono text-xs">{cooldownSeconds}s</strong>...</span>
            </div>
          ) : phase === 'camera_live' && !isPaused ? (
            <div className="bg-black/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/20 shadow-md flex items-center space-x-1.5">
              {autoScanEnabled ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>
                    Card #{currentCardNumber}: Hold visiting card in frame to auto-extract
                  </span>
                </>
              ) : (
                <>
                  <ScanLine className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Card #{currentCardNumber}: {t.liveScan.placeFrontPrompt}</span>
                </>
              )}
            </div>
          ) : phase === 'prompt_back' && !isPaused ? (
            <div className="bg-indigo-950/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-400/50 shadow-md flex items-center space-x-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              <span>{t.liveScan.placeBackPrompt} (or tap skip backside)</span>
            </div>
          ) : phase === 'processing_front' ? (
            <div className="bg-indigo-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-indigo-400 flex items-center space-x-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              <span>Extracting Card Details (Gemini AI)...</span>
            </div>
          ) : phase === 'processing_back' ? (
            <div className="bg-purple-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-purple-400 flex items-center space-x-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
              <span>Merging Front & Back Side Data...</span>
            </div>
          ) : null}
        </div>

        {/* 2-Second Cooldown Center Overlay */}
        {cooldownSeconds !== null && !isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white space-y-3 p-4 z-20 animate-in fade-in duration-150">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <div className="absolute text-2xl font-black text-cyan-300 font-mono tracking-wider">
                {cooldownSeconds}s
              </div>
            </div>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {cooldownPhaseText || 'Ready in'} {cooldownSeconds}s
              </h3>
              <p className="text-[11px] text-cyan-200/90 mt-0.5">
                Place or flip the card in the viewport frame. Auto-detection will resume automatically.
              </p>
            </div>
          </div>
        )}

        {/* Success Overlay Checkmark */}
        {(phase === 'success_front' || phase === 'success_card') && (
          <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center text-white space-y-2 p-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_20px_#10b981] animate-bounce">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white">
                {phase === 'success_front' ? t.liveScan.frontCapturedSuccess : t.liveScan.backCapturedSuccess}
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                {phase === 'success_front'
                  ? 'Front details identified. Next: Back side (or tap skip).'
                  : `Card #${currentCardNumber} added to batch.`}
              </p>
            </div>
          </div>
        )}

        {/* Live Controls at Bottom of Viewport (Stop, Pause, Snap, Skip, Switch Camera) */}
        <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-center gap-2">
          {/* Switch Camera Button (Front / Back) */}
          <button
            type="button"
            onClick={toggleCameraFacingMode}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 border border-cyan-400/50 transition-all hover:scale-105 cursor-pointer"
            title={`Switch Camera (Currently: ${cameraFacingMode === 'environment' ? 'Rear/Back' : 'Front'})`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>{cameraFacingMode === 'environment' ? 'Front Cam' : 'Back Cam'}</span>
          </button>

          {/* 1. Stop Button (Always Accessible) */}
          <button
            type="button"
            onClick={handleStopLiveScan}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 border border-rose-400/50 transition-all hover:scale-105 cursor-pointer"
            title="Stop scanner and review cards"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop ({batchCards.length})</span>
          </button>

          {/* 2. Pause / Resume Button (Always Accessible) */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 border transition-all hover:scale-105 cursor-pointer ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-amber-300 border-neutral-700'
            }`}
            title={isPaused ? 'Resume live scanning' : 'Pause scanning'}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* 3. Snap Front Button (When in Live Camera phase) */}
          {phase === 'camera_live' && (
            <button
              onClick={handleCaptureFront}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 border border-indigo-400/50 transition-all hover:scale-105 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{autoScanEnabled ? 'Force Snap' : `${t.liveScan.snapNowBtn} (Front)`}</span>
            </button>
          )}

          {/* 4. Snap Back & Skip Backside Buttons (When in Prompt Back phase) */}
          {phase === 'prompt_back' && (
            <>
              <button
                onClick={handleCaptureBack}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1 border border-indigo-400/50 transition-all hover:scale-105 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Back</span>
              </button>

              <button
                onClick={handleSkipBackside}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded-full shadow-md flex items-center space-x-1.5 border border-amber-400/60 transition-all hover:scale-105 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 text-white" />
                <span>Skip Backside</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Batch Preview Strip */}
      {batchCards.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-2.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
              {batchCards.length}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-neutral-900 truncate">
                Batch ({batchCards.length} Cards Extracted)
              </h4>
              <p className="text-[10px] text-neutral-500 truncate">
                Latest: {batchCards[batchCards.length - 1]?.data?.name || 'Contact'} (
                {batchCards[batchCards.length - 1]?.data?.company_name || 'Business'})
              </p>
            </div>
          </div>

          <button
            onClick={handleStopLiveScan}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
          >
            <span>Review & Edit</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
      {/* Filter Null / Empty Entries Confirmation Modal */}
      {showNullFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden flex flex-col my-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Filter Null & Empty Scanned Entries</h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Found {nullCardsList.length} item(s) with no extracted text or contact details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNullFilterModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: List of null items */}
            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-3">
              <p className="text-xs text-neutral-600">
                The following scanned images yielded no text, contact names, or phone/email numbers. Review the null items below before confirming removal:
              </p>

              <div className="space-y-2">
                {nullCardsList.map((card, idx) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-8 rounded bg-neutral-200 overflow-hidden shrink-0 border border-neutral-300">
                        <img
                          src={card.frontImage}
                          alt={`Null Card #${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-bold text-neutral-800 truncate">
                          Item #{idx + 1} — No Contact Text Extracted
                        </span>
                        <span className="block text-[10px] text-neutral-500 truncate">
                          {new Date(card.timestamp).toLocaleTimeString()} • Null Entry
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded border border-rose-200 shrink-0">
                      Null Data
                    </span>
                  </div>
                ))}
              </div>

              {/* Confirmation Warning Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Confirmation Required</span>
                </div>
                <p>
                  Confirming will permanently remove these <strong>{nullCardsList.length} null entry(ies)</strong> from your review batch. Only valid cards with extracted text will be kept.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowNullFilterModal(false)}
                className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveNullCards}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Remove ({nullCardsList.length}) Null Entries</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Image Modal */}
      {zoomPreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] p-2 bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full p-1.5 border border-neutral-600 shadow-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomPreviewImage}
              alt="Zoomed Card"
              className="max-h-[75vh] w-auto rounded-lg object-contain mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
