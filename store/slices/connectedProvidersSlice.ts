// store/slices/connectedProvidersSlice.ts
// Track which storage providers the user has connected

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ConnectedProviderInfo {
  id: string;
  name: string;
  token: string;
  userPrincipalName?: string;
  connectedAt: string;
}

export interface ConnectedProvidersState {
  providers: Record<string, ConnectedProviderInfo>;
}

const initialState: ConnectedProvidersState = {
  providers: {},
};

export const connectedProvidersSlice = createSlice({
  name: 'connectedProviders',
  initialState,
  reducers: {
    addProvider: (state, action: PayloadAction<ConnectedProviderInfo>) => {
      state.providers[action.payload.id] = action.payload;
    },
    removeProvider: (state, action: PayloadAction<string>) => {
      delete state.providers[action.payload];
    },
    clearAllProviders: (state) => {
      state.providers = {};
    },
  },
});

export const { addProvider, removeProvider, clearAllProviders } = connectedProvidersSlice.actions;
export default connectedProvidersSlice.reducer;

// Selectors
export const selectConnectedProviders = (state: { connectedProviders: ConnectedProvidersState }) =>
  state.connectedProviders.providers;

export const selectIsProviderConnected = (providerId: string) =>
  (state: { connectedProviders: ConnectedProvidersState }) =>
    !!state.connectedProviders.providers[providerId];
