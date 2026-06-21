// services/auth/firebase-auth.service.ts
// Firebase implementation of AuthService

import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import { AuthService, AuthCredentials, AuthResult, User } from '../auth.service';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../../utils/secureStorage';

class FirebaseAuthService implements AuthService {
  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      GoogleSignin.configure({
        webClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    } catch (error) {
      console.error('Google Sign-In initialization error:', error);
      throw new Error('Failed to initialize Google Sign-In');
    }
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      let result;
      
      if (credentials.provider === 'google') {
        result = await this.signInWithGoogle();
      } else if (credentials.provider === 'apple') {
        result = await this.signInWithApple();
      } else if (credentials.email && credentials.password) {
        result = await this.signInWithEmail(credentials.email, credentials.password);
      } else {
        throw new Error('Invalid credentials provided');
      }
      
      // Save token securely
      if (result.token) {
        await saveAuthToken(result.token);
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const token = await userCredential.user.getIdToken();
      
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined,
      };
      
      await saveAuthToken(token);
      return { user, token, provider: 'email' };
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await auth().signOut();
      await clearAuthToken();
      // Clear any cached data
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return null;
      
      return {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || undefined,
        photoURL: currentUser.photoURL || undefined,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      throw this.handleAuthError(error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      // First try to get from secure storage
      const storedToken = await getAuthToken();
      if (storedToken) return storedToken;
      
      // Fallback to Firebase
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        await saveAuthToken(token);
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw this.handleAuthError(error);
    }
  }

  async linkProvider(provider: string): Promise<AuthResult> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('No user signed in');
      }
      
      let result;
      if (provider === 'google') {
        result = await this.signInWithGoogle();
      } else if (provider === 'apple') {
        result = await this.signInWithApple();
      } else {
        throw new Error('Unsupported provider');
      }
      
      // Link the new credential to the current user
      const credential = result.token ? auth.GoogleAuthProvider.credential(result.token) : null;
      if (credential) {
        await currentUser.linkWithCredential(credential);
      }
      
      return result;
    } catch (error) {
      console.error('Link provider error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Private methods
  private async signInWithGoogle(): Promise<AuthResult> {
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(credential);
      const token = await userCredential.user.getIdToken();
      
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined,
      };
      
      return { user, token, provider: 'google' };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  private async signInWithApple(): Promise<AuthResult> {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identity token returned');
      }
      
      const { identityToken, nonce } = appleAuthRequestResponse;
      const credential = auth.AppleAuthProvider.credential(identityToken, nonce);
      const userCredential = await auth().signInWithCredential(credential);
      const token = await userCredential.user.getIdToken();
      
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined,
      };
      
      return { user, token, provider: 'apple' };
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  private async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const token = await userCredential.user.getIdToken();
      
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined,
      };
      
      return { user, token, provider: 'email' };
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  private handleAuthError(error: any): Error {
    // Map Firebase errors to user-friendly messages
    if (error.code) {
      switch (error.code) {
        case 'auth/invalid-email':
          return new Error('The email address is badly formatted');
        case 'auth/user-disabled':
          return new Error('This user account has been disabled');
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return new Error('Invalid email or password');
        case 'auth/email-already-in-use':
          return new Error('This email is already in use');
        case 'auth/operation-not-allowed':
          return new Error('This sign-in method is not enabled');
        case 'auth/weak-password':
          return new Error('Password should be at least 6 characters');
        case 'auth/network-request-failed':
          return new Error('Network error - please check your connection');
        case 'auth/cancelled-popup-request':
        case 'auth/popup-closed-by-user':
          return new Error('Sign-in cancelled');
        default:
          return new Error('Authentication failed - please try again');
      }
    }
    return new Error('Authentication failed - please try again');
  }
}

export default FirebaseAuthService;