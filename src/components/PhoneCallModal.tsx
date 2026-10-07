import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Clock,
  Plus,
  Star,
  Search,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import { Contact, CallRecord, Language } from '../types';
import { startPhoneRingTone, stopPhoneRingTone, playCallEndedTone } from '../services/audioFeedback';
import { voiceAssistant } from '../services/voiceAssistant';

interface PhoneCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  callLogs: CallRecord[];
  onSaveCallLog: (record: CallRecord) => void;
  language: Language;
  initialCallTarget?: string | null;
}

export const PhoneCallModal: React.FC<PhoneCallModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onAddContact,
  callLogs,
  onSaveCallLog,
  language,
  initialCallTarget,
}) => {
  const isBn = language === 'bn';
  const [activeTab, setActiveTab] = useState<'contacts' | 'keypad' | 'history'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialedNumber, setDialedNumber] = useState('');

  // Active call state
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [currentContact, setCurrentContact] = useState<{ name: string; phone: string } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // New contact modal form state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Friend');

  const timerRef = useRef<any>(null);

  // Handle auto-calling if opened with initialCallTarget
  useEffect(() => {
    if (isOpen && initialCallTarget) {
      handleInitiateCall(initialCallTarget);
    }
  }, [isOpen, initialCallTarget]);

  // Duration timer when call is connected
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  if (!isOpen) return null;

  const handleInitiateCall = (targetNameOrNumber: string) => {
    // Find matching contact or use input directly
    const found = contacts.find(
      (c) =>
        c.name.toLowerCase().includes(targetNameOrNumber.toLowerCase()) ||
        c.phone.replace(/[\s-]/g, '').includes(targetNameOrNumber.replace(/[\s-]/g, ''))
    );

    const target = found || {
      name: targetNameOrNumber,
      phone: targetNameOrNumber.match(/\d/) ? targetNameOrNumber : '+880 1700-000000',
    };

    setCurrentContact(target);
    setIsCalling(true);
    setCallStatus('ringing');
    setCallDuration(0);
    setIsMuted(false);

    // Start telephone audio tone
    startPhoneRingTone(false);

    // Simulate connection after 2.8 seconds
    setTimeout(() => {
      stopPhoneRingTone();
      setCallStatus('connected');
      // Speak interactive greeting
      const greeting = isBn
        ? `হ্যালো সঞ্জু! ${target.name} লাইনে আছেন। বলুন কি দরকার?`
        : `Hello! ${target.name} is on the line. How can I assist?`;
      voiceAssistant.speak(greeting, language);
    }, 2800);
  };

  const handleEndCall = () => {
    stopPhoneRingTone();
    playCallEndedTone();
    setCallStatus('ended');

    if (currentContact) {
      const record: CallRecord = {
        id: 'call_' + Date.now(),
        contactName: currentContact.name,
        phone: currentContact.phone,
        type: 'outgoing',
        timestamp: new Date().toISOString(),
        durationSeconds: callDuration,
      };
      onSaveCallLog(record);
    }

    setTimeout(() => {
      setIsCalling(false);
      setCurrentContact(null);
      setCallDuration(0);
    }, 1000);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newContact: Contact = {
      id: 'c_' + Date.now(),
      name: newName.trim(),
      phone: newPhone.trim(),
      role: newRole,
      avatarBg: 'from-purple-500 to-indigo-600',
      isFavorite: false,
    };
    onAddContact(newContact);
    setNewName('');
    setNewPhone('');
    setShowAddContact(false);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Active In-Call Screen Overlay */}
        {isCalling && currentContact ? (
          <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-8 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950">
            {/* Call Header */}
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {callStatus === 'ringing'
                  ? (isBn ? 'রিং হচ্ছে...' : 'Ringing...')
                  : (isBn ? 'কথা চলছে' : 'Call Connected')}
              </span>
              <button
                onClick={handleEndCall}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Caller Identity & Pulse */}
            <div className="flex flex-col items-center my-6">
              <div className="relative flex items-center justify-center">
                {callStatus === 'ringing' && (
                  <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-ping" />
                )}
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl ring-4 ring-white/10">
                  {currentContact.name.charAt(0)}
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mt-4">
                {currentContact.name}
              </h3>
              <p className="text-sm text-slate-400 font-mono mt-0.5">
                {currentContact.phone}
              </p>

              <div className="mt-3 px-3 py-1 rounded-full bg-slate-800/80 text-cyan-300 text-xs font-mono font-medium">
                {callStatus === 'connected' ? formatDuration(callDuration) : (isBn ? 'সংযুক্ত হচ্ছে...' : 'Connecting...')}
              </div>
            </div>

            {/* In-Call Controls */}
            <div className="w-full flex flex-col items-center gap-6">
              <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
                {/* Mute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[10px] font-medium">{isBn ? 'মিউট' : 'Mute'}</span>
                </button>

                {/* Speaker */}
                <button
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition ${
                    isSpeakerOn
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span className="text-[10px] font-medium">{isBn ? 'স্পিকার' : 'Speaker'}</span>
                </button>

                {/* Secure Lock indicator */}
                <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 text-emerald-400">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-[10px] font-medium">E2E Call</span>
                </div>
              </div>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 hover:scale-105 transition"
                title={isBn ? 'কল শেষ করুন' : 'End Call'}
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Dialer / Contact Manager Interface */
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isBn ? 'ফোন ডায়ালার ও যোগাযোগ' : 'Phone Dialer & Contacts'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isBn ? 'ভয়েস কমান্ড অথবা ডায়াল করে সরাসরি কল করুন' : 'Initiate voice or keypad calls'}
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

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'contacts'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {isBn ? 'পরিচিতি তালিকা' : 'Contacts'} ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('keypad')}
                className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'keypad'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {isBn ? 'ডায়াল প্যাড' : 'Dial Pad'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'history'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {isBn ? 'কল ইতিহাস' : 'Recent Calls'} ({callLogs.length})
              </button>
            </div>

            {/* Tab 1: Contacts List */}
            {activeTab === 'contacts' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Search & Add Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={isBn ? 'নাম বা নম্বর দিয়ে খুঁজুন...' : 'Search contact or number...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    title={isBn ? 'নতুন যোগাযোগ যুক্ত করুন' : 'Add New Contact'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add Contact Modal / Box */}
                {showAddContact && (
                  <form
                    onSubmit={handleCreateContact}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2.5"
                  >
                    <h4 className="text-xs font-bold text-emerald-300">
                      {isBn ? 'নতুন পরিচিতি যোগ করুন' : 'Add New Contact'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={isBn ? 'নাম (যেমন: আকাশ)' : 'Name'}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="tel"
                        placeholder={isBn ? 'ফোন নম্বর' : 'Phone Number'}
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        required
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddContact(false)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
                      >
                        {isBn ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {isBn ? 'সংরক্ষণ করুন' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Contact List Items */}
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${contact.avatarBg} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                        >
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-semibold text-white">
                              {contact.name}
                            </span>
                            {contact.isFavorite && (
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {contact.phone} • <span className="text-slate-500">{contact.role}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInitiateCall(contact.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition hover:scale-105"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{isBn ? 'কল' : 'Call'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Dial Pad */}
            {activeTab === 'keypad' && (
              <div className="flex-1 p-6 flex flex-col items-center justify-center">
                {/* Dialed display */}
                <div className="w-full max-w-xs mb-4 text-center">
                  <input
                    type="text"
                    readOnly
                    value={dialedNumber}
                    placeholder={isBn ? 'নম্বর লিখুন' : 'Enter number'}
                    className="w-full bg-transparent text-center text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider outline-none placeholder-slate-600"
                  />
                </div>

                {/* Keypad Buttons */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                    <button
                      key={key}
                      onClick={() => setDialedNumber((prev) => prev + key)}
                      className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white text-lg font-bold transition active:scale-95 shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* Call & Backspace Action */}
                <div className="flex items-center justify-center gap-4 mt-6 w-full max-w-xs">
                  <button
                    onClick={() => setDialedNumber((prev) => prev.slice(0, -1))}
                    disabled={!dialedNumber}
                    className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 transition"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={() => dialedNumber && handleInitiateCall(dialedNumber)}
                    disabled={!dialedNumber}
                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 disabled:opacity-40 transition active:scale-95"
                  >
                    <Phone className="w-7 h-7" />
                  </button>
                  <div className="w-12" />
                </div>
              </div>
            )}

            {/* Tab 3: Call History */}
            {activeTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
                {callLogs.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">
                    {isBn ? 'কোনো পূর্ববর্তী কল হিস্ট্রি নেই' : 'No recent calls yet'}
                  </p>
                ) : (
                  callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white">
                            {log.contactName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {log.phone} • {formatDuration(log.durationSeconds)} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInitiateCall(log.contactName)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                        title={isBn ? 'আবার কল করুন' : 'Call Back'}
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
