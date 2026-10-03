export type Language = 'bn' | 'en';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  wakeWord: string;
  preferredLanguage: Language;
  pinCode: string; // for AES vault unlock (e.g. '1234')
  continuousListening: boolean;
  offlineModePreferred: boolean;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatarBg: string;
  isFavorite?: boolean;
}

export interface CallRecord {
  id: string;
  contactName: string;
  phone: string;
  type: 'outgoing' | 'incoming' | 'missed';
  timestamp: string;
  durationSeconds: number;
}

export interface VaultItem {
  id: string;
  title: string;
  category: 'password' | 'note' | 'card' | 'secret';
  content: string; // plain when unlocked, encrypted when locked
  encryptedData?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'call' | 'security' | 'reminder' | 'sync' | 'system';
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface VoiceAnalysisData {
  transcript: string;
  detectedLanguage: 'bn' | 'en' | 'banglish';
  intent: 'CALL' | 'CREATE_NOTE' | 'CREATE_REMINDER' | 'ENCRYPT_VAULT' | 'QUERY' | 'SYSTEM_CONTROL' | 'UNKNOWN';
  speechResponse: string;
  sentiment: 'calm' | 'excited' | 'urgent' | 'happy' | 'frustrated' | 'neutral';
  urgencyScore: number; // 1 to 10
  confidenceScore: number; // 0 to 1
  detectedEntities: string[];
  summary: string;
  timestamp: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: string | null;
  pendingSyncCount: number;
  isSyncing: boolean;
  cloudVersion: number;
}
