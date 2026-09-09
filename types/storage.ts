import { ImageSourcePropType } from 'react-native';

export type ProviderId = 'google-drive' | 'onedrive' | 'dropbox' | 'box' | string;

export interface UnifiedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  provider: ProviderId;
  providerName: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export interface ProviderPageResult {
  files: UnifiedFile[];
  nextPageToken?: string | null;
}

export interface ProviderMeta {
  id: string;
  short: string;
  name: string;
  color: string;
  icon?: ImageSourcePropType;
}