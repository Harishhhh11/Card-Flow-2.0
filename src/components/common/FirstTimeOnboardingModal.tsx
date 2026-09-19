import React, { useState } from 'react';
import { User, Mail, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { googleSignIn, isUserCancelledAuth, isGoogleUnverifiedTesterError, setAccessTokenForEmail } from '../../services/firebaseAuth';
import { addOrUpdateAccountSpace, setActiveAccountEmail } from '../../services/googleSheets';
import { UserProfileInfo, saveUserProfile } from '../../services/userProfile';
import { useTheme } from '../../context/ThemeContext';

interface FirstTimeOnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfileInfo) => void;
  onClose?: () => void;
  initialProfile?: UserProfileInfo | null;
  isEditing?: boolean;
}

export const FirstTimeOnboardingModal: React.FC<FirstTimeOnboardingModalProps> = ({
  isOpen,
  onComplete,
  onClose,
  initialProfile,
  isEditing = false,
}) => {
  const { isLight } = useTheme();
  const [fullName, setFullName] = useState(initialProfile?.name || '');
  const [gmailAddress, setGmailAddress] = useState(initialProfile?.primaryEmail || '');
  const [photoURL, setPhotoURL] = useState<string | undefined>(initialProfile?.photoURL);
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    initialProfile?.primaryEmail ? `Connected primary Gmail: ${initialProfile.primaryEmail}` : null
  );

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (!result.user.email) {
        throw new Error('Google sign-in did not return an email address.');
      }

      const email = result.user.email;
      const gName = result.user.displayName || fullName || email.split('@')[0];
      const gPhoto = result.user.photoURL || undefined;

      setGmailAddress(email);
      setPhotoURL(gPhoto);
      if (!fullName) {
        setFullName(gName);
      }

      // Store auth token & register workspace space
      setAccessTokenForEmail(email, result.accessToken);
      addOrUpdateAccountSpace({
        email,
        displayName: gName,
        photoURL: gPhoto,
      });
      setActiveAccountEmail(email);

      setSuccessMsg(`Authenticated and connected Primary Gmail: ${email}`);
    } catch (err: any) {
      if (isUserCancelledAuth(err)) {
        return;
      }
      console.error('Google sign-in onboarding error:', err);
      if (isGoogleUnverifiedTesterError(err)) {
        setAuthError(
          'Google Auth notice: Please ensure your Gmail is added as an allowed account, or manually enter your Gmail address below.'
        );
      } else {
        setAuthError(err.message || 'Could not authenticate with Google Sign-In.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!gmailAddress.trim() || !gmailAddress.includes('@')) {
      setAuthError('Please enter or connect a valid Google Gmail address.');
      return;
    }

    const cleanEmail = gmailAddress.trim().toLowerCase();
    const cleanName = fullName.trim();

    // Register account space
    addOrUpdateAccountSpace({
      email: cleanEmail,
      displayName: cleanName,
      photoURL: photoURL,
    });
    setActiveAccountEmail(cleanEmail);

    const profile: UserProfileInfo = {
      name: cleanName,
      primaryEmail: cleanEmail,
      photoURL: photoURL,
      onboardedAt: initialProfile?.onboardedAt || new Date().toISOString(),
    };

    saveUserProfile(profile);
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-indigo-200 text-slate-900 shadow-indigo-500/10'
            : 'bg-slate-950/95 border-indigo-500/40 text-white shadow-[0_0_50px_rgba(99,102,241,0.25)]'
        }`}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {isEditing && onClose && (
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse text-cyan-200" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 border border-indigo-500/30">
              {isEditing ? 'Account Profile' : 'First-Time Setup'}
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
              {isEditing ? 'Manage Your Account' : 'Welcome to CardFlow CRM'}
            </h2>
          </div>
        </div>

        <p className={`text-xs leading-relaxed mb-6 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          {isEditing
            ? 'Update your account name and primary Gmail account used for Google Sheets synchronization.'
            : 'Please set up your profile name and primary Google Gmail account before entering the application.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Name Input */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              1. Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className={`w-4 h-4 absolute left-3.5 top-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe / Harish Sadula"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                    : 'bg-slate-900/90 border-slate-700 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30'
                }`}
              />
            </div>
          </div>

          {/* Step 2: Primary Gmail Account Selection */}
          <div className="space-y-2">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              2. Primary Google Gmail Account <span className="text-rose-500">*</span>
            </label>

            {/* Google Sign-In Quick Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-3 border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
              }`}
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isAuthenticating ? 'Connecting Google Account...' : 'Sign in & Choose Google Gmail Account'}</span>
            </button>

            <div className="flex items-center my-2">
              <div className={`flex-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}></div>
              <span className={`px-2 text-[10px] uppercase font-bold tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                or enter email address
              </span>
              <div className={`flex-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}></div>
            </div>

            {/* Manual Gmail Input */}
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="email"
                required
                value={gmailAddress}
                onChange={(e) => {
                  setGmailAddress(e.target.value);
                  setSuccessMsg(null);
                }}
                placeholder="your.email@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono border transition-all outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                    : 'bg-slate-900/90 border-slate-700 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30'
                }`}
              />
            </div>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold">{authError}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
            >
              <span>{isEditing ? 'Save Changes' : 'Save & Enter CardFlow Application'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted Local Storage</span>
          </span>
          <span>Stored for future sessions</span>
        </div>
      </div>
    </div>
  );
};
