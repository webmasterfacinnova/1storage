// store/slices/authSlice.ts
// Redux slice for authentication state management

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  providers: {
    google: boolean;
    apple: boolean;
    email: boolean;
  };
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  providers: {
    google: false,
    apple: false,
    email: true, // Email is always available
  },
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authentication credentials
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; provider: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      
      // Update provider availability
      if (action.payload.provider === 'google') {
        state.providers.google = true;
      } else if (action.payload.provider === 'apple') {
        state.providers.apple = true;
      }
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Clear authentication state
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
    },
    
    // Update user profile
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    // Set provider availability
    setProviderAvailability: (state, action: PayloadAction<{ provider: string; available: boolean }>) => {
      const { provider, available } = action.payload;
      if (provider === 'google') {
        state.providers.google = available;
      } else if (provider === 'apple') {
        state.providers.apple = available;
      }
    },
  },
});

export const {
  setCredentials,
  setLoading,
  setError,
  logout,
  updateProfile,
  setProviderAvailability,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuthState = (state: { auth: AuthState }) => state.auth;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAvailableProviders = (state: { auth: AuthState }) => state.auth.providers;