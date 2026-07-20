// store/store.ts
// Main Redux store configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import driveReducer from './slices/driveSlice';
import driveFilesReducer from './slices/driveFilesSlice';
import onedriveReducer from './slices/onedriveSlice';
import onedriveFilesReducer from './slices/onedriveFilesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    drive: driveReducer,
    driveFiles: driveFilesReducer,
    onedrive: onedriveReducer,
    onedriveFiles: onedriveFilesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setCredentials', 'auth/logout'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;