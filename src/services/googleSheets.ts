// Real Google Sheets API v4 Service

export interface ConnectedSheetInfo {
  id: string;
  title: string;
  url: string;
  lastSyncedAt?: string;
  rowCount?: number;
  accountEmail?: string;
}

export interface GoogleAccountSpace {
  id: string; // normalized email
  email: string;
  displayName?: string;
  photoURL?: string;
  connectedAt: string;
  sheets: ConnectedSheetInfo[];
  activeSheetId?: string;
}

const LEGACY_STORAGE_KEY = 'cardflow_connected_sheet';
const ACCOUNTS_STORAGE_KEY = 'cardflow_google_accounts_spaces';
const ACTIVE_ACCOUNT_KEY = 'cardflow_active_google_account_email';

// Retrieve all connected Google account spaces
export const getStoredGoogleAccounts = (): GoogleAccountSpace[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      // Migrate legacy single-sheet storage if present
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacySheet: ConnectedSheetInfo = JSON.parse(legacyRaw);
        const defaultAccount: GoogleAccountSpace = {
          id: 'default',
          email: 'Primary Google Account',
          displayName: 'Google Workspace User',
          connectedAt: new Date().toISOString(),
          sheets: [legacySheet],
          activeSheetId: legacySheet.id,
        };
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([defaultAccount]));
        return [defaultAccount];
      }
      return [];
    }
    const accounts: GoogleAccountSpace[] = JSON.parse(raw);
    return accounts;
  } catch {
    return [];
  }
};

export const saveStoredGoogleAccounts = (accounts: GoogleAccountSpace[]) => {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to persist Google accounts to storage:', err);
  }
};

export const getActiveAccountEmail = (): string | null => {
  try {
    const stored = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (stored) return stored;
    const accounts = getStoredGoogleAccounts();
    return accounts[0]?.email || null;
  } catch {
    return null;
  }
};

export const setActiveAccountEmail = (email: string | null) => {
  try {
    if (email) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, email);
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cardflow:workspace-changed', { detail: { email } }));
    }
  } catch {}
};

export const getActiveAccountSpace = (): GoogleAccountSpace | null => {
  const accounts = getStoredGoogleAccounts();
  if (accounts.length === 0) return null;
  const activeEmail = getActiveAccountEmail();
  if (activeEmail) {
    const found = accounts.find((a) => a.email.toLowerCase() === activeEmail.toLowerCase());
    if (found) return found;
  }
  return accounts[0];
};

export const addOrUpdateAccountSpace = (data: {
  email: string;
  displayName?: string;
  photoURL?: string;
}): GoogleAccountSpace => {
  const accounts = getStoredGoogleAccounts();
  const normalizedEmail = data.email.trim();
  const existingIdx = accounts.findIndex(
    (a) => a.email.toLowerCase() === normalizedEmail.toLowerCase()
  );

  let updatedAccount: GoogleAccountSpace;

  if (existingIdx >= 0) {
    updatedAccount = {
      ...accounts[existingIdx],
      displayName: data.displayName || accounts[existingIdx].displayName,
      photoURL: data.photoURL || accounts[existingIdx].photoURL,
    };
    accounts[existingIdx] = updatedAccount;
  } else {
    updatedAccount = {
      id: normalizedEmail.toLowerCase(),
      email: normalizedEmail,
      displayName: data.displayName || normalizedEmail.split('@')[0],
      photoURL: data.photoURL,
      connectedAt: new Date().toISOString(),
      sheets: [],
    };
    accounts.push(updatedAccount);
  }

  saveStoredGoogleAccounts(accounts);
  setActiveAccountEmail(normalizedEmail);
  return updatedAccount;
};

