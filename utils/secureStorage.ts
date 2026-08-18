// utils/secureStorage.ts
// Secure storage utilities using platform-specific secure storage solutions

import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

// Service identifier for keychain
const SERVICE_ID = 'com.unifiedstorage.auth';

// Web fallback: localStorage is not secure, but react-native-keychain does not
// work in the browser. Use it only for development/web builds.
const webGet = (key: string): string | null => {
  try {
    return localStorage.getItem(`__secure_${key}`);
  } catch {
    return null;
  }
};

const webSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(`__secure_${key}`, value);
  } catch {
    // Ignore storage errors (e.g., private mode).
  }
};

const webRemove = (key: string): void => {
  try {
    localStorage.removeItem(`__secure_${key}`);
  } catch {
    // Ignore.
  }
};

const isWeb = Platform.OS === 'web';

/**
 * Saves authentication token securely
 * @param token The authentication token to save
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  if (isWeb) {
    webSet('authToken', token);
    return;
  }
  try {
    await Keychain.setGenericPassword('authToken', token, {
      service: SERVICE_ID,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error('Failed to save auth token:', error);
    throw new Error('Could not securely store authentication token');
  }
};

/**
 * Retrieves authentication token from secure storage
 * @returns The stored token or null if not found
 */
export const getAuthToken = async (): Promise<string | null> => {
  if (isWeb) return webGet('authToken');
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_ID,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw new Error('Could not retrieve authentication token');
  }
};

/**
 * Clears authentication token from secure storage
 */
export const clearAuthToken = async (): Promise<void> => {
  if (isWeb) {
    webRemove('authToken');
    return;
  }
  try {
    await Keychain.resetGenericPassword({
      service: SERVICE_ID,
    });
  } catch (error) {
    console.error('Failed to clear auth token:', error);
    throw new Error('Could not clear authentication token');
  }
};

/**
 * Saves additional secure data
 * @param key The key to store the data under
 * @param value The value to store
 */
export const saveSecureData = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    webSet(key, value);
    return;
  }
  try {
    await Keychain.setGenericPassword(key, value, {
      service: `${SERVICE_ID}.${key}`,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error(`Failed to save secure data for key ${key}:`, error);
    throw new Error(`Could not securely store data for ${key}`);
  }
};

/**
 * Retrieves additional secure data
 * @param key The key to retrieve
 * @returns The stored value or null if not found
 */
export const getSecureData = async (key: string): Promise<string | null> => {
  if (isWeb) return webGet(key);
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_ID}.${key}`,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error(`Failed to get secure data for key ${key}:`, error);
    throw new Error(`Could not retrieve secure data for ${key}`);
  }
};

/**
 * Clears additional secure data
 * @param key The key to clear
 */
export const clearSecureData = async (key: string): Promise<void> => {
  if (isWeb) {
    webRemove(key);
    return;
  }
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_ID}.${key}`,
    });
  } catch (error) {
    console.error(`Failed to clear secure data for key ${key}:`, error);
    throw new Error(`Could not clear secure data for ${key}`);
  }
};