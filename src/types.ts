export type ColorFilter = 'beauty' | 'glowing';

export interface FrameConfig {
  id: 'frame1' | 'frame2';
  name: string;
  description: string;
  theme: 'classic' | 'neon' | 'custom';
  // If user provides a direct Google Drive link or ID, or uploaded base64 data URL
  customImageUrl?: string;
  driveFileId?: string;
  // Visual accent colors for frame UI
  accentColor: string;
  badgeText: string;
}

export interface AppSettings {
  brandName: string;
  eventName: string;
  eventSubtitle: string;
  brandLogoUrl: string; // URL or base64 data URL
  adminPassword: string;
  // Google Drive & GAS Settings
  gasWebAppUrl: string; // Google Apps Script Web App URL
  driveFolderId: string; // Target folder ID / Link for HASILFOTO
  autoUploadEnabled: boolean;
  // Frames
  frame1: FrameConfig;
  frame2: FrameConfig;
  // Preferences
  mirrorDefault: boolean;
  countdownSeconds: number;
}

export type AppView = 'select-frame' | 'camera' | 'preview';

export interface UploadStatus {
  state: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  fileUrl?: string;
  fileId?: string;
}
