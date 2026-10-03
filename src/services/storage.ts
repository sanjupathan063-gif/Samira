import { UserProfile, Contact, CallRecord, VaultItem, NotificationItem, VoiceAnalysisData, SyncStatus } from '../types';

const STORAGE_KEYS = {
  PROFILE: 'sanju_user_profile_v2',
  CONTACTS: 'sanju_contacts_v2',
  CALL_LOGS: 'sanju_call_logs_v2',
  VAULT: 'sanju_vault_items_v2',
  NOTIFICATIONS: 'sanju_notifications_v2',
  VOICE_LOGS: 'sanju_voice_logs_v2',
  SYNC_QUEUE: 'sanju_sync_pending_queue_v2',
  LAST_SYNC: 'sanju_last_synced_timestamp',
};

// Initial default profile
export const DEFAULT_PROFILE: UserProfile = {
  id: 'sanju_user_primary',
  name: 'Sanju Pathan',
  email: 'sanju.pthan.no.1@gmail.com',
  phone: '+880 1712-345678',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  wakeWord: 'Hey Sanju',
  preferredLanguage: 'bn',
  pinCode: '1234', // default 4-digit PIN for demo
  continuousListening: true,
  offlineModePreferred: false,
  emergencyContact: {
    name: 'Emergency Doctor (ডাঃ আহমেদ)',
    phone: '999',
    relationship: 'Emergency Medical',
  },
};

// Initial realistic contacts for voice calling
export const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c1', name: 'মা (Mom)', phone: '+880 1819-112233', role: 'Family', avatarBg: 'from-pink-500 to-rose-600', isFavorite: true },
  { id: 'c2', name: 'বাবা (Father)', phone: '+880 1711-223344', role: 'Family', avatarBg: 'from-blue-500 to-indigo-600', isFavorite: true },
  { id: 'c3', name: 'Emergency (জরুরী সেবা)', phone: '999', role: 'National Help', avatarBg: 'from-red-600 to-rose-700', isFavorite: true },
  { id: 'c4', name: 'রহিম (Rahim Tech)', phone: '+880 1912-778899', role: 'Colleague', avatarBg: 'from-emerald-500 to-teal-600' },
  { id: 'c5', name: 'অফিস টিম (Office)', phone: '+880 1515-443322', role: 'Work', avatarBg: 'from-amber-500 to-orange-600' },
  { id: 'c6', name: 'ডাঃ সুমনা (Dr. Sumona)', phone: '+880 1612-990011', role: 'Doctor', avatarBg: 'from-cyan-500 to-blue-600' },
];

export const DEFAULT_VAULT_ITEMS: VaultItem[] = [
  {
    id: 'v1',
    title: 'Bank PIN & Master Key',
    category: 'password',
    content: 'PIN: 9874 | Security Token: 92849204',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'v2',
    title: 'Emergency Medical Secret Note',
    category: 'secret',
    content: 'Blood Group: B+, Diabetic: None, Allergy: Penicillin',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'v3',
    title: 'WiFi Server Access',
    category: 'password',
    content: 'SSID: Sanju_Fiber_5G | Pass: SecurePass#2026',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'ভয়েস অ্যাসিস্ট্যান্ট প্রস্তুত',
    message: 'মাইক্রোফোন অনুমতি সক্রিয় রয়েছে। আপনি যে কোনো সময় কথা বলে কমান্ড দিতে পারেন।',
    timestamp: new Date().toISOString(),
    type: 'system',
    isRead: false,
    priority: 'normal',
  },
  {
    id: 'n2',
    title: 'এন্ড-টু-এন্ড এনক্রিপশন সক্রিয়',
    message: 'আপনার সব ভল্ট নোট এবং ব্যাকআপ AES-256 বিট অ্যালগরিদমে সুরক্ষিত।',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    type: 'security',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'n3',
    title: 'অফলাইন সিঙ্ক রেডি',
    message: 'ইন্টারনেট সংযোগ না থাকলেও লোকাল ডেটাবেস স্বাভাবিকভাবে কাজ করবে।',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'sync',
    isRead: true,
    priority: 'low',
  },
];

export const Storage = {
  getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    this.markPendingSync();
  },

  getContacts(): Contact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      return data ? JSON.parse(data) : DEFAULT_CONTACTS;
    } catch {
      return DEFAULT_CONTACTS;
    }
  },

  saveContacts(contacts: Contact[]): void {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    this.markPendingSync();
  },

  getCallLogs(): CallRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
      return data ? JSON.parse(data) : [
        {
          id: 'call_init_1',
          contactName: 'মা (Mom)',
          phone: '+880 1819-112233',
          type: 'outgoing',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          durationSeconds: 145,
        },
        {
          id: 'call_init_2',
          contactName: 'Emergency (জরুরী সেবা)',
          phone: '999',
          type: 'missed',
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          durationSeconds: 0,
        }
      ];
    } catch {
      return [];
    }
  },

  saveCallLog(record: CallRecord): void {
    const list = this.getCallLogs();
    list.unshift(record);
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(list.slice(0, 50)));
    this.markPendingSync();
  },

  getVaultItems(): VaultItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VAULT);
      return data ? JSON.parse(data) : DEFAULT_VAULT_ITEMS;
    } catch {
      return DEFAULT_VAULT_ITEMS;
    }
  },

  saveVaultItems(items: VaultItem[]): void {
    localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(items));
    this.markPendingSync();
  },

  getNotifications(): NotificationItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: NotificationItem[]): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): NotificationItem {
    const notifications = this.getNotifications();
    const newItem: NotificationItem = {
      ...item,
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    notifications.unshift(newItem);
    this.saveNotifications(notifications.slice(0, 50));
    return newItem;
  },

  getVoiceLogs(): VoiceAnalysisData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOICE_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveVoiceLog(log: VoiceAnalysisData): void {
    const logs = this.getVoiceLogs();
    logs.unshift(log);
    localStorage.setItem(STORAGE_KEYS.VOICE_LOGS, JSON.stringify(logs.slice(0, 30)));
  },

  getSyncPendingCount(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '0', 10);
    } catch {
      return 0;
    }
  },

  markPendingSync(): void {
    const current = this.getSyncPendingCount();
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, (current + 1).toString());
  },

  clearPendingSync(): void {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, '0');
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  },

  getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  getFullDataset() {
    return {
      profile: this.getProfile(),
      contacts: this.getContacts(),
      callLogs: this.getCallLogs(),
      vaultItems: this.getVaultItems(),
      notifications: this.getNotifications(),
      exportedAt: new Date().toISOString(),
    };
  },

  restoreFullDataset(data: any): void {
    if (data.profile) this.saveProfile(data.profile);
    if (data.contacts) this.saveContacts(data.contacts);
    if (data.callLogs) localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(data.callLogs));
    if (data.vaultItems) this.saveVaultItems(data.vaultItems);
    if (data.notifications) this.saveNotifications(data.notifications);
    this.clearPendingSync();
  },
};
