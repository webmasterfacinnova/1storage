// services/user.service.ts
// MongoDB user persistence layer
// Syncs Google-authenticated users to a local MongoDB instance (via backend API or Realm).

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorableUser {
  googleId: string;
  email: string;
  name?: string;
  photoURL?: string;
  idToken: string;
  accessToken: string;
}

export interface UserProfile {
  _id: string;
  googleId: string;
  email: string;
  name?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

const USER_CACHE_KEY = '@onestorage/user_profile';
const API_BASE_URL_KEY = '@onestorage/api_base_url';

class UserService {
  /**
   * Persist (create or update) a user after successful Google OAuth.
   *
   * Tries the remote backend first. Falls back to local AsyncStorage
   * when offline so the app is still usable.
   */
  async upsertUser(user: StorableUser): Promise<UserProfile | null> {
    const profile = this.toProfile(user);

    // Persist locally first (offline cache)
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));

    // Try to sync with remote backend
    try {
      const apiBase = await this.getApiBaseUrl();
      if (apiBase) {
        const response = await fetch(`${apiBase}/api/users/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });

        if (response.ok) {
          const remoteProfile: UserProfile = await response.json();
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(remoteProfile));
          return remoteProfile;
        }
      }
    } catch {
      // Silent – offline is fine, profile is cached locally
    }

    return profile;
  }

  /**
   * Retrieve the cached user profile.
   */
  async getCachedProfile(): Promise<UserProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear cached user profile on logout.
   */
  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(USER_CACHE_KEY);
  }

  /**
   * Configure the backend API base URL.
   */
  async setApiBaseUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(API_BASE_URL_KEY, url);
  }

  /**
   * Read the configured backend API base URL.
   */
  async getApiBaseUrl(): Promise<string | null> {
    return AsyncStorage.getItem(API_BASE_URL_KEY);
  }

  // ── helpers ──────────────────────────────────────────

  private toProfile(user: StorableUser): UserProfile {
    return {
      _id: user.googleId,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const userService = new UserService();
export default UserService;
