import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  RefreshCw,
  Cloud,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Mail,
  Mic,
  Key,
  Database,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { Storage } from '../services/storage';
import { encryptData } from '../services/crypto';

interface ProfileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  language: Language;
  isOnline: boolean;
  pendingSyncCount: number;
  onSyncCompleted: () => void;
}

export const ProfileSyncModal: React.FC<ProfileSyncModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  language,
  isOnline,
  pendingSyncCount,
  onSyncCompleted,
}) => {
  const isBn = language === 'bn';
  const [activeTab, setActiveTab] = useState<'profile' | 'sync'>('profile');

  // Form states
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [wakeWord, setWakeWord] = useState(profile.wakeWord);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [emergencyName, setEmergencyName] = useState(profile.emergencyContact.name);
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergencyContact.phone);

  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name,
      email,
      phone,
      wakeWord,
      pinCode,
      emergencyContact: {
        ...profile.emergencyContact,
        name: emergencyName,
        phone: emergencyPhone,
      },
    };
    onSaveProfile(updated);
    setSyncFeedback({ text: isBn ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!' });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleCloudSync = async () => {
    if (!isOnline) {
      setSyncFeedback({
        text: isBn ? 'ইন্টারনেট সংযোগ নেই! অফলাইন কিউতে সংরক্ষিত রয়েছে।' : 'You are offline! Changes queued locally.',
        error: true,
      });
      return;
    }

    try {
      setIsSyncing(true);
      const dataset = Storage.getFullDataset();
      const encryptedData = await encryptData(JSON.stringify(dataset), profile.pinCode);

      const res = await fetch('/api/sync/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          encryptedData,
          version: Date.now(),
        }),
      });

      if (res.ok) {
        Storage.clearPendingSync();
        onSyncCompleted();
        setSyncFeedback({
          text: isBn ? 'ক্লাউডের সাথে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!' : 'Cloud synchronization completed safely!',
        });
      } else {
        throw new Error('Sync server error');
      }
    } catch (err: any) {
      setSyncFeedback({
        text: err.message || (isBn ? 'সিঙ্ক ব্যর্থ হয়েছে' : 'Sync failed'),
        error: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!isOnline) {
      setSyncFeedback({
        text: isBn ? 'ক্লাউড থেকে রিস্টোর করতে ইন্টারনেট প্রয়োজন।' : 'Internet required for cloud restore.',
        error: true,
      });
      return;
    }

    try {
      setIsSyncing(true);
      const res = await fetch(`/api/sync/restore/${profile.id}`);
      if (!res.ok) {
        throw new Error(isBn ? 'ক্লাউডে কোনো পূর্ববর্তী ব্যাকআপ নেই' : 'No cloud backup found');
      }

      const data = await res.json();
      setSyncFeedback({
        text: isBn ? 'ক্লাউড ব্যাকআপ পাওয়া গেছে! ভল্ট থেকে এটি ডিক্রিপ্ট করা হচ্ছে।' : 'Cloud snapshot retrieved.',
      });
    } catch (err: any) {
      setSyncFeedback({
        text: err.message || 'Restore failed',
        error: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isBn ? 'ব্যবহারকারীর প্রোফাইল ও সিঙ্ক হাব' : 'User Profile & Sync Hub'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBn ? 'ব্যক্তিগত তথ্য, ব্যাকআপ ও ক্লাউড সংযোগ' : 'Profile info, credentials, and data synchronization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isBn ? 'প্রোফাইল সেটিংস' : 'Profile Settings'}
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sync'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isBn ? 'ডাটা সিঙ্ক ও ব্যাকআপ' : 'Data Sync & Cloud'}
          </button>
        </div>

        {/* Tab 1: Profile Settings Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {syncFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  syncFeedback.error
                    ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                }`}
              >
                <span>{syncFeedback.text}</span>
                <button type="button" onClick={() => setSyncFeedback(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-indigo-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-indigo-500/30">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{name}</p>
                <p className="text-[11px] text-slate-400">{email}</p>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1 inline-block">
                  Verified Local Account
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isBn ? 'ব্যবহারকারীর নাম' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isBn ? 'ভয়েস ওয়েক ওয়ার্ড (Wake Word)' : 'Voice Wake Word'}
                </label>
                <input
                  type="text"
                  value={wakeWord}
                  onChange={(e) => setWakeWord(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* PIN Code */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>{isBn ? 'সিকিউরিটি মাস্টার পিন (AES এনক্রিপশন)' : 'Security Master PIN (AES)'}</span>
              </div>
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-white"
              />
              <p className="text-[11px] text-slate-500">
                {isBn ? 'এই পিন দিয়ে আপনার গোপন ডেটা এবং ব্যাকআপ এনক্রিপ্ট হবে।' : 'Used to encrypt/decrypt private vault notes & exports.'}
              </p>
            </div>

            {/* Emergency Contact */}
            <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <Smartphone className="w-4 h-4 text-rose-400" />
                <span>{isBn ? 'জরুরী যোগাযোগ (Emergency Contact)' : 'Emergency Contact'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition hover:scale-102"
              >
                {isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Data Sync & Cloud Management */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {syncFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  syncFeedback.error
                    ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                }`}
              >
                <span>{syncFeedback.text}</span>
                <button onClick={() => setSyncFeedback(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Sync Status Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {isBn ? 'লোকাল ও ক্লাউড সিঙ্ক স্থিতি' : 'Local & Cloud Synchronization'}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isOnline ? (isBn ? 'ক্লাউড কানেক্টেড' : 'Cloud Connected') : (isBn ? 'অফলাইন মোড' : 'Offline Mode')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400">
                    {isBn ? 'পেন্ডিং পরিবর্তন:' : 'Pending Changes:'}
                  </p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {pendingSyncCount} {isBn ? 'টি আইটেম' : 'items'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400">
                    {isBn ? 'সর্বশেষ সিঙ্ক:' : 'Last Synced:'}
                  </p>
                  <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
                    {Storage.getLastSyncTime()
                      ? new Date(Storage.getLastSyncTime()!).toLocaleTimeString()
                      : (isBn ? 'এখনো হয়নি' : 'Not yet')}
                  </p>
                </div>
              </div>
            </div>

            {/* Sync Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCloudSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition hover:scale-102"
              >
                <ArrowUpFromLine className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>
                  {isSyncing
                    ? (isBn ? 'এনক্রিপ্ট করে ক্লাউডে আপলোড হচ্ছে...' : 'Syncing to Cloud...')
                    : (isBn ? 'এখনই ক্লাউডে সিঙ্ক করুন' : 'Sync Encrypted Data Now')}
                </span>
              </button>

              <button
                onClick={handleCloudRestore}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition"
              >
                <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
                <span>{isBn ? 'ক্লাউড থেকে রিস্টোর চেক করুন' : 'Check Cloud Snapshot'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300 mb-1">
                {isBn ? 'অফলাইন ও সুরক্ষার নিশ্চয়তা:' : 'Offline & Security Guarantee:'}
              </p>
              {isBn
                ? 'ইন্টারনেট না থাকলেও অ্যাপ পুরোদমে কাজ করে। আপনার ডিভাইস অনলাইনে আসলেই পেন্ডিং ডেটা স্বয়ংক্রিয়ভাবে এন্ড-টু-এন্ড এনক্রিপ্ট হয়ে ক্লাউডে সিঙ্ক হবে।'
                : 'Full offline readiness. When reconnected, all offline entries are automatically encrypted with your client-side key and synchronized safely.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
