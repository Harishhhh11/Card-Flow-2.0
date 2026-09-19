import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets & Drive Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Cache access tokens in memory and session storage
let cachedAccessToken: string | null = null;
const tokensByEmail: Record<string, string> = {};
let activeSignInPromise: Promise<{ user: FirebaseUser; accessToken: string }> | null = null;

// Helper to safely access session storage
const getSessionToken = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setSessionToken = (key: string, value: string | null) => {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {}
};

export const isUserCancelledAuth = (error: any): boolean => {
  if (!error) return false;
  const code = typeof error === 'object' ? error.code : '';
  const message = typeof error === 'object' && error.message ? error.message : '';
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('auth/popup-closed-by-user') ||
    message.includes('auth/cancelled-popup-request') ||
    Boolean(error.isUserCancelled)
  );
};

export const isGoogleUnverifiedTesterError = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error === 'object' && error.message ? error.message : String(error);
  return (
    message.includes('access_denied') ||
    message.includes('has not completed the Google verification process') ||
    message.includes('developer-approved testers') ||
    error.code === 'auth/access-denied'
  );
};

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      const email = user.email?.toLowerCase();
      const token = (email && getAccessTokenForEmail(email)) || getAccessTokenForEmail();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!activeSignInPromise) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface GoogleSignInOptions {
  emailHint?: string;
  promptSelectAccount?: boolean;
}

export const googleSignIn = async (
  options?: GoogleSignInOptions
): Promise<{ user: FirebaseUser; accessToken: string }> => {
  // If a popup request is already actively in-flight, reuse it rather than spawning
  // a concurrent request that cancels the existing popup
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  // If email hint is provided and we already have a valid token, return without popup
  if (options?.emailHint) {
    const existingToken = getAccessTokenForEmail(options.emailHint);
    if (existingToken && auth.currentUser) {
      return { user: auth.currentUser, accessToken: existingToken };
    }
  }

  // Configure parameters: use login_hint if email is specified so user is NOT prompted to select account
  if (options?.emailHint) {
    provider.setCustomParameters({
      login_hint: options.emailHint,
    });
  } else if (options?.promptSelectAccount) {
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  } else {
    provider.setCustomParameters({});
  }

  activeSignInPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Could not retrieve access token from Google authentication.');
      }
      cachedAccessToken = credential.accessToken;
      setSessionToken('cardflow_active_token', credential.accessToken);

      if (result.user.email) {
        const key = result.user.email.toLowerCase();
        tokensByEmail[key] = credential.accessToken;
        setSessionToken(`cardflow_token_${key}`, credential.accessToken);
      }
      return { user: result.user, accessToken: credential.accessToken };
    } catch (error: any) {
      if (isUserCancelledAuth(error)) {
        // Tag with user cancellation flag and log at debug/info level instead of error
        error.isUserCancelled = true;
        console.info('Google sign-in popup was closed or cancelled by user.');
      } else {
        console.error('Google Sign In Error:', error);
      }
      throw error;
    } finally {
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  const fromSession = getSessionToken('cardflow_active_token');
  if (fromSession) {
    cachedAccessToken = fromSession;
    return fromSession;
  }
  return null;
};

export const getAccessTokenForEmail = (email?: string): string | null => {
  if (!email) {
    if (cachedAccessToken) return cachedAccessToken;
    const sessionActive = getSessionToken('cardflow_active_token');
    if (sessionActive) {
      cachedAccessToken = sessionActive;
      return sessionActive;
    }
    return null;
  }

  const key = email.toLowerCase();
  if (tokensByEmail[key]) return tokensByEmail[key];

  const fromSession = getSessionToken(`cardflow_token_${key}`);
  if (fromSession) {
    tokensByEmail[key] = fromSession;
    return fromSession;
  }

  if (cachedAccessToken) return cachedAccessToken;
  return getSessionToken('cardflow_active_token');
};

export const setAccessTokenForEmail = (email: string, token: string | null) => {
  const key = email.toLowerCase();
  if (token) {
    tokensByEmail[key] = token;
    cachedAccessToken = token;
    setSessionToken(`cardflow_token_${key}`, token);
    setSessionToken('cardflow_active_token', token);
  } else {
    delete tokensByEmail[key];
    setSessionToken(`cardflow_token_${key}`, null);
  }
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  setSessionToken('cardflow_active_token', token);
};

export const logoutGoogle = async (email?: string) => {
  if (email) {
    const key = email.toLowerCase();
    delete tokensByEmail[key];
    setSessionToken(`cardflow_token_${key}`, null);
  } else {
    await signOut(auth);
    cachedAccessToken = null;
    setSessionToken('cardflow_active_token', null);
  }
};
