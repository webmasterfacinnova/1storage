// store/slices/driveSlice.ts
// Redux slice for Google Drive storage state

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriveStorageQuota } from '../../services/drive.service';

interface DriveState {
  quota: DriveStorageQuota | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DriveState = {
  quota: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    setQuotaLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setQuota: (state, action: PayloadAction<DriveStorageQuota>) => {
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
} = driveSlice.actions;

export default driveSlice.reducer;

// Selectors
export const selectDriveState = (state: { drive: DriveState }) => state.drive;
export const selectDriveQuota = (state: { drive: DriveState }) => state.drive.quota;
export const selectDriveLoading = (state: { drive: DriveState }) => state.drive.loading;
export const selectDriveError = (state: { drive: DriveState }) => state.drive.error;