export const removeAccountSpace = (email: string) => {
  const accounts = getStoredGoogleAccounts();
  const filtered = accounts.filter(
    (a) => a.email.toLowerCase() !== email.toLowerCase()
  );
  saveStoredGoogleAccounts(filtered);
  const active = getActiveAccountEmail();
  if (active && active.toLowerCase() === email.toLowerCase()) {
    if (filtered.length > 0) {
      setActiveAccountEmail(filtered[0].email);
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
};

export const addSheetToAccount = (
  email: string,
  sheet: ConnectedSheetInfo
): ConnectedSheetInfo => {
  const accounts = getStoredGoogleAccounts();
  const target = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (target) {
    const existingSheetIdx = target.sheets.findIndex((s) => s.id === sheet.id);
    const enrichedSheet: ConnectedSheetInfo = {
      ...sheet,
      accountEmail: email,
    };
    if (existingSheetIdx >= 0) {
      target.sheets[existingSheetIdx] = enrichedSheet;
    } else {
      target.sheets.push(enrichedSheet);
    }
    // Set as active sheet if none active
    if (!target.activeSheetId || target.sheets.length === 1) {
      target.activeSheetId = sheet.id;
    }
    saveStoredGoogleAccounts(accounts);
    setStoredSheetInfo(enrichedSheet);
    return enrichedSheet;
  }
  return sheet;
};

export const removeSheetFromAccount = (email: string, sheetId: string) => {
  const accounts = getStoredGoogleAccounts();
  const target = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (target) {
    target.sheets = target.sheets.filter((s) => s.id !== sheetId);
    if (target.activeSheetId === sheetId) {
      target.activeSheetId = target.sheets[0]?.id || undefined;
    }
    saveStoredGoogleAccounts(accounts);
    const currentActiveSheet = target.sheets.find((s) => s.id === target.activeSheetId);
    setStoredSheetInfo(currentActiveSheet || null);
  }
};

export const setActiveSheetForAccount = (email: string, sheetId: string) => {
  const accounts = getStoredGoogleAccounts();
  const target = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (target) {
    target.activeSheetId = sheetId;
    saveStoredGoogleAccounts(accounts);
    const selectedSheet = target.sheets.find((s) => s.id === sheetId);
    if (selectedSheet) {
      setStoredSheetInfo(selectedSheet);
    }
  }
};

export const updateSheetInAccount = (
  email: string,
  updatedSheet: Partial<ConnectedSheetInfo> & { id: string }
) => {
  const accounts = getStoredGoogleAccounts();
  const target = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (target) {
    const sIdx = target.sheets.findIndex((s) => s.id === updatedSheet.id);
    if (sIdx >= 0) {
      target.sheets[sIdx] = { ...target.sheets[sIdx], ...updatedSheet };
      saveStoredGoogleAccounts(accounts);
      if (target.activeSheetId === updatedSheet.id) {
        setStoredSheetInfo(target.sheets[sIdx]);
      }
    }
  }
};

export const getStoredSheetInfo = (): ConnectedSheetInfo | null => {
  try {
    const activeSpace = getActiveAccountSpace();
    if (activeSpace && activeSpace.sheets.length > 0) {
      const activeSheet = activeSpace.sheets.find((s) => s.id === activeSpace.activeSheetId) || activeSpace.sheets[0];
      if (activeSheet) return activeSheet;
    }
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setStoredSheetInfo = (info: ConnectedSheetInfo | null) => {
  if (!info) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } else {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(info));
  }
};

export const getSheetTitleOrFirst = async (
  accessToken: string,
  spreadsheetId: string
): Promise<string> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const sheetTitles: string[] =
        data.sheets?.map((s: any) => s.properties?.title) || [];
      if (sheetTitles.includes('Contacts')) return 'Contacts';
      if (sheetTitles.length > 0) return sheetTitles[0];
    }
  } catch (err) {
    console.warn('Could not inspect spreadsheet metadata for sheet title:', err);
  }
  return 'Contacts';
};

