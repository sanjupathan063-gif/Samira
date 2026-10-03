import React from 'react';
import {
  Mic,
  MicOff,
  Bell,
  User,
  Shield,
  PhoneCall,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  Lock,
  Download,
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { downloadSanjuAppZip } from '../services/downloadHelper';

interface HeaderProps {
  profile: UserProfile;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isListening: boolean;
  onToggleMic: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  onManualSync: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenCallModal: () => void;
  onOpenVault: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  language,
  onLanguageChange,
  isListening,
  onToggleMic,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onManualSync,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenCallModal,
  onOpenVault,
}) => {
  const isBn = language === 'bn';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Sanju AI
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Voice &amp; Secure
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isBn ? 'ভয়েস কমান্ড • অফলাইন সিঙ্ক • এনক্রিপশন' : 'Voice Assistant • Offline Sync • AES-256'}
            </p>
          </div>
        </div>

        {/* Central Controls: Calling, Vault, Mic */}
        <div className="flex items-center gap-2">
          {/* Phone Call Trigger */}
          <button
            onClick={onOpenCallModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition shadow-sm hover:scale-102"
            title={isBn ? 'ফোন ডায়ালার ও কল' : 'Phone Dialer & Calls'}
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{isBn ? 'কল ডায়াল' : 'Call'}</span>
          </button>

          {/* Secure Vault Trigger */}
          <button
            onClick={onOpenVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition shadow-sm hover:scale-102"
            title={isBn ? 'এনক্রিপ্টেড ভল্ট' : 'Encrypted Vault'}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">{isBn ? 'সিকিউর ভল্ট' : 'Vault'}</span>
          </button>

          {/* Quick Mic Master Button */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-md ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
            title={isBn ? 'মাইক চালু / বন্ধ করুন' : 'Toggle Microphone'}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{isBn ? 'শুনছি...' : 'Listening'}</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>{isBn ? 'মাইক অন' : 'Start Mic'}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline status pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>{isBn ? 'অনলাইন' : 'Online'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>{isBn ? 'অফলাইন মোড' : 'Offline'}</span>
              </>
            )}
          </div>

          {/* Data Sync Button */}
          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              pendingSyncCount > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title={isBn ? 'ক্লাউড সিঙ্ক স্ট্যাটাস' : 'Cloud Sync Status'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">
              {isSyncing ? (isBn ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (
                pendingSyncCount > 0 ? `${pendingSyncCount} ${isBn ? 'পেন্ডিং' : 'Pending'}` : (isBn ? 'সিঙ্কড' : 'Synced')
              )}
            </span>
          </button>

          {/* Download ZIP package button */}
          <button
            onClick={() => downloadSanjuAppZip()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20 transition hover:scale-102"
            title={isBn ? 'সম্পূর্ণ sanju-app.zip ডাউনলোড করুন' : 'Download sanju-app.zip'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'ZIP ডাউনলোড' : 'Download ZIP'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'bn' ? 'en' : 'bn')}
            className="px-2 py-1 rounded-md text-[11px] font-bold tracking-wide bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition"
            title={isBn ? 'ভাষা পরিবর্তন করুন (বাংলা / English)' : 'Switch Language'}
          >
            {language === 'bn' ? 'বাং' : 'EN'}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title={isBn ? 'নোটিফিকেশন সেন্টার' : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition group"
            title={isBn ? 'ব্যবহারকারীর প্রোফাইল ও সেটিংস' : 'Profile & Settings'}
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[85px]">
              {profile.name.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
