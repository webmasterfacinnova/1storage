// utils/secureStorage.web.ts
// Web fallback for secure storage.
// react-native-keychain is native-only, so on web we fall back to
// localStorage. This is NOT truly "secure" storage, but it keeps the
// web build working for local development / previewing.

const SERVICE_ID = 'com.unifiedstorage.auth';
const AUTH_TOKEN_KEY = `${SERVICE_ID}.authToken`;

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

/**
 * Saves authentication token (localStorage fallback on web).
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  if (isBrowser) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

/**
 * Retrieves authentication token from localStorage.
 */
export const getAuthToken = async (): Promise<string | null> => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Clears authentication token from localStorage.
 */
export const clearAuthToken = async (): Promise<void> => {
  if (isBrowser) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

/**
 * Saves additional secure data (localStorage fallback on web).
 */
export const saveSecureData = async (key: string, value: string): Promise<void> => {
  if (isBrowser) {
    window.localStorage.setItem(`${SERVICE_ID}.${key}`, value);
  }
};

/**
 * Retrieves additional secure data.
 */
export const getSecureData = async (key: string): Promise<string | null> => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(`${SERVICE_ID}.${key}`);
};

/**
 * Clears additional secure data.
 */
export const clearSecureData = async (key: string): Promise<void> => {
  if (isBrowser) {
    window.localStorage.removeItem(`${SERVICE_ID}.${key}`);
  }
};