export const createGoogleSheet = async (
  accessToken: string,
  customTitle?: string,
  targetEmail?: string,
  initialContacts?: any[]
): Promise<ConnectedSheetInfo> => {
  const title = customTitle || `CardFlow CRM Contacts - ${new Date().toLocaleDateString()}`;

  // 1. Create Spreadsheet
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Contacts',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Failed to create Google Sheet (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const url = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Initialize Header Row and Initial Contacts if provided
  const headers = [
    'Full Name',
    'Company Name',
    'Designation / Title',
    'Mobile Numbers',
    'Email Addresses',
    'Website',
    'Physical Address',
    'LinkedIn',
    'Notes / Details',
    'Timestamp',
  ];

  const allRows: string[][] = [headers];
  if (initialContacts && Array.isArray(initialContacts) && initialContacts.length > 0) {
    initialContacts.forEach((c) => {
      allRows.push([
        String(c.name || ''),
        String(c.company_name || ''),
        String(c.designation || ''),
        Array.isArray(c.mobile_numbers)
          ? c.mobile_numbers.join(', ')
          : String(c.mobile_numbers || c.phone || ''),
        Array.isArray(c.email_addresses)
          ? c.email_addresses.join(', ')
          : String(c.email_addresses || c.email || ''),
        String(c.website || ''),
        String(c.address || ''),
        String(c.linkedin || ''),
        String(c.notes || c.other_details || ''),
        new Date(c.created_at || Date.now()).toLocaleString(),
      ]);
    });
  }

  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Contacts!A1:J${allRows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `Contacts!A1:J${allRows.length}`,
        majorDimension: 'ROWS',
        values: allRows,
      }),
    }
  );

  if (!putRes.ok) {
    console.warn('Could not write initial header/rows to new sheet:', await putRes.text());
  }

  const sheetInfo: ConnectedSheetInfo = {
    id: spreadsheetId,
    title,
    url,
    lastSyncedAt: new Date().toISOString(),
    rowCount: allRows.length,
    accountEmail: targetEmail,
  };

  setStoredSheetInfo(sheetInfo);

  if (targetEmail) {
    addSheetToAccount(targetEmail, sheetInfo);
  } else {
    const activeSpace = getActiveAccountSpace();
    if (activeSpace) {
      addSheetToAccount(activeSpace.email, sheetInfo);
    }
  }

  return sheetInfo;
};

