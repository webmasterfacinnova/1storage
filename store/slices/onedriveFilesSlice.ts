// store/slices/onedriveFilesSlice.ts
// Redux slice for OneDrive file listing and storage breakdown

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OneDriveFile, StorageByType } from '../../services/onedrive-files.service';

export interface OneDriveFilesState {
  // Largest files
  largestFiles: OneDriveFile[];
  largestFilesLoading: boolean;
  largestFilesError: string | null;
  largestFilesNextPage: string | null;

  // Files in current folder
  currentFolderFiles: OneDriveFile[];
  currentFolderId: string;
  currentFolderName: string;
  folderFilesLoading: boolean;
  folderFilesError: string | null;
  folderNextPage: string | null;

  // Trash
  trashedFiles: OneDriveFile[];
  trashedFilesLoading: boolean;
  trashedFilesError: string | null;
  trashedFilesNextPage: string | null;

  // Storage by type
  storageByType: any[];
  storageByTypeLoading: boolean;
  storageByTypeError: string | null;
}

const initialState: OneDriveFilesState = {
  largestFiles: [],
  largestFilesLoading: false,
  largestFilesError: null,
  largestFilesNextPage: null,

  currentFolderFiles: [],
  currentFolderId: 'root',
  currentFolderName: 'OneDrive',
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

const oneDriveFilesSlice = createSlice({
  name: 'onedriveFiles',
  initialState,
  reducers: {
    // Largest files
    setLargestFilesLoading: (state, action: PayloadAction<boolean>) => {
      state.largestFilesLoading = action.payload;
      if (action.payload) state.largestFilesError = null;
    },
    setLargestFiles: (state, action: PayloadAction<{ files: OneDriveFile[]; nextPageToken: string | null; append?: boolean }>) => {
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
    setFolderFiles: (state, action: PayloadAction<{ files: OneDriveFile[]; nextPageToken: string | null; folderId: string; folderName: string; append?: boolean }>) => {
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
    setTrashedFiles: (state, action: PayloadAction<{ files: OneDriveFile[]; nextPageToken: string | null; append?: boolean }>) => {
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
} = oneDriveFilesSlice.actions;

export default oneDriveFilesSlice.reducer;

// Selectors
export const selectOnedriveFilesState = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles;
export const selectOnedriveLargestFiles = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.largestFiles;
export const selectOnedriveLargestFilesLoading = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.largestFilesLoading;
export const selectOnedriveLargestFilesNextPage = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.largestFilesNextPage;
export const selectOnedriveCurrentFolderFiles = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.currentFolderFiles;
export const selectOnedriveCurrentFolderId = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.currentFolderId;
export const selectOnedriveCurrentFolderName = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.currentFolderName;
export const selectOnedriveFolderFilesLoading = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.folderFilesLoading;
export const selectOnedriveFolderFilesNextPage = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.folderNextPage;
export const selectOnedriveTrashedFiles = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.trashedFiles;
export const selectOnedriveTrashedFilesLoading = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.trashedFilesLoading;
export const selectOnedriveTrashedFilesNextPage = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.trashedFilesNextPage;
export const selectOnedriveStorageByType = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.storageByType;
export const selectOnedriveStorageByTypeLoading = (state: { onedriveFiles: OneDriveFilesState }) => state.onedriveFiles.storageByTypeLoading;
