// store/store.ts
// Main Redux store configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import driveReducer from './slices/driveSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    drive: driveReducer,
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