// store/slices/driveFilesSlice.ts
// Redux slice for Google Drive file listing and storage breakdown

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriveFile, StorageByType } from '../../services/drive-files.service';

export interface DriveFilesState {
  // Largest files
  largestFiles: DriveFile[];
  largestFilesLoading: boolean;
  largestFilesError: string | null;
  largestFilesNextPage: string | null;

  // Files in current folder
  currentFolderFiles: DriveFile[];
  currentFolderId: string;
  currentFolderName: string;
  folderFilesLoading: boolean;
  folderFilesError: string | null;
  folderNextPage: string | null;

  // Trash
  trashedFiles: DriveFile[];
  trashedFilesLoading: boolean;
  trashedFilesError: string | null;
  trashedFilesNextPage: string | null;

  // Storage by type
  storageByType: any[];
  storageByTypeLoading: boolean;
  storageByTypeError: string | null;
}

const initialState: DriveFilesState = {
  largestFiles: [],
  largestFilesLoading: false,
  largestFilesError: null,
  largestFilesNextPage: null,

  currentFolderFiles: [],
  currentFolderId: 'root',
  currentFolderName: 'My Drive',
  folderFilesLoading: false,
  folderFilesError: null,
  folderNextPage: null,

  trashedFiles: [],
  trashedFilesLoading: false,
  trashedFilesError: null,
  trashedFilesNextPage: null,

  storageByType: [],
  storageByTypeLoading: false,
  storageByTypeError: null,
};

const driveFilesSlice = createSlice({
  name: 'driveFiles',
  initialState,
  reducers: {
    // Largest files
    setLargestFilesLoading: (state, action: PayloadAction<boolean>) => {
      state.largestFilesLoading = action.payload;
      if (action.payload) state.largestFilesError = null;
    },
    setLargestFiles: (state, action: PayloadAction<{ files: DriveFile[]; nextPageToken: string | null; append?: boolean }>) => {
      if (action.payload.append) {
        state.largestFiles.push(...action.payload.files);
      } else {
        state.largestFiles = action.payload.files;
      }
      state.largestFilesNextPage = action.payload.nextPageToken;
      state.largestFilesLoading = false;
      state.largestFilesError = null;
    },
    setLargestFilesError: (state, action: PayloadAction<string>) => {
      state.largestFilesError = action.payload;
      state.largestFilesLoading = false;
    },

    // Folder files
    setFolderFilesLoading: (state, action: PayloadAction<boolean>) => {
      state.folderFilesLoading = action.payload;
      if (action.payload) state.folderFilesError = null;
    },
    setFolderFiles: (state, action: PayloadAction<{ files: DriveFile[]; nextPageToken: string | null; folderId: string; folderName: string; append?: boolean }>) => {
      if (action.payload.append) {
        state.currentFolderFiles.push(...action.payload.files);
      } else {
        state.currentFolderFiles = action.payload.files;
      }
      state.currentFolderId = action.payload.folderId;
      state.currentFolderName = action.payload.folderName;
      state.folderNextPage = action.payload.nextPageToken;
      state.folderFilesLoading = false;
      state.folderFilesError = null;
    },
    setFolderFilesError: (state, action: PayloadAction<string>) => {
      state.folderFilesError = action.payload;
      state.folderFilesLoading = false;
    },

    // Trash
    setTrashedFilesLoading: (state, action: PayloadAction<boolean>) => {
      state.trashedFilesLoading = action.payload;
      if (action.payload) state.trashedFilesError = null;
    },
    setTrashedFiles: (state, action: PayloadAction<{ files: DriveFile[]; nextPageToken: string | null; append?: boolean }>) => {
      if (action.payload.append) {
        state.trashedFiles.push(...action.payload.files);
      } else {
        state.trashedFiles = action.payload.files;
      }
      state.trashedFilesNextPage = action.payload.nextPageToken;
      state.trashedFilesLoading = false;
      state.trashedFilesError = null;
    },
    setTrashedFilesError: (state, action: PayloadAction<string>) => {
      state.trashedFilesError = action.payload;
      state.trashedFilesLoading = false;
    },
    removeTrashedFile: (state, action: PayloadAction<string>) => {
      state.trashedFiles = state.trashedFiles.filter(f => f.id !== action.payload);
    },
    clearTrashedFiles: (state) => {
      state.trashedFiles = [];
      state.trashedFilesNextPage = null;
    },

    // Storage by type
    setStorageByTypeLoading: (state, action: PayloadAction<boolean>) => {
      state.storageByTypeLoading = action.payload;
      if (action.payload) state.storageByTypeError = null;
    },
    setStorageByType: (state, action: PayloadAction<StorageByType[]>) => {
      state.storageByType = action.payload;
      state.storageByTypeLoading = false;
      state.storageByTypeError = null;
    },
    setStorageByTypeError: (state, action: PayloadAction<string>) => {
      state.storageByTypeError = action.payload;
      state.storageByTypeLoading = false;
    },
  },
});

export const {
  setLargestFilesLoading,
  setLargestFiles,
  setLargestFilesError,
  setFolderFilesLoading,
  setFolderFiles,
  setFolderFilesError,
  setTrashedFilesLoading,
  setTrashedFiles,
  setTrashedFilesError,
  removeTrashedFile,
  clearTrashedFiles,
  setStorageByTypeLoading,
  setStorageByType,
  setStorageByTypeError,
} = driveFilesSlice.actions;

export default driveFilesSlice.reducer;

// Selectors
export const selectDriveFilesState = (state: { driveFiles: DriveFilesState }) => state.driveFiles;
export const selectLargestFiles = (state: { driveFiles: DriveFilesState }) => state.driveFiles.largestFiles;
export const selectLargestFilesLoading = (state: { driveFiles: DriveFilesState }) => state.driveFiles.largestFilesLoading;
export const selectLargestFilesNextPage = (state: { driveFiles: DriveFilesState }) => state.driveFiles.largestFilesNextPage;
export const selectCurrentFolderFiles = (state: { driveFiles: DriveFilesState }) => state.driveFiles.currentFolderFiles;
export const selectCurrentFolderId = (state: { driveFiles: DriveFilesState }) => state.driveFiles.currentFolderId;
export const selectCurrentFolderName = (state: { driveFiles: DriveFilesState }) => state.driveFiles.currentFolderName;
export const selectFolderFilesLoading = (state: { driveFiles: DriveFilesState }) => state.driveFiles.folderFilesLoading;
export const selectFolderFilesNextPage = (state: { driveFiles: DriveFilesState }) => state.driveFiles.folderNextPage;
export const selectTrashedFiles = (state: { driveFiles: DriveFilesState }) => state.driveFiles.trashedFiles;
export const selectTrashedFilesLoading = (state: { driveFiles: DriveFilesState }) => state.driveFiles.trashedFilesLoading;
export const selectTrashedFilesNextPage = (state: { driveFiles: DriveFilesState }) => state.driveFiles.trashedFilesNextPage;
export const selectStorageByType = (state: { driveFiles: DriveFilesState }) => state.driveFiles.storageByType;
export const selectStorageByTypeLoading = (state: { driveFiles: DriveFilesState }) => state.driveFiles.storageByTypeLoading;
