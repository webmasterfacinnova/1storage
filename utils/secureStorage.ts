// utils/secureStorage.ts
// Secure storage utilities using platform-specific secure storage solutions

import * as Keychain from 'react-native-keychain';

// Service identifier for keychain
const SERVICE_ID = 'com.unifiedstorage.auth';

/**
 * Saves authentication token securely
 * @param token The authentication token to save
 */
export const saveAuthToken = async (token: string): Promise<void> => {
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
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_ID}.${key}`,
    });
  } catch (error) {
    console.error(`Failed to clear secure data for key ${key}:`, error);
    throw new Error(`Could not clear secure data for ${key}`);
  }
};