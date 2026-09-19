export interface UserProfileInfo {
  name: string;
  primaryEmail: string;
  mobileNumber?: string;
  photoURL?: string;
  onboardedAt: string;
}

const PROFILE_STORAGE_KEY = 'cardflow_user_profile';
const ONBOARDING_COMPLETED_KEY = 'cardflow_onboarding_completed';

export function getStoredUserProfile(): UserProfileInfo | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (profile && profile.name && profile.primaryEmail) {
      return profile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfileInfo): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cardflow:profile-updated', { detail: profile }));
    }
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

export function clearUserProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cardflow:profile-updated', { detail: null }));
      window.dispatchEvent(new CustomEvent('cardflow:logout'));
    }
  } catch (err) {
    console.error('Failed to clear user profile:', err);
  }
}

export function isOnboardingCompleted(): boolean {
  try {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    const profile = getStoredUserProfile();
    return completed && Boolean(profile && profile.name && profile.primaryEmail);
  } catch {
    return false;
  }
}