export const appendContactToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  contact: {
    name: string;
    company_name: string;
    designation?: string;
    mobile_numbers?: string[];
    email_addresses?: string[];
    website?: string;
    address?: string;
    linkedin?: string;
    other_details?: string;
    notes?: string;
    created_at?: string;
  },
  targetEmail?: string
): Promise<boolean> => {
  const sheetTab = await getSheetTitleOrFirst(accessToken, spreadsheetId);
  const safeTitle = `'${sheetTab.replace(/'/g, "''")}'`;
  const fullRange = `${safeTitle}!A:J`;

  // Check if header row exists
  let hasHeader = false;
  try {
    const headRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `${safeTitle}!A1:J1`
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (headRes.ok) {
      const headData = await headRes.json();
      if (headData.values && headData.values.length > 0 && headData.values[0].length > 0) {
        hasHeader = true;
      }
    }
  } catch (err) {
    console.warn('Could not check header row:', err);
  }

  const headers = [
    'Full Name',
    'Company Name',
    'Designation / Title',
    'Mobile Numbers',
    'Email Addresses',
    'Website',
    'Physical Address',
    'LinkedIn',
    'Notes / Details',
    'Timestamp',
  ];

  const row = [
    String(contact.name || ''),
    String(contact.company_name || ''),
    String(contact.designation || ''),
    Array.isArray(contact.mobile_numbers)
      ? contact.mobile_numbers.join(', ')
      : String(contact.mobile_numbers || ''),
    Array.isArray(contact.email_addresses)
      ? contact.email_addresses.join(', ')
      : String(contact.email_addresses || ''),
    String(contact.website || ''),
    String(contact.address || ''),
    String(contact.linkedin || ''),
    String(contact.notes || contact.other_details || ''),
    new Date(contact.created_at || Date.now()).toLocaleString(),
  ];

  const valuesToSend = hasHeader ? [row] : [headers, row];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      fullRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: fullRange,
        majorDimension: 'ROWS',
        values: valuesToSend,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to append contact row to Google Sheet (${res.status})`);
  }

  // Update stored last synced timestamp
  const stored = getStoredSheetInfo();
  if (stored && stored.id === spreadsheetId) {
    setStoredSheetInfo({
      ...stored,
      lastSyncedAt: new Date().toISOString(),
      rowCount: (stored.rowCount || 1) + 1,
    });
  }

  // Update in account space
  const accounts = getStoredGoogleAccounts();
  accounts.forEach((acc) => {
    const s = acc.sheets.find((sh) => sh.id === spreadsheetId);
    if (s) {
      updateSheetInAccount(acc.email, {
        id: spreadsheetId,
        lastSyncedAt: new Date().toISOString(),
        rowCount: (s.rowCount || 1) + 1,
      });
    }
  });

  return true;
};

export const batchSyncContactsToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  contacts: any[],
  targetEmail?: string
): Promise<{ count: number }> => {
  if (!contacts || contacts.length === 0) return { count: 0 };

  const sheetTab = await getSheetTitleOrFirst(accessToken, spreadsheetId);
  const safeTitle = `'${sheetTab.replace(/'/g, "''")}'`;
  const fullRange = `${safeTitle}!A:J`;

  // Check if header row exists
  let hasHeader = false;
  try {
    const headRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `${safeTitle}!A1:J1`
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (headRes.ok) {
      const headData = await headRes.json();
      if (headData.values && headData.values.length > 0 && headData.values[0].length > 0) {
        hasHeader = true;
      }
    }
  } catch (err) {
    console.warn('Could not check header row:', err);
  }

  const headers = [
    'Full Name',
    'Company Name',
    'Designation / Title',
    'Mobile Numbers',
    'Email Addresses',
    'Website',
    'Physical Address',
    'LinkedIn',
    'Notes / Details',
    'Timestamp',
  ];

  const rows = contacts.map((c) => [
    String(c.name || ''),
    String(c.company_name || ''),
    String(c.designation || ''),
    Array.isArray(c.mobile_numbers)
      ? c.mobile_numbers.join(', ')
      : String(c.mobile_numbers || c.phone || ''),
    Array.isArray(c.email_addresses)
      ? c.email_addresses.join(', ')
      : String(c.email_addresses || c.email || ''),
    String(c.website || ''),
    String(c.address || ''),
    String(c.linkedin || ''),
    String(c.notes || c.other_details || ''),
    new Date(c.created_at || Date.now()).toLocaleString(),
  ]);

  const valuesToSend = hasHeader ? rows : [headers, ...rows];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      fullRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: fullRange,
        majorDimension: 'ROWS',
        values: valuesToSend,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to sync contacts to Google Sheet (${res.status})`);
  }

  const stored = getStoredSheetInfo();
  if (stored && stored.id === spreadsheetId) {
    setStoredSheetInfo({
      ...stored,
      lastSyncedAt: new Date().toISOString(),
      rowCount: (stored.rowCount || 1) + rows.length,
    });
  }

  const allAccounts = getStoredGoogleAccounts();
  allAccounts.forEach((acc) => {
    const s = acc.sheets.find((sh) => sh.id === spreadsheetId);
    if (s) {
      updateSheetInAccount(acc.email, {
        id: spreadsheetId,
        lastSyncedAt: new Date().toISOString(),
        rowCount: (s.rowCount || 1) + rows.length,
      });
    }
  });

  return { count: rows.length };
};

export const fetchSheetRows = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; rows: string[][] }> => {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    throw new Error('Spreadsheet not found or access denied');
  }

  const metaData = await metaRes.json();
  const title = metaData.properties?.title || 'Google Sheet';
  const firstSheetName = metaData.sheets?.[0]?.properties?.title || 'Contacts';
  const safeTitle = `'${firstSheetName.replace(/'/g, "''")}'`;

  const rowsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${safeTitle}!A1:J100`
    )}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!rowsRes.ok) {
    return { title, rows: [] };
  }

  const rowsData = await rowsRes.json();
  return {
    title,
    rows: rowsData.values || [],
  };
};
