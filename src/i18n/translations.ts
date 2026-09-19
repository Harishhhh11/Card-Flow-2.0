import { Language } from '../types';

export interface Translations {
  // Navigation
  nav: {
    overview: string;
    cardScanner: string;
    contactsCRM: string;
    googleSheets: string;
    settings: string;
    coreWorkflows: string;
  };
  // Navbar
  navbar: {
    dashboardTitle: string;
    dashboardSubtitle: string;
    scannerTitle: string;
    scannerSubtitle: string;
    contactsTitle: string;
    contactsSubtitle: string;
    sheetsTitle: string;
    sheetsSubtitle: string;
    searchPlaceholder: string;
    scanButton: string;
    sheetsLiveSync: string;
    backButton: string;
  };
  // Executive Dashboard / Overview
  dashboard: {
    consoleTitle: string;
    liveBadge: string;
    scanVisitingCard: string;
    viewContacts: string;
    sheetsSync: string;
    totalContacts: string;
    fromCards: string;
    ocrSuccess: string;
    visionEngine: string;
    indicSupport: string;
    indicDescription: string;
    sheetsStatus: string;
    connected: string;
    ready: string;
    verifiedLeads: string;
    leadsSubtitle: string;
    recentCardsTitle: string;
    recentCardsSubtitle: string;
    viewDirectory: string;
    noContactsYet: string;
    scanFirstCard: string;
    sheetsIntegrationTitle: string;
    configure: string;
    active: string;
    sheetsPromoText: string;
    openSheetInBrowser: string;
    autoSyncOnScan: string;
    enabled: string;
    spreadsheetCols: string;
    authMode: string;
    scannerPromoTitle: string;
    geminiVisionBadge: string;
    scannerPromoDesc: string;
    launchScanner: string;
    viewDetails: string;
    synced: string;
    notSynced: string;
    cardOcr: string;
  };
  // Live Scan Section
  liveScan: {
    liveScanTitle: string;
    liveScanBadge: string;
    manualScanTab: string;
    liveScanTab: string;
    liveScanSubtitle: string;
    placeFrontPrompt: string;
    frontCapturedSuccess: string;
    placeBackPrompt: string;
    skipBacksideBtn: string;
    backCapturedSuccess: string;
    cardAddedToBatch: string;
    stopLiveScanBtn: string;
    resumeLiveScanBtn: string;
    batchCompletedTitle: string;
    cardsExtractedCount: string;
    saveAllToCRM: string;
    saveAllToSheets: string;
    saveCardToCRM: string;
    saveCardToSheets: string;
    editCard: string;
    editDetails: string;
    saveChanges: string;
    cancel: string;
    savingBatch: string;
    batchSavedSuccess: string;
    snapNowBtn: string;
    autoDetecting: string;
    cameraPermissionNeeded: string;
    startLiveCamera: string;
    cardCount: string;
    readyForNextCard: string;
    noCardsInBatch: string;
    reviewExtractedList: string;
  };
  // Card Scanner View
  scanner: {
    title: string;
    subtitle: string;
    manualTab: string;
    liveTab: string;
    geminiBadge: string;
    frontSideTitle: string;
    frontSideDesc: string;
    frontUploadPrompt: string;
    changePhoto: string;
    removePhoto: string;
    backSideTitle: string;
    backSideDesc: string;
    backUploadPrompt: string;
    extractBtn: string;
    extracting: string;
    reviewTitle: string;
    reviewSubtitle: string;
    fullName: string;
    company: string;
    designation: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    linkedin: string;
    notes: string;
    saveToCrm: string;
    syncToSheets: string;
    rescanBtn: string;
    takeCamera: string;
    uploadFile: string;
    successSaved: string;
    browseFiles: string;
    useCamera: string;
    scanButton: string;
    saveToPlatform: string;
    saveAndSyncSheets: string;
    dropzoneFront: string;
    dropzoneBack: string;
  };
  // Contacts Directory & Hub
  contacts: {
    hubTitle: string;
    hubSubtitle: string;
    sheetsLinked: string;
    recordsCount: string;
    exportCsv: string;
    scanCard: string;
    addContact: string;
    connectedAccounts: string;
    allAccounts: string;
    addGoogleAccount: string;
    manageSheets: string;
    viewModes: {
      standard: string;
      sheetsGrid: string;
      liveSync: string;
      auditStream: string;
    };
    filterPlaceholder: string;
    allStatus: string;
    inPlatform: string;
    syncedToSheets: string;
    cardScanOnly: string;
    pushInPlatform: string;
    pushingInPlatform: string;
    allContactsSynced: string;
    noContactsFound: string;
    noContactsSubtitle: string;
    scanFirstPrompt: string;
    tableColumns: {
      row: string;
      name: string;
      company: string;
      designation: string;
      phone: string;
      email: string;
      website: string;
      address: string;
      status: string;
      actions: string;
    };
    cardLabels: {
      individual: string;
      unnamed: string;
      inPlatformBadge: string;
      syncedBadge: string;
      cardOcrBadge: string;
    };
  };
  // Google Sheets Integration
  sheets: {
    hubTitle: string;
    hubSubtitle: string;
    multiAccountBadge: string;
    connectedGmailTitle: string;
    addGmailBtn: string;
    sheetsCollectionTitle: string;
    createNewSheetBtn: string;
    linkExistingSheetBtn: string;
    openInBrowser: string;
    activeSpreadsheet: string;
    syncAllBtn: string;
    syncingBtn: string;
    syncedRows: string;
    liveCloudGridTitle: string;
    liveCloudGridSubtitle: string;
    refreshLive: string;
    refreshingLive: string;
    realtimeSyncAudit: string;
    autoSyncOnScan: string;
    spreadsheetCols: string;
    syncingStatus: string;
    syncContacts: string;
    disconnectAccount: string;
    activeSheetBadge: string;
    syncModalTitle: string;
    syncModalDesc: string;
    syncConfirmBtn: string;
    createModalTitle: string;
    sheetNamePlaceholder: string;
    createModalDesc: string;
    createConfirmBtn: string;
    linkModalTitle: string;
    sheetUrlPlaceholder: string;
    linkModalDesc: string;
    linkConfirmBtn: string;
  };
  // Modals
  modals: {
    addContactTitle: string;
    addContactSubtitle: string;
    contactDetailsTitle: string;
    editContactTitle: string;
    saveChanges: string;
    cancel: string;
    close: string;
    delete: string;
    confirmDelete: string;
    nameRequired: string;
  };
  // Common terms
  common: {
    back: string;
    save: string;
    cancel: string;
    close: string;
    edit: string;
    delete: string;
    search: string;
    refresh: string;
    loading: string;
    success: string;
    error: string;
    active: string;
    status: string;
    actions: string;
    view: string;
    enabled: string;
    disabled: string;
  };
  // Languages
  languages: {
    en: string;
    hi: string;
    te: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      overview: 'Overview',
      cardScanner: 'Card Scanner',
      contactsCRM: 'Contacts CRM',
      googleSheets: 'Google Sheets',
      settings: 'Settings',
      coreWorkflows: 'Core Workflows',
    },
    navbar: {
      dashboardTitle: 'Executive Dashboard',
      dashboardSubtitle: 'High-level CRM metrics, visiting card scan analytics, and Google Sheets sync health',
      scannerTitle: 'Business Card Scanner',
      scannerSubtitle: 'Dual-sided visiting card OCR powered by Google Gemini Vision with Telugu & Indic script support',
      contactsTitle: 'Contacts Directory',
      contactsSubtitle: 'Centralized CRM address book with instant search, tags, and Google Sheets sync',
      sheetsTitle: 'Google Sheets Integration',
      sheetsSubtitle: 'Bidirectional sync with automated deduplication and real-time audit logs',
      searchPlaceholder: 'Search contacts, leads...',
      scanButton: 'Scan Business Card',
      sheetsLiveSync: 'Sheets Live Sync',
      backButton: 'Back',
    },
    dashboard: {
      consoleTitle: 'Executive Console',
      liveBadge: 'Live',
      scanVisitingCard: 'Scan Card',
      viewContacts: 'Contacts',
      sheetsSync: 'Google Sheets',
      totalContacts: 'Total Contacts',
      fromCards: 'from card scans',
      ocrSuccess: 'OCR Accuracy',
      visionEngine: 'Gemini Vision AI',
      indicSupport: 'Indic Scripts',
      indicDescription: 'Telugu, Hindi & English',
      sheetsStatus: 'Google Sheets',
      connected: 'Connected',
      ready: 'Ready',
      verifiedLeads: 'Active Leads',
      leadsSubtitle: 'with direct contact',
      recentCardsTitle: 'Recent Scanned Cards',
      recentCardsSubtitle: 'Extracted and verified in CRM directory',
      viewDirectory: 'View All',
      noContactsYet: 'No visiting cards scanned yet.',
      scanFirstCard: 'Scan your first visiting card →',
      sheetsIntegrationTitle: 'Google Sheets Integration',
      configure: 'Configure',
      active: 'Active',
      sheetsPromoText: 'Business card scans and CRM contacts sync directly to your spreadsheet rows.',
      openSheetInBrowser: 'Open Sheet in Browser',
      autoSyncOnScan: 'Auto-Sync on Scan',
      enabled: 'Enabled',
      spreadsheetCols: 'Spreadsheet Columns',
      authMode: 'Authentication Mode',
      scannerPromoTitle: 'Dual-Sided Visiting Card OCR',
      geminiVisionBadge: 'Gemini Vision',
      scannerPromoDesc: 'Capture or upload front and back of visiting cards with instant Telugu, Hindi, and English text extraction into your contact directory.',
      launchScanner: 'Launch Visiting Card Scanner',
      viewDetails: 'View',
      synced: 'Synced',
      notSynced: 'Local',
      cardOcr: 'Card OCR',
    },
    liveScan: {
      liveScanTitle: 'Live Continuous Scan',
      liveScanBadge: 'Batch Scanner',
      manualScanTab: '📸 Manual Scan',
      liveScanTab: '⚡ Live Scan (Batch)',
      liveScanSubtitle: 'Continuous auto-detect scanner designed for 10–100+ business cards in rapid succession.',
      placeFrontPrompt: 'Place FRONT side of card inside frame',
      frontCapturedSuccess: 'Front Side Extracted!',
      placeBackPrompt: 'Turn over & place BACK side (or tap Skip)',
      skipBacksideBtn: '⏩ Skip Backside (Front Only)',
      backCapturedSuccess: 'Back Side Extracted & Merged!',
      cardAddedToBatch: 'Card added to batch! Ready for next card',
      stopLiveScanBtn: 'Review & Save Batch',
      resumeLiveScanBtn: 'Resume Camera',
      batchCompletedTitle: 'Extracted Visiting Cards',
      cardsExtractedCount: 'Cards',
      saveAllToCRM: 'Save All to CRM',
      saveAllToSheets: 'Save & Sync All to Sheets',
      saveCardToCRM: 'Save to CRM',
      saveCardToSheets: 'Sync to Sheets',
      editCard: 'Edit Contact',
      editDetails: 'Edit Extracted Information',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      savingBatch: 'Saving batch contacts...',
      batchSavedSuccess: 'All batch contacts saved successfully!',
      snapNowBtn: 'Snap Card',
      autoDetecting: 'Auto-Detecting Card...',
      cameraPermissionNeeded: 'Camera permission required for Live Scan.',
      startLiveCamera: 'Start Live Camera Stream',
      cardCount: 'Scanned',
      readyForNextCard: 'Ready for Next Card',
      noCardsInBatch: 'No cards scanned in this batch yet.',
      reviewExtractedList: 'Review Extracted Contacts',
    },
    scanner: {
      title: 'Dual-Sided Business Card Scanner',
      subtitle: 'Capture front and back photos for complete OCR extraction powered by Gemini 2.5 Flash with Telugu & Hindi support',
      manualTab: '📸 Dual-Sided Manual Scan',
      liveTab: '⚡ Live Continuous Stream',
      geminiBadge: 'Gemini 2.5 Flash',
      frontSideTitle: 'Front Side of Card',
      frontSideDesc: 'Name, title, company, phone & email',
      frontUploadPrompt: 'Click or drop front side image',
      changePhoto: 'Change Photo',
      removePhoto: 'Remove',
      backSideTitle: 'Back Side of Card (Optional)',
      backSideDesc: 'Services, addresses, branch offices & social',
      backUploadPrompt: 'Click or drop back side image',
      extractBtn: 'Extract Contact Details with AI',
      extracting: 'Analyzing visiting card with Gemini AI...',
      reviewTitle: 'Review & Verify Extracted Contact',
      reviewSubtitle: 'AI has parsed the card details. Please confirm or edit before saving to CRM or Google Sheets.',
      fullName: 'Full Name',
      company: 'Company / Organization',
      designation: 'Job Title / Designation',
      phone: 'Phone / Mobile Numbers',
      email: 'Email Addresses',
      website: 'Website URL',
      address: 'Physical Address',
      linkedin: 'LinkedIn / Social Profile',
      notes: 'Notes / Additional Details',
      saveToCrm: 'Save to CRM Directory',
      syncToSheets: 'Push to Google Sheets',
      rescanBtn: 'Scan Another Card',
      takeCamera: 'Take Photo with Camera',
      uploadFile: 'Upload Image File',
      successSaved: 'Contact saved successfully!',
      browseFiles: 'Choose File',
      useCamera: 'Use Camera',
      scanButton: 'Extract Information',
      saveToPlatform: 'Save to CRM Directory',
      saveAndSyncSheets: 'Save and Sync to Google Sheets',
      dropzoneFront: 'Drop front card photo here',
      dropzoneBack: 'Drop back card photo (optional)',
    },
    contacts: {
      hubTitle: 'CRM Contacts Hub',
      hubSubtitle: 'Multi-account cloud sync, business card OCR directory, and live Google Sheets tables',
      sheetsLinked: 'Google Sheets Linked',
      recordsCount: 'Records',
      exportCsv: 'Export CSV',
      scanCard: 'Scan Card',
      addContact: 'Add Contact',
      connectedAccounts: 'Connected Gmail Accounts',
      allAccounts: 'All Connected Accounts',
      addGoogleAccount: 'Add Google Account',
      manageSheets: 'Manage Sheets',
      viewModes: {
        standard: 'Standard CRM Cards',
        sheetsGrid: 'Google Sheets Grid',
        liveSync: 'Live Cloud Sync',
        auditStream: 'Sync Audit Stream',
      },
      filterPlaceholder: 'Search contacts by name, company, phone, email...',
      allStatus: 'All Sync Status',
      inPlatform: 'In Platform (Pending)',
      syncedToSheets: 'Synced to Google Sheets',
      cardScanOnly: 'Card Scans Only',
      pushInPlatform: 'Push In Platform',
      pushingInPlatform: 'Pushing In Platform...',
      allContactsSynced: 'All Contacts Synced',
      noContactsFound: 'No contacts found matching criteria.',
      noContactsSubtitle: 'Try adjusting your search query or sync filters.',
      scanFirstPrompt: 'Scan your first business card to populate your CRM directory.',
      tableColumns: {
        row: 'Row',
        name: 'Full Name',
        company: 'Company',
        designation: 'Designation',
        phone: 'Phone',
        email: 'Email',
        website: 'Website',
        address: 'Address',
        status: 'Status',
        actions: 'Actions',
      },
      cardLabels: {
        individual: 'Individual',
        unnamed: 'Unnamed Contact',
        inPlatformBadge: 'In Platform',
        syncedBadge: 'Synced',
        cardOcrBadge: 'Card OCR',
      },
    },
    sheets: {
      hubTitle: 'Google Sheets CRM Workspaces',
      hubSubtitle: 'Connect multiple Gmail accounts, manage separate sheet collections in each space, and auto-route business card contacts',
      multiAccountBadge: 'Multi-Account & Multi-Sheet',
      connectedGmailTitle: 'Connected Google Accounts',
      addGmailBtn: 'Connect Another Google Account',
      sheetsCollectionTitle: 'Connected Spreadsheets',
      createNewSheetBtn: 'Create New Sheet',
      linkExistingSheetBtn: 'Link Existing Sheet ID',
      openInBrowser: 'Open in Google Sheets',
      activeSpreadsheet: 'Active Target Sheet',
      syncAllBtn: 'Push Contacts to Sheet',
      syncingBtn: 'Syncing to Google Sheets...',
      syncedRows: 'Synced Rows',
      liveCloudGridTitle: 'Live Cloud Matrix View',
      liveCloudGridSubtitle: 'Streaming directly from Google Sheets API v4 with real row indexing',
      refreshLive: 'Refresh Live Sheet',
      refreshingLive: 'Refreshing...',
      realtimeSyncAudit: 'Real-Time Sync Audit Stream',
      autoSyncOnScan: 'Auto-Sync on Scan',
      spreadsheetCols: 'Spreadsheet Columns (A–J)',
      syncingStatus: 'Syncing to Sheet...',
      syncContacts: 'Sync Contacts',
      disconnectAccount: 'Disconnect Account',
      activeSheetBadge: 'Active Target Sheet',
      syncModalTitle: 'Sync Platform Contacts to Google Sheet',
      syncModalDesc: 'Select an account and destination table to append new contact rows directly.',
      syncConfirmBtn: 'Confirm & Push to Sheet',
      createModalTitle: 'Create New Spreadsheet Table',
      sheetNamePlaceholder: 'e.g., Q1 Summit Business Leads',
      createModalDesc: 'Creates a clean Google Sheet with 10 structured header columns (A–J).',
      createConfirmBtn: 'Create & Connect Table',
      linkModalTitle: 'Link Existing Google Spreadsheet',
      sheetUrlPlaceholder: 'Paste Google Sheet URL or spreadsheet ID',
      linkModalDesc: 'Connects your existing sheet to automatically append newly captured visiting cards.',
      linkConfirmBtn: 'Link Spreadsheet',
    },
    modals: {
      addContactTitle: 'Create New Contact',
      addContactSubtitle: 'Manually add a contact to your CRM address book and sync to Google Sheets',
      contactDetailsTitle: 'Contact Profile & History',
      editContactTitle: 'Edit Contact Details',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete Contact',
      confirmDelete: 'Are you sure you want to delete this contact?',
      nameRequired: 'Name or Company Name is required',
    },
    common: {
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      edit: 'Edit',
      delete: 'Delete',
      search: 'Search',
      refresh: 'Refresh',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      active: 'Active',
      status: 'Status',
      actions: 'Actions',
      view: 'View',
      enabled: 'Enabled',
      disabled: 'Disabled',
    },
    languages: {
      en: 'English',
      hi: 'हिन्दी',
      te: 'తెలుగు',
    },
  },
  hi: {
    nav: {
      overview: 'अवलोकन',
      cardScanner: 'कार्ड स्कैनर',
      contactsCRM: 'संपर्क CRM',
      googleSheets: 'गूगल शीट्स',
      settings: 'सेटिंग्स',
      coreWorkflows: 'मुख्य कार्यप्रवाह',
    },
    navbar: {
      dashboardTitle: 'कार्यकारी डैशबोर्ड',
      dashboardSubtitle: 'उच्च-स्तरीय CRM मेट्रिक्स, विजिटिंग कार्ड स्कैन विश्लेषण और गूगल शीट्स सिंक स्थिति',
      scannerTitle: 'बिजनेस कार्ड स्कैनर',
      scannerSubtitle: 'गूगल जेमिनी विजन और हिंदी/तेलुगु इंडिक लिपि समर्थन के साथ दो-तरफा विजिटिंग कार्ड OCR',
      contactsTitle: 'संपर्क निर्देशिका',
      contactsSubtitle: 'त्वरित खोज, टैग और गूगल शीट्स सिंक के साथ केंद्रीकृत CRM एड्रेस बुक',
      sheetsTitle: 'गूगल शीट्स एकीकरण',
      sheetsSubtitle: 'स्वचालित डुप्लिकेशन निवारण और रीयल-टाइम ऑडिट लॉग के साथ द्विदिश सिंक',
      searchPlaceholder: 'संपर्क, लीड खोजें...',
      scanButton: 'विजिटिंग कार्ड स्कैन करें',
      sheetsLiveSync: 'शीट्स लाइव सिंक',
      backButton: 'वापस',
    },
    dashboard: {
      consoleTitle: 'एग्जीक्यूटिव कंसोल',
      liveBadge: 'लाइव',
      scanVisitingCard: 'कार्ड स्कैन',
      viewContacts: 'संपर्क',
      sheetsSync: 'गूगल शीट्स',
      totalContacts: 'कुल संपर्क',
      fromCards: 'विजिटिंग कार्ड से',
      ocrSuccess: 'OCR सटीकता',
      visionEngine: 'जेमिनी विजन AI',
      indicSupport: 'इंडिक भाषाएं',
      indicDescription: 'हिंदी, तेलुगु और अंग्रेजी',
      sheetsStatus: 'गूगल शीट्स',
      connected: 'संबद्ध',
      ready: 'तैयार',
      verifiedLeads: 'सक्रिय लीड्स',
      leadsSubtitle: 'प्रत्यक्ष संपर्क के साथ',
      recentCardsTitle: 'हाल ही में स्कैन किए गए कार्ड',
      recentCardsSubtitle: 'CRM में निकाला और सत्यापित किया गया',
      viewDirectory: 'सभी देखें',
      noContactsYet: 'अभी तक कोई कार्ड स्कैन नहीं हुआ है।',
      scanFirstCard: 'अपना पहला विजिटिंग कार्ड स्कैन करें →',
      sheetsIntegrationTitle: 'गूगल शीट्स एकीकरण',
      configure: 'कॉन्फ़िगर करें',
      active: 'सक्रिय',
      sheetsPromoText: 'विजिटिंग कार्ड स्कैन और CRM संपर्क सीधे आपकी स्प्रेडशीट पंक्तियों में सिंक होते हैं।',
      openSheetInBrowser: 'ब्राउज़र में शीट खोलें',
      autoSyncOnScan: 'स्कैन पर ऑटो-सिंक',
      enabled: 'सक्रिय',
      spreadsheetCols: 'स्प्रेडशीट कॉलम',
      authMode: 'प्रमाणीकरण मोड',
      scannerPromoTitle: 'दो-तरफा विजिटिंग कार्ड OCR',
      geminiVisionBadge: 'जेमिनी विजन',
      scannerPromoDesc: 'हिंदी, तेलुगु और अंग्रेजी टेक्स्ट निष्कर्षण के साथ विजिटिंग कार्ड के आगे और पीछे का हिस्सा कैप्चर करें।',
      launchScanner: 'विजिटिंग कार्ड स्कैनर शुरू करें',
      viewDetails: 'विवरण',
      synced: 'सिंक किया गया',
      notSynced: 'लोकल',
      cardOcr: 'कार्ड OCR',
    },
    liveScan: {
      liveScanTitle: 'लाइव निरंतर स्कैन',
      liveScanBadge: 'बैच स्कैनर',
      manualScanTab: '📸 मैनुअल स्कैन',
      liveScanTab: '⚡ लाइव स्कैन (बैच)',
      liveScanSubtitle: 'एक साथ 10–100+ बिजनेस कार्ड्स के तेजी से स्कैन के लिए निरंतर ऑटो-डिटेक्ट स्कैनर।',
      placeFrontPrompt: 'कार्ड का अगला भाग (Front) फ्रेम में रखें',
      frontCapturedSuccess: 'अगला भाग सफलतापूर्वक निकाला गया!',
      placeBackPrompt: 'कार्ड पलटें और पिछला भाग (Back) रखें (या स्किप करें)',
      skipBacksideBtn: '⏩ पिछला भाग छोड़ें (केवल फ्रंट)',
      backCapturedSuccess: 'पिछला भाग निकाला गया और मर्ज हुआ!',
      cardAddedToBatch: 'कार्ड बैच में जुड़ गया! अगले कार्ड के लिए तैयार',
      stopLiveScanBtn: 'समीक्षा और बैच सहेजें',
      resumeLiveScanBtn: 'कैमरा फिर से शुरू करें',
      batchCompletedTitle: 'निकाले गए विजिटिंग कार्ड',
      cardsExtractedCount: 'कार्ड',
      saveAllToCRM: 'सभी को CRM में सहेजें',
      saveAllToSheets: 'सभी को शीट्स में सिंक करें',
      saveCardToCRM: 'CRM में सहेजें',
      saveCardToSheets: 'शीट्स में सिंक करें',
      editCard: 'संपादित करें',
      editDetails: 'जानकारी संपादित करें',
      saveChanges: 'बदलाव सहेजें',
      cancel: 'रद्द करें',
      savingBatch: 'बैच संपर्क सहेजे जा रहे हैं...',
      batchSavedSuccess: 'सभी संपर्क सफलतापूर्वक सहेजे गए!',
      snapNowBtn: 'कैप्चर करें',
      autoDetecting: 'कार्ड की पहचान की जा रही है...',
      cameraPermissionNeeded: 'लाइव स्कैन के लिए कैमरा अनुमति आवश्यक है।',
      startLiveCamera: 'लाइव कैमरा शुरू करें',
      cardCount: 'स्कैन',
      readyForNextCard: 'अगले कार्ड के लिए तैयार',
      noCardsInBatch: 'इस बैच में अभी तक कोई कार्ड स्कैन नहीं हुआ है।',
      reviewExtractedList: 'निकाले गए संपर्कों की समीक्षा करें',
    },
    scanner: {
      title: 'दो-तरफा बिजनेस कार्ड स्कैनर',
      subtitle: 'जेमिनी 2.5 फ्लैश और हिंदी/तेलुगु समर्थन के साथ विजिटिंग कार्ड के आगे और पीछे का फोटो खींचकर डेटा निकालें',
      manualTab: '📸 दो-तरफा मैनुअल स्कैन',
      liveTab: '⚡ लाइव निरंतर स्ट्रीम',
      geminiBadge: 'जेमिनी 2.5 फ्लैश',
      frontSideTitle: 'कार्ड का अगला भाग (Front)',
      frontSideDesc: 'नाम, पद, कंपनी, फोन और ईमेल',
      frontUploadPrompt: 'फ्रंट साइड फोटो अपलोड या कैप्चर करें',
      changePhoto: 'फोटो बदलें',
      removePhoto: 'हटाएं',
      backSideTitle: 'कार्ड का पिछला भाग (वैकल्पिक)',
      backSideDesc: 'सेवाएं, पते, शाखाएं और सोशल लिंक',
      backUploadPrompt: 'बैक साइड फोटो अपलोड या कैप्चर करें',
      extractBtn: 'AI से संपर्क विवरण निकालें',
      extracting: 'जेमिनी AI से विजिटिंग कार्ड का विश्लेषण हो रहा है...',
      reviewTitle: 'निकाले गए विवरण की समीक्षा और पुष्टि करें',
      reviewSubtitle: 'AI ने विवरण निकाल लिया है। CRM या गूगल शीट्स में सहेजने से पहले कृपया जांचें।',
      fullName: 'पूरा नाम',
      company: 'कंपनी / संस्था',
      designation: 'पद / भूमिका',
      phone: 'फोन / मोबाइल नंबर',
      email: 'ईमेल पता',
      website: 'वेबसाइट',
      address: 'पता',
      linkedin: 'लिंक्डइन / सोशल प्रोफाइल',
      notes: 'नोट्स / अतिरिक्त विवरण',
      saveToCrm: 'CRM निर्देशिका में सहेजें',
      syncToSheets: 'गूगल शीट्स में भेजें',
      rescanBtn: 'दूसरा कार्ड स्कैन करें',
      takeCamera: 'कैमरे से फोटो लें',
      uploadFile: 'छवि फाइल अपलोड करें',
      successSaved: 'संपर्क सफलतापूर्वक सहेजा गया!',
      browseFiles: 'फ़ाइल चुनें',
      useCamera: 'कैमरा उपयोग करें',
      scanButton: 'जानकारी निकालें',
      saveToPlatform: 'CRM निर्देशिका में सहेजें',
      saveAndSyncSheets: 'गूगल शीट्स में सहेजें और सिंक करें',
      dropzoneFront: 'सामने वाले कार्ड की फ़ोटो यहां छोड़ें',
      dropzoneBack: 'पीछे वाले कार्ड की फ़ोटो छोड़ें (वैकल्पिक)',
    },
    contacts: {
      hubTitle: 'CRM संपर्क केंद्र',
      hubSubtitle: 'मल्टी-अकाउंट क्लाउड सिंक, बिजनेस कार्ड OCR निर्देशिका और लाइव गूगल शीट्स',
      sheetsLinked: 'गूगल शीट्स लिंक',
      recordsCount: 'रिकॉर्ड्स',
      exportCsv: 'CSV निर्यात करें',
      scanCard: 'कार्ड स्कैन',
      addContact: 'नया संपर्क',
      connectedAccounts: 'जुड़े हुए जीमेल खाते',
      allAccounts: 'सभी जुड़े खाते',
      addGoogleAccount: 'गूगल खाता जोड़ें',
      manageSheets: 'शीट्स प्रबंधित करें',
      viewModes: {
        standard: 'मानक CRM कार्ड्स',
        sheetsGrid: 'गूगल शीट्स ग्रिड',
        liveSync: 'लाइव क्लाउड सिंक',
        auditStream: 'सिंक ऑडिट स्ट्रीम',
      },
      filterPlaceholder: 'नाम, कंपनी, फोन, ईमेल द्वारा संपर्क खोजें...',
      allStatus: 'सभी सिंक स्थितियां',
      inPlatform: 'प्लेटफ़ॉर्म में (लंबित)',
      syncedToSheets: 'गूगल शीट्स में सिंक',
      cardScanOnly: 'केवल कार्ड स्कैन',
      pushInPlatform: 'प्लेटफ़ॉर्म संपर्क सिंक करें',
      pushingInPlatform: 'सिंक किया जा रहा है...',
      allContactsSynced: 'सभी संपर्क सिंक हैं',
      noContactsFound: 'कोई संपर्क नहीं मिला।',
      noContactsSubtitle: 'अपनी खोज या फ़िल्टर बदलकर देखें।',
      scanFirstPrompt: 'अपनी निर्देशिका शुरू करने के लिए पहला विजिटिंग कार्ड स्कैन करें।',
      tableColumns: {
        row: 'पंक्ति',
        name: 'पूरा नाम',
        company: 'कंपनी',
        designation: 'पद',
        phone: 'फोन',
        email: 'ईमेल',
        website: 'वेबसाइट',
        address: 'पता',
        status: 'स्थिति',
        actions: 'क्रियाएं',
      },
      cardLabels: {
        individual: 'व्यक्तिगत',
        unnamed: 'अनाम संपर्क',
        inPlatformBadge: 'प्लेटफ़ॉर्म में',
        syncedBadge: 'सिंक किया गया',
        cardOcrBadge: 'कार्ड OCR',
      },
    },
    sheets: {
      hubTitle: 'गूगल शीट्स CRM कार्यस्थान',
      hubSubtitle: 'एकाधिक जीमेल खाते जोड़ें, अलग-अलग शीट प्रबंधित करें और बिजनेस कार्ड संपर्कों को सीधे सिंक करें',
      multiAccountBadge: 'मल्टी-अकाउंट और मल्टी-शीट',
      connectedGmailTitle: 'जुड़े हुए गूगल खाते',
      addGmailBtn: 'अन्य गूगल खाता जोड़ें',
      sheetsCollectionTitle: 'जुड़ी हुई स्प्रेडशीट्स',
      createNewSheetBtn: 'नई शीट बनाएं',
      linkExistingSheetBtn: 'मौजूदा शीट ID लिंक करें',
      openInBrowser: 'गूगल शीट्स में खोलें',
      activeSpreadsheet: 'सक्रिय टारगेट शीट',
      syncAllBtn: 'संपर्कों को शीट में भेजें',
      syncingBtn: 'गूगल शीट्स में सिंक हो रहा है...',
      syncedRows: 'सिंक की गई पंक्तियां',
      liveCloudGridTitle: 'लाइव क्लाउड मैट्रिक्स दृश्य',
      liveCloudGridSubtitle: 'गूगल शीट्स API v4 से रीयल-टाइम रो इंडेक्सिंग के साथ डेटा स्ट्रीमिंग',
      refreshLive: 'लाइव शीट रीफ्रेश करें',
      refreshingLive: 'रीफ्रेश हो रहा है...',
      realtimeSyncAudit: 'रीयल-टाइम सिंक ऑडिट स्ट्रीम',
      autoSyncOnScan: 'स्कैन पर ऑटो-सिंक',
      spreadsheetCols: 'स्प्रेडशीट कॉलम (A–J)',
      syncingStatus: 'शीट में सिंक हो रहा है...',
      syncContacts: 'संपर्क सिंक करें',
      disconnectAccount: 'खाता डिस्कनेक्ट करें',
      activeSheetBadge: 'सक्रिय टारगेट शीट',
      syncModalTitle: 'CRM संपर्कों को गूगल शीट में सिंक करें',
      syncModalDesc: 'नए संपर्क सीधे स्प्रेडशीट में जोड़ने के लिए खाता और शीट चुनें।',
      syncConfirmBtn: 'पुष्टि करें और सिंक करें',
      createModalTitle: 'नई स्प्रेडशीट तालिका बनाएं',
      sheetNamePlaceholder: 'उदा. बिज़नेस लीड्स 2025',
      createModalDesc: '10 संरचित कॉलम (A–J) के साथ एक नई गूगल शीट बनाता है।',
      createConfirmBtn: 'शीट बनाएं और जोड़ें',
      linkModalTitle: 'मौजूदा गूगल शीट लिंक करें',
      sheetUrlPlaceholder: 'गूगल शीट URL या ID पेस्ट करें',
      linkModalDesc: 'विज़िटिंग कार्ड डेटा जोड़ने के लिए अपनी मौजूदा शीट लिंक करें।',
      linkConfirmBtn: 'स्प्रेडशीट लिंक करें',
    },
    modals: {
      addContactTitle: 'नया संपर्क बनाएं',
      addContactSubtitle: 'अपने CRM में संपर्क जोड़ें और गूगल शीट्स में सिंक करें',
      contactDetailsTitle: 'संपर्क प्रोफ़ाइल और विवरण',
      editContactTitle: 'संपर्क विवरण संपादित करें',
      saveChanges: 'बदलाव सहेजें',
      cancel: 'रद्द करें',
      close: 'बंद करें',
      delete: 'संपर्क हटाएं',
      confirmDelete: 'क्या आप वाकई इस संपर्क को हटाना चाहते हैं?',
      nameRequired: 'नाम या कंपनी का नाम आवश्यक है',
    },
    common: {
      back: 'वापस',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      close: 'बंद करें',
      edit: 'संपादित करें',
      delete: 'हटाएं',
      search: 'खोजें',
      refresh: 'रीफ्रेश करें',
      loading: 'लोड हो रहा है...',
      success: 'सफलता',
      error: 'त्रुटि',
      active: 'सक्रिय',
      status: 'स्थिति',
      actions: 'क्रियाएं',
      view: 'देखें',
      enabled: 'सक्रिय',
      disabled: 'निष्क्रिय',
    },
    languages: {
      en: 'English',
      hi: 'हिन्दी',
      te: 'తెలుగు',
    },
  },
  te: {
    nav: {
      overview: 'అవలోకనం',
      cardScanner: 'కార్డ్ స్కానర్',
      contactsCRM: 'కాంటాక్ట్స్ CRM',
      googleSheets: 'గూగుల్ షీట్స్',
      settings: 'సెట్టింగ్స్',
      coreWorkflows: 'ముఖ్య విభాగాలు',
    },
    navbar: {
      dashboardTitle: 'ఎగ్జిక్యూటివ్ డాష్‌బోర్డ్',
      dashboardSubtitle: 'CRM కొలమానాలు, విజిటింగ్ కార్డ్ స్కాన్ వివరాలు మరియు గూగుల్ షీట్స్ సింక్ సమాచారం',
      scannerTitle: 'బిజినెస్ కార్డ్ స్కానర్',
      scannerSubtitle: 'గూగుల్ జెమిని విజన్ మరియు తెలుగు/హిందీ భాషా మద్దతుతో డ్యూయల్-సైడెడ్ విజిటింగ్ కార్డ్ OCR',
      contactsTitle: 'కాంటాక్ట్స్ డైరెక్టరీ',
      contactsSubtitle: 'శోధన, ట్యాగ్‌లు మరియు గూగుల్ షీట్స్ సింక్‌తో కూడిన CRM అడ్రస్ బుక్',
      sheetsTitle: 'గూగుల్ షీట్స్ అనుసంధానం',
      sheetsSubtitle: 'ఆటోమేటిక్ డూప్లికేషన్ నివారణ మరియు రీయల్-టైమ్ ఆడిట్ లాగ్స్‌తో షీట్స్ సింక్',
      searchPlaceholder: 'కాంటాక్ట్స్, లీడ్స్ వెతకండి...',
      scanButton: 'కార్డ్ స్కాన్ చేయండి',
      sheetsLiveSync: 'షీట్స్ లైవ్ సింక్',
      backButton: 'వెనుకకు',
    },
    dashboard: {
      consoleTitle: 'ఎగ్జిక్యూటివ్ కన్సోల్',
      liveBadge: 'లైవ్',
      scanVisitingCard: 'కార్డ్ స్కాన్',
      viewContacts: 'కాంటాక్ట్స్',
      sheetsSync: 'గూగుల్ షీట్స్',
      totalContacts: 'మొత్తం కాంటాక్ట్స్',
      fromCards: 'విజిటింగ్ కార్డ్స్ ద్వారా',
      ocrSuccess: 'OCR ఖచ్చితత్వం',
      visionEngine: 'జెమిని విజన్ AI',
      indicSupport: 'భారతీయ భాషలు',
      indicDescription: 'తెలుగు, హిందీ & ఇంగ్లీష్',
      sheetsStatus: 'గూగుల్ షీట్స్',
      connected: 'కనెక్ట్ అయింది',
      ready: 'సిద్ధంగా ఉంది',
      verifiedLeads: 'యాక్టివ్ లీడ్స్',
      leadsSubtitle: 'ప్రత్యక్ష సంప్రదింపులతో',
      recentCardsTitle: 'ఇటీవల స్కాన్ చేసిన కార్డ్‌లు',
      recentCardsSubtitle: 'CRM డైరెక్టరీలో విజయవంతంగా రికార్డ్ చేయబడినవి',
      viewDirectory: 'అన్నీ చూడండి',
      noContactsYet: 'ఇంకా ఏ కార్డ్‌లూ స్కాన్ చేయలేదు.',
      scanFirstCard: 'మీ మొదటి విజిటింగ్ కార్డ్‌ని స్కాన్ చేయండి →',
      sheetsIntegrationTitle: 'గూగుల్ షీట్స్ అనుసంధానం',
      configure: 'కాన్ఫిగర్',
      active: 'యాక్టివ్',
      sheetsPromoText: 'విజిటింగ్ కార్డ్ స్కాన్లు మరియు CRM కాంటాక్ట్‌లు నేరుగా మీ గూగుల్ షీట్‌లోకి సింక్ అవుతాయి.',
      openSheetInBrowser: 'బ్రౌజర్‌లో షీట్ తెరవండి',
      autoSyncOnScan: 'ఆటో-సింక్',
      enabled: 'ఎనేబుల్ అయింది',
      spreadsheetCols: 'స్ప్రెడ్‌షీట్ నిలువు వరుసలు',
      authMode: 'ప్రామాణీకరణ మోడ్',
      scannerPromoTitle: 'డ్యూయల్-సైడెడ్ విజిటింగ్ కార్డ్ OCR',
      geminiVisionBadge: 'జెమిని విజన్',
      scannerPromoDesc: 'తెలుగు, హిందీ మరియు ఇంగ్లీష్ టెక్స్ట్ గుర్తింపుతో విజిటింగ్ కార్డ్ ముందు మరియు వెనుక భాగాన్ని స్కాన్ చేసి సేవ్ చేయండి.',
      launchScanner: 'విజిటింగ్ కార్డ్ స్కానర్ తెరవండి',
      viewDetails: 'వివరాలు',
      synced: 'సింక్ అయింది',
      notSynced: 'లోకల్',
      cardOcr: 'కార్డ్ OCR',
    },
    liveScan: {
      liveScanTitle: 'లైవ్ కంటిన్యూయస్ స్కాన్',
      liveScanBadge: 'బ్యాచ్ స్కానర్',
      manualScanTab: '📸 మాన్యువల్ స్కాన్',
      liveScanTab: '⚡ లైవ్ స్కాన్ (బ్యాచ్)',
      liveScanSubtitle: 'వరుసగా 10–100+ బిజినెస్ కార్డులను వేగంగా స్కాన్ చేయడానికి ఆటో-డిటెక్ట్ స్కానర్.',
      placeFrontPrompt: 'కార్డ్ ముందు భాగాన్ని (Front) ఫ్రేమ్‌లో ఉంచండి',
      frontCapturedSuccess: 'ముందు భాగం విజయవంతంగా గుర్తించబడింది!',
      placeBackPrompt: 'కార్డ్ తిప్పి వెనుక భాగాన్ని (Back) ఉంచండి (లేదా స్కిప్ చేయండి)',
      skipBacksideBtn: '⏩ వెనుక భాగాన్ని స్కిప్ చేయండి (ముందు మాత్రమే)',
      backCapturedSuccess: 'వెనుక భాగం గుర్తించబడి విలీనం చేయబడింది!',
      cardAddedToBatch: 'కార్డ్ బ్యాచ్‌లో చేర్చబడింది! తదుపరి కార్డుకు సిద్ధం',
      stopLiveScanBtn: 'సమీక్షించండి & సేవ్ చేయండి',
      resumeLiveScanBtn: 'కెమెరా ప్రారంభించండి',
      batchCompletedTitle: 'సేకరించిన విజిటింగ్ కార్డులు',
      cardsExtractedCount: 'కార్డులు',
      saveAllToCRM: 'అన్నీ CRMలో సేవ్ చేయండి',
      saveAllToSheets: 'అన్నీ షీట్స్‌కి సింక్ చేయండి',
      saveCardToCRM: 'CRMలో సేవ్ చేయండి',
      saveCardToSheets: 'షీట్స్‌కి సింక్ చేయండి',
      editCard: 'సవరించండి',
      editDetails: 'వివరాలు సవరించండి',
      saveChanges: 'మార్పులు సేవ్ చేయండి',
      cancel: 'రద్దు చేయండి',
      savingBatch: 'బ్యాచ్ కాంటాక్ట్‌లు సేవ్ చేయబడుతున్నాయి...',
      batchSavedSuccess: 'అన్ని కాంటాక్ట్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి!',
      snapNowBtn: 'క్యాప్చర్ చేయండి',
      autoDetecting: 'కార్డ్ గుర్తించబడుతోంది...',
      cameraPermissionNeeded: 'లైవ్ స్కాన్ కోసం కెమెరా అనుమతి అవసరం.',
      startLiveCamera: 'లైవ్ కెమెరా ప్రారంభించండి',
      cardCount: 'స్కాన్ చేసినవి',
      readyForNextCard: 'తదుపరి కార్డుకు సిద్ధంగా ఉంది',
      noCardsInBatch: 'ఈ బ్యాచ్‌లో ఇంకా ఏ కార్డులూ స్కాన్ చేయలేదు.',
      reviewExtractedList: 'సేకరించిన కాంటాక్ట్‌లను సమీక్షించండి',
    },
    scanner: {
      title: 'డ్యూయల్-సైడెడ్ విజిటింగ్ కార్డ్ స్కానర్',
      subtitle: 'జెమిని 2.5 ఫ్లాష్ మరియు తెలుగు/హిందీ భాషల మద్దతుతో విజిటింగ్ కార్డ్ ముందు మరియు వెనుక ఫోటోలతో డేటా సేకరించండి',
      manualTab: '📸 రెండు వైపులా మాన్యువల్ స్కాన్',
      liveTab: '⚡ లైవ్ కంటిన్యూయస్ స్ట్రీమ్',
      geminiBadge: 'జెమిని 2.5 ఫ్లాష్',
      frontSideTitle: 'కార్డ్ ముందు భాగం (Front Side)',
      frontSideDesc: 'పేరు, హోదా, కంపెనీ, ఫోన్ & ఈమెయిల్',
      frontUploadPrompt: 'ముందు భాగం ఫోటో అప్‌లోడ్ చేయండి లేదా తీయండి',
      changePhoto: 'ఫోటో మార్చండి',
      removePhoto: 'తొలగించండి',
      backSideTitle: 'కార్డ్ వెనుక భాగం (ఐచ్ఛికం)',
      backSideDesc: 'సేవలు, చిరునామాలు, శాఖలు & సోషల్ లింకులు',
      backUploadPrompt: 'వెనుక భాగం ఫోటో అప్‌లోడ్ చేయండి లేదా తీయండి',
      extractBtn: 'AI ద్వారా వివరాలు సేకరించండి',
      extracting: 'జెమిని AI ద్వారా విజిటింగ్ కార్డ్ విశ్లేషించబడుతోంది...',
      reviewTitle: 'సేకరించిన వివరాలను సమీక్షించి నిర్ధారించండి',
      reviewSubtitle: 'AI కార్డు వివరాలను సంగ్రహించింది. CRM లేదా గూగుల్ షీట్స్‌లో భద్రపరిచే ముందు సరిచూసుకోండి.',
      fullName: 'పూర్తి పేరు',
      company: 'కంపెనీ / సంస్థ',
      designation: 'హోదా / ఉద్యోగం',
      phone: 'ఫోన్ / మొబైల్ నంబర్లు',
      email: 'ఈమెయిల్ చిరునామా',
      website: 'వెబ్‌సైట్',
      address: 'చిరునామా',
      linkedin: 'లింక్డ్‌ఇన్ / సోషల్ ప్రొఫైల్',
      notes: 'గమనికలు / అదనపు వివరాలు',
      saveToCrm: 'CRM డైరెక్టరీలో సేవ్ చేయండి',
      syncToSheets: 'గూగుల్ షీట్‌కి పంపండి',
      rescanBtn: 'మరొక కార్డ్ స్కాన్ చేయండి',
      takeCamera: 'కెమెరాతో ఫోటో తీయండి',
      uploadFile: 'ఇమేజ్ ఫైల్ అప్‌లోడ్ చేయండి',
      successSaved: 'కాంటాక్ట్ విజయవంతంగా సేవ్ చేయబడింది!',
      browseFiles: 'ఫైల్ ఎంచుకోండి',
      useCamera: 'కెమెరా వాడండి',
      scanButton: 'సమాచారం సేకరించండి',
      saveToPlatform: 'CRM డైరెక్టరీలో సేవ్ చేయండి',
      saveAndSyncSheets: 'సేవ్ చేసి గూగుల్ షీట్‌కి సింక్ చేయండి',
      dropzoneFront: 'కార్డ్ ముందు భాగం ఫోటో ఇక్కడ వేయండి',
      dropzoneBack: 'కార్డ్ వెనుక భాగం ఫోటో ఇక్కడ వేయండి (ఐచ్ఛికం)',
    },
    contacts: {
      hubTitle: 'CRM కాంటాక్ట్స్ హబ్',
      hubSubtitle: 'మల్టీ-అకౌంట్ క్లౌడ్ సింక్, విజిటింగ్ కార్డ్ OCR డైరెక్టరీ మరియు లైవ్ గూగుల్ షీట్స్',
      sheetsLinked: 'గూగుల్ షీట్స్ అనుసంధానించబడింది',
      recordsCount: 'రికార్డులు',
      exportCsv: 'CSV డౌన్‌లోడ్',
      scanCard: 'కార్డ్ స్కాన్',
      addContact: 'కొత్త కాంటాక్ట్',
      connectedAccounts: 'కనెక్ట్ చేసిన జీమెయిల్ ఖాతాలు',
      allAccounts: 'అన్ని కనెక్ట్ చేసిన ఖాతాలు',
      addGoogleAccount: 'గూగుల్ ఖాతా జోడించండి',
      manageSheets: 'షీట్స్ నిర్వహించండి',
      viewModes: {
        standard: 'CRM కార్డులు',
        sheetsGrid: 'గూగుల్ షీట్స్ గ్రిడ్',
        liveSync: 'లైవ్ క్లౌడ్ సింక్',
        auditStream: 'సింక్ ఆడిట్ స్ట్రీమ్',
      },
      filterPlaceholder: 'పేరు, కంపెనీ, ఫోన్, ఈమెయిల్ ద్వారా వెతకండి...',
      allStatus: 'అన్ని సింక్ స్థితులు',
      inPlatform: 'ప్లాట్‌ఫారమ్‌లో ఉంది (పెండింగ్)',
      syncedToSheets: 'గూగుల్ షీట్స్‌కి సింక్ అయింది',
      cardScanOnly: 'కార్డ్ స్కాన్లు మాత్రమే',
      pushInPlatform: 'ప్లాట్‌ఫారమ్ కాంటాక్ట్స్ సింక్ చేయండి',
      pushingInPlatform: 'సింక్ అవుతోంది...',
      allContactsSynced: 'అన్ని కాంటాక్ట్స్ సింక్ అయ్యాయి',
      noContactsFound: 'ఏ కాంటాక్ట్‌లూ కనుగొనబడలేదు.',
      noContactsSubtitle: 'మీ శోధన లేదా ఫిల్టర్లను మార్చి ప్రయత్నించండి.',
      scanFirstPrompt: 'మీ డైరెక్టరీని ప్రారంభించడానికి మీ మొదటి విజిటింగ్ కార్డును స్కాన్ చేయండి.',
      tableColumns: {
        row: 'వరుస',
        name: 'పూర్తి పేరు',
        company: 'కంపెనీ',
        designation: 'హోదా',
        phone: 'ఫోన్',
        email: 'ఈమెయిల్',
        website: 'వెబ్‌సైట్',
        address: 'చిరునామా',
        status: 'స్థితి',
        actions: 'చర్యలు',
      },
      cardLabels: {
        individual: 'వ్యక్తిగత',
        unnamed: 'పేరులేని కాంటాక్ట్',
        inPlatformBadge: 'ప్లాట్‌ఫారమ్‌లో ఉంది',
        syncedBadge: 'సింక్ అయింది',
        cardOcrBadge: 'కార్డ్ OCR',
      },
    },
    sheets: {
      hubTitle: 'గూగుల్ షీట్స్ CRM వర్క్‌స్పేస్',
      hubSubtitle: 'ఒకటికి మించిన జీమెయిల్ ఖాతాలను కనెక్ట్ చేయండి, విడివిడిగా షీట్స్ నిర్వహించండి మరియు కార్డ్ కాంటాక్ట్‌లను ఆటో-సింక్ చేయండి',
      multiAccountBadge: 'మల్టీ-అకౌంట్ & మల్టీ-షీట్',
      connectedGmailTitle: 'కనెక్ట్ చేసిన గూగుల్ ఖాతాలు',
      addGmailBtn: 'మరొక గూగుల్ ఖాతా జోడించండి',
      sheetsCollectionTitle: 'కనెక్ట్ చేసిన స్ప్రెడ్‌షీట్‌లు',
      createNewSheetBtn: 'కొత్త షీట్ తయారు చేయండి',
      linkExistingSheetBtn: 'ఇప్పటికే ఉన్న షీట్ ID లింక్ చేయండి',
      openInBrowser: 'గూగుల్ షీట్స్‌లో తెరవండి',
      activeSpreadsheet: 'ప్రస్తుత టార్గెట్ షీట్',
      syncAllBtn: 'కాంటాక్ట్‌లను షీట్‌కి పంపండి',
      syncingBtn: 'గూగుల్ షీట్స్‌కి సింక్ అవుతోంది...',
      syncedRows: 'సింక్ అయిన వరుసలు',
      liveCloudGridTitle: 'లైవ్ క్లౌడ్ మ్యాట్రిక్స్ వ్యూ',
      liveCloudGridSubtitle: 'గూగుల్ షీట్స్ API v4 ద్వారా రియల్-టైమ్ రో ఇండెక్సింగ్‌తో డేటా స్ట్రీమింగ్',
      refreshLive: 'లైవ్ షీట్ రిఫ్రెష్ చేయండి',
      refreshingLive: 'రిఫ్రెష్ అవుతోంది...',
      realtimeSyncAudit: 'రియల్-టైమ్ సింక్ ఆడిట్ స్ట్రీమ్',
      autoSyncOnScan: 'ఆటో-సింక్',
      spreadsheetCols: 'స్ప్రెడ్‌షీట్ నిలువు వరుసలు (A–J)',
      syncingStatus: 'షీట్‌కి సింక్ అవుతోంది...',
      syncContacts: 'కాంటాక్ట్‌లు సింక్ చేయండి',
      disconnectAccount: 'ఖాతా డిస్‌కనెక్ట్ చేయండి',
      activeSheetBadge: 'ప్రస్తుత టార్గెట్ షీట్',
      syncModalTitle: 'కాంటాక్ట్‌లను గూగుల్ షీట్‌కి సింక్ చేయండి',
      syncModalDesc: 'నేరుగా స్ప్రెడ్‌షీట్‌లోకి వరుసలను చేర్చడానికి ఖాతా మరియు షీట్‌ను ఎంచుకోండి.',
      syncConfirmBtn: 'ధృవీకరించి సింక్ చేయండి',
      createModalTitle: 'కొత్త స్ప్రెడ్‌షీట్ టేబుల్ తయారు చేయండి',
      sheetNamePlaceholder: 'ఉదా: వ్యాపార లీడ్స్ 2025',
      createModalDesc: '10 ప్రామాణిక నిలువు వరుసలతో (A–J) కొత్త గూగుల్ షీట్ రూపొందిస్తుంది.',
      createConfirmBtn: 'టేబుల్ తయారు చేయండి',
      linkModalTitle: 'ఇప్పటికే ఉన్న గూగుల్ షీట్‌ను లింక్ చేయండి',
      sheetUrlPlaceholder: 'గూగుల్ షీట్ URL లేదా ID ఇక్కడ పేస్ట్ చేయండి',
      linkModalDesc: 'విజిటింగ్ కార్డుల వివరాలు ఆటోమేటిక్‌గా చేర్చడానికి మీ షీట్‌ను కనెక్ట్ చేయండి.',
      linkConfirmBtn: 'స్ప్రెడ్‌షీట్ లింక్ చేయండి',
    },
    modals: {
      addContactTitle: 'కొత్త కాంటాక్ట్ జోడించండి',
      addContactSubtitle: 'మీ CRM అడ్రస్ బుక్‌లో వివరాలు చేర్చండి మరియు గూగుల్ షీట్స్‌కి సింక్ చేయండి',
      contactDetailsTitle: 'కాంటాక్ట్ ప్రొఫైల్ మరియు చరిత్ర',
      editContactTitle: 'వివరాలు సవరించండి',
      saveChanges: 'మార్పులు సేవ్ చేయండి',
      cancel: 'రద్దు చేయండి',
      close: 'మూసివేయండి',
      delete: 'కాంటాక్ట్ తొలగించండి',
      confirmDelete: 'మీరు ఖచ్చితంగా ఈ కాంటాక్ట్‌ను తొలగించాలనుకుంటున్నారా?',
      nameRequired: 'పేరు లేదా కంపెనీ పేరు అవసరం',
    },
    common: {
      back: 'వెనుకకు',
      save: 'సేవ్ చేయండి',
      cancel: 'రద్దు చేయండి',
      close: 'మూసివేయండి',
      edit: 'సవరించండి',
      delete: 'తొలగించండి',
      search: 'వెతకండి',
      refresh: 'రిఫ్రెష్',
      loading: 'లోడ్ అవుతోంది...',
      success: 'విజయవంతం',
      error: 'లోపం',
      active: 'యాక్టివ్',
      status: 'స్థితి',
      actions: 'చర్యలు',
      view: 'చూడండి',
      enabled: 'ఎనేబుల్ అయింది',
      disabled: 'డిసేబుల్ అయింది',
    },
    languages: {
      en: 'English',
      hi: 'हिन्दी',
      te: 'తెలుగు',
    },
  },
};
