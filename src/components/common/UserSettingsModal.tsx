import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Settings, Save, LogOut, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { UserProfileInfo, getStoredUserProfile, saveUserProfile, clearUserProfile } from '../../services/userProfile';
import { addOrUpdateAccountSpace, setActiveAccountEmail } from '../../services/googleSheets';
import { useTheme } from '../../context/ThemeContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfileUpdated?: (updated: UserProfileInfo) => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  onProfileUpdated,
}) => {
  const { isLight } = useTheme();
  const [profile, setProfile] = useState<UserProfileInfo | null>(() => getStoredUserProfile());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredUserProfile();
      if (stored) {
        setProfile(stored);
        setName(stored.name || '');
        setEmail(stored.primaryEmail || '');
        setMobile(stored.mobileNumber || '');
      } else {
        setName('');
        setEmail('');
        setMobile('');
      }
      setSaveSuccess(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setErrorMsg('Please enter your username / full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid Gmail / primary email address.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanMobile = mobile.trim();

      const updatedProfile: UserProfileInfo = {
        name: cleanName,
        primaryEmail: cleanEmail,
        mobileNumber: cleanMobile,
        photoURL: profile?.photoURL,
        onboardedAt: profile?.onboardedAt || new Date().toISOString(),
      };

      saveUserProfile(updatedProfile);
      addOrUpdateAccountSpace({
        email: cleanEmail,
        displayName: cleanName,
        photoURL: profile?.photoURL,
      });
      setActiveAccountEmail(cleanEmail);

      setProfile(updatedProfile);
      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    clearUserProfile();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 border relative transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-950 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-950 border-indigo-500/40 text-cyan-300'
              }`}
            >
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className={`text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Account & Profile Settings
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Manage your profile details and Gmail connection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-semibold">
            {errorMsg}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Profile and contact details saved successfully!</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Username / Full Name */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Username / Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harish Sadula"
              required
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900'
              }`}
            />
          </div>

          {/* Primary Gmail */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gmail / Primary Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@gmail.com"
              required
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900'
              }`}
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>Mobile Number</span>
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. +1 555-019-2834 or +91 9876543210"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900'
              }`}
            />
          </div>

          {/* Action Buttons: Save & Cancel */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Settings'}</span>
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Sign Out / Logout
              </p>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Resets active onboarding session & returns to onboarding sign-in
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
