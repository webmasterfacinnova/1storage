// store/slices/onedriveSlice.ts
// Redux slice for OneDrive storage state

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OneDriveStorageQuota } from '../../services/onedrive.service';

export interface OneDriveState {
  quota: OneDriveStorageQuota | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: OneDriveState = {
  quota: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const oneDriveSlice = createSlice({
  name: 'onedrive',
  initialState,
  reducers: {
    setQuotaLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setQuota: (state, action: PayloadAction<OneDriveStorageQuota>) => {
      state.quota = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    setQuotaError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearQuota: (state) => {
      state.quota = null;
      state.error = null;
      state.lastFetched = null;
    },
  },
});

export const {
  setQuotaLoading,
  setQuota,
  setQuotaError,
  clearQuota,
} = oneDriveSlice.actions;

export default oneDriveSlice.reducer;

// Selectors
export const selectOnedriveState = (state: { onedrive: OneDriveState }) => state.onedrive;
export const selectOnedriveQuota = (state: { onedrive: OneDriveState }) => state.onedrive.quota;
export const selectOnedriveLoading = (state: { onedrive: OneDriveState }) => state.onedrive.loading;
export const selectOnedriveError = (state: { onedrive: OneDriveState }) => state.onedrive.error;
