// types/navigation.ts
// Navigation type definitions for the app

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  StorageBreakdown: undefined;
  FileList: {
    folderId?: string;
    folderName?: string;
    typeFilter?: string;
    sort?: 'size' | 'name' | 'date';
    fileId?: string;
  } | undefined;
  CleanTrash: undefined;
  ManagerFiles: {
    typeFilter?: string;
  } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
