import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, Bot, ChevronDown, ChevronUp, Globe2, HeartPulse, History,
  Home, LockKeyhole, Mic, MicOff, Phone, Radio, Settings, ShieldCheck,
  Sparkles, UserRound, Volume2, Wifi, WifiOff, X, Zap, BrainCircuit
} from 'lucide-react';
import { VoiceCommander } from './components/VoiceCommander';
import { PhoneCallModal } from './components/PhoneCallModal';
import { SecureVaultModal } from './components/SecureVaultModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ProfileSyncModal } from './components/ProfileSyncModal';
import { VoiceAnalysisModal } from './components/VoiceAnalysisModal';
import { SelfUpgradePanel } from './components/SelfUpgradePanel';
import { useNetwork } from './hooks/useNetwork';
import { Storage } from './services/storage';
import { voiceAssistant } from './services/voiceAssistant';
import { playNotificationAlert } from './services/audioFeedback';
import { UserProfile, Contact, CallRecord, VaultItem, NotificationItem, VoiceAnalysisData, Language } from './types';

export default function App() {
  const { isOnline } = useNetwork();
  const [profile, setProfile] = useState<UserProfile>(() => Storage.getProfile());
  const [contacts, setContacts] = useState<Contact[]>(() => Storage.getContacts());
  const [callLogs, setCallLogs] = useState<CallRecord[]>(() => Storage.getCallLogs());
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => Storage.getVaultItems());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => Storage.getNotifications());
  const [voiceLogs, setVoiceLogs] = useState<VoiceAnalysisData[]>(() => Storage.getVoiceLogs());
  const [pendingSyncCount, setPendingSyncCount] = useState(() => Storage.getSyncPendingCount());
  const [language, setLanguage] = useState<Language>(profile.preferredLanguage || 'bn');
  const [isListening, setIsListening] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<VoiceAnalysisData | null>(voiceLogs[0] || null);
  const [showPanel, setShowPanel] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callInitialTarget, setCallInitialTarget] = useState<string | null>(null);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<VoiceAnalysisData | null>(null);
  const [selfUpgradeOpen, setSelfUpgradeOpen] = useState(false);

  const isBn = language === 'bn';
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => { voiceAssistant.setLanguage(language); }, [language]);

  const handleVoiceCommand = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    const analysis = await voiceAssistant.processVoiceCommand(transcript, isOnline, language);
    setLastAnalysis(analysis);
    Storage.saveVoiceLog(analysis);
    setVoiceLogs(Storage.getVoiceLogs());
    voiceAssistant.speak(analysis.speechResponse, language);

    if (analysis.intent === 'CALL') {
      setCallInitialTarget(analysis.detectedEntities[0] || 'মা (Mom)');
      setCallModalOpen(true);
    } else if (analysis.intent === 'CREATE_NOTE') {
      const now = new Date().toISOString();
      const item: VaultItem = { id: 'v_voice_' + Date.now(), title: isBn ? 'ভয়েস নোট' : 'Voice Note', category: 'note', content: analysis.transcript, createdAt: now, updatedAt: now };
      const updated = [item, ...Storage.getVaultItems()];
      setVaultItems(updated); Storage.saveVaultItems(updated); setPendingSyncCount(Storage.getSyncPendingCount());
    } else if (analysis.intent === 'CREATE_REMINDER') {
      Storage.addNotification({ title: isBn ? 'রিমাইন্ডার নির্ধারিত' : 'Reminder Scheduled', message: analysis.transcript, type: 'reminder', priority: 'high' });
      setNotifications(Storage.getNotifications()); playNotificationAlert();
    } else if (analysis.intent === 'ENCRYPT_VAULT') setVaultModalOpen(true);
  }, [isOnline, language, isBn]);

  useEffect(() => {
    voiceAssistant.onStateChange(setIsListening);
    voiceAssistant.onResult((transcript, isFinal) => { if (isFinal) handleVoiceCommand(transcript); });
    voiceAssistant.onError(err => console.warn('Voice engine:', err));
  }, [handleVoiceCommand]);

  const toggleMic = (continuous = true) => isListening ? voiceAssistant.stopListening() : voiceAssistant.startListening(continuous);

  const setLang = (newLang: Language) => {
    setLanguage(newLang);
    const updated = { ...profile, preferredLanguage: newLang };
    setProfile(updated); Storage.saveProfile(updated);
  };

  const openCall = (target: string | null = null) => { setCallInitialTarget(target); setCallModalOpen(true); };
  const statusText = isListening ? (isBn ? 'শুনছি…' : 'LISTENING…') : (isBn ? 'জাগ্রত' : 'READY');
  const coreText = isListening ? 'LISTENING' : lastAnalysis ? 'READY' : 'NEURAL CORE';
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? (isBn ? 'শুভ সকাল' : 'Good morning') : h < 18 ? (isBn ? 'শুভ অপরাহ্ন' : 'Good afternoon') : (isBn ? 'শুভ সন্ধ্যা' : 'Good evening');
  }, [isBn]);

  // The main surface intentionally stays fixed: details live in the bottom sheet.
  // Android back / browser back closes the sheet first when it is open.
  useEffect(() => {
    const onPop = () => { if (showPanel) setShowPanel(false); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [showPanel]);
  const openPanel = () => { history.pushState({ sanjuPanel: true }, ''); setShowPanel(true); };

  return (
    <div className="sanju-app">
      <div className="neural-grid" />
      <div className="aurora aurora-a" /><div className="aurora aurora-b" />

      <header className="neural-header">
        <div className="brand-lockup">
          <div className="brand-orb"><Sparkles size={17} /></div>
          <div><div className="brand-name">SANJU</div><div className="brand-sub">NEURAL COMPANION</div></div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setProfileModalOpen(true)} aria-label="Profile"><UserRound size={18}/></button>
          <button className="icon-btn" onClick={() => setNotificationsModalOpen(true)} aria-label="Notifications"><Bell size={18}/>{unreadCount > 0 && <i className="notify-dot"/>}</button>
        </div>
      </header>

      <main className="neural-main">
        <section className="identity">
          <div className="eyebrow">{greeting},</div>
          <h1>{profile.name || (isBn ? 'বন্ধু' : 'Friend')}</h1>
          <div className="online-line"><span className={isOnline ? 'status-dot online' : 'status-dot'} />{isOnline ? (isBn ? 'অনলাইন' : 'ONLINE') : (isBn ? 'অফলাইন মোড' : 'OFFLINE MODE')}</div>
        </section>

        <section className={`neural-core-wrap ${isListening ? 'is-listening' : ''}`}>
          <div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="orbit orbit-3"/>
          <div className="core-ticks">{Array.from({length: 24}).map((_,i)=><span key={i} style={{transform:`rotate(${i*15}deg)`}} />)}</div>
          <button className="neural-core" onClick={() => toggleMic(profile.continuousListening)} aria-label="Toggle Sanju listening">
            <div className="core-glow" />
            <div className="core-inner"><Bot size={27}/><strong>S.A.N.J.U</strong><small>{coreText}</small><div className="core-wave"><b/><b/><b/><b/><b/></div></div>
          </button>
          <div className="core-caption"><Radio size={13}/><span>{statusText}</span></div>
        </section>

        <section className="command-dock">
          <div className="dock-top"><span><Zap size={14}/> MASTER ROUTER</span><span className={isOnline ? 'pill online-pill' : 'pill'}>{isOnline ? 'ONLINE' : 'LOCAL'}</span></div>
          <div className="command-line">{lastAnalysis?.transcript || (isBn ? 'বলুন, আমি কাজটি বুঝে সঠিক টুল বেছে নেব…' : 'Speak naturally. I will choose the right tool…')}</div>
          <div className="dock-actions">
            <button onClick={() => toggleMic(profile.continuousListening)} className={isListening ? 'primary-action active' : 'primary-action'}><span className="mic-ring">{isListening ? <MicOff size={19}/> : <Mic size={19}/>}</span>{isListening ? (isBn ? 'শোনা বন্ধ' : 'STOP') : (isBn ? 'কথা বলুন' : 'SPEAK')}</button>
            <button onClick={() => openCall()} className="secondary-action"><Phone size={17}/>{isBn ? 'কল' : 'CALL'}</button>
            <button onClick={openPanel} className="secondary-action"><ChevronUp size={17}/>{isBn ? 'আরও' : 'MORE'}</button>
          </div>
        </section>

        <section className="micro-status">
          <div><Wifi size={14}/><span>{isOnline ? 'NETWORK' : 'OFFLINE'}</span><b>{isOnline ? 'LIVE' : 'LOCAL'}</b></div>
          <div><Radio size={14}/><span>WAKE WORD</span><b>READY</b></div>
          <div><HeartPulse size={14}/><span>CORE</span><b>ACTIVE</b></div>
        </section>

        {lastAnalysis && (
          <button className="last-task" onClick={() => { setSelectedAnalysis(lastAnalysis); setAnalysisModalOpen(true); }}>
            <History size={16}/><div><small>{isBn ? 'সর্বশেষ কাজ' : 'LAST TASK'}</small><strong>{lastAnalysis.summary || lastAnalysis.transcript}</strong></div><ChevronDown size={16}/>
          </button>
        )}
      </main>

      {showPanel && <div className="sheet-backdrop" onClick={() => setShowPanel(false)} />}
      <aside className={`neural-sheet ${showPanel ? 'open' : ''}`} aria-hidden={!showPanel}>
        <div className="sheet-handle" />
        <div className="sheet-head"><div><small>NEURAL CONTROL</small><h2>{isBn ? 'সিস্টেম' : 'System'}</h2></div><button className="icon-btn" onClick={() => setShowPanel(false)}><X size={18}/></button></div>
        <div className="sheet-grid">
          <button onClick={() => openCall()}><Phone/><span>{isBn ? 'কল' : 'Call'}</span><small>Native</small></button>
          <button onClick={() => setNotificationsModalOpen(true)}><Bell/><span>{isBn ? 'অ্যালার্ট' : 'Alerts'}</span><small>{unreadCount} new</small></button>
          <button onClick={() => setVaultModalOpen(true)}><LockKeyhole/><span>{isBn ? 'সিকিউর ভল্ট' : 'Secure Vault'}</span><small>{vaultItems.length} items</small></button>
          <button onClick={() => setProfileModalOpen(true)}><Settings/><span>{isBn ? 'সেটিংস' : 'Settings'}</span><small>Profile</small></button>
          <button onClick={() => setAnalysisModalOpen(true)}><Activity/><span>{isBn ? 'ভয়েস লগ' : 'Voice Logs'}</span><small>{voiceLogs.length}</small></button>
          <button onClick={() => setSelfUpgradeOpen(true)}><BrainCircuit/><span>{isBn ? 'Self Upgrade' : 'Self Upgrade'}</span><small>Skills + Health</small></button>
          <button onClick={() => setLang(language === 'bn' ? 'en' : 'bn')}><Globe2/><span>Language</span><small>{language.toUpperCase()}</small></button>
        </div>
        <div className="sheet-status"><ShieldCheck size={17}/><div><strong>{isBn ? 'লোকাল ডেটা সুরক্ষিত' : 'Local data protected'}</strong><span>{isOnline ? 'Cloud connection available' : 'Offline-first mode active'}</span></div></div>
        <div className="sheet-scroll-note">Swipe up/down here to scroll. Android Back closes this panel first.</div>
      </aside>

      <nav className="bottom-nav">
        <button className="nav-active"><Home size={18}/><span>{isBn ? 'কোর' : 'CORE'}</span></button>
        <button onClick={() => setNotificationsModalOpen(true)}><Bell size={18}/><span>{isBn ? 'অ্যালার্ট' : 'ALERTS'}</span></button>
        <button className="nav-mic" onClick={() => toggleMic(profile.continuousListening)}><Mic size={21}/></button>
        <button onClick={() => setVaultModalOpen(true)}><LockKeyhole size={18}/><span>{isBn ? 'ভল্ট' : 'VAULT'}</span></button>
        <button onClick={openPanel}><ChevronUp size={18}/><span>{isBn ? 'আরও' : 'MORE'}</span></button>
      </nav>

      <div className="hidden-compat">
        <VoiceCommander isListening={isListening} onToggleMic={toggleMic} language={language} onExecuteCall={openCall} onOpenVault={() => setVaultModalOpen(true)} onOpenAnalysis={(d)=>{setSelectedAnalysis(d);setAnalysisModalOpen(true)}} lastAnalysis={lastAnalysis} isOnline={isOnline}/>
      </div>

      <PhoneCallModal isOpen={callModalOpen} onClose={() => setCallModalOpen(false)} contacts={contacts} onAddContact={(c)=>{const u=[...contacts,c];setContacts(u);Storage.saveContacts(u)}} callLogs={callLogs} onSaveCallLog={(r)=>setCallLogs(p=>[r,...p])} language={language} initialCallTarget={callInitialTarget}/>
      <SecureVaultModal isOpen={vaultModalOpen} onClose={()=>setVaultModalOpen(false)} vaultItems={vaultItems} onSaveVaultItems={(items)=>{setVaultItems(items);Storage.saveVaultItems(items);setPendingSyncCount(Storage.getSyncPendingCount())}} language={language} pinCode={profile.pinCode}/>
      <NotificationCenterModal isOpen={notificationsModalOpen} onClose={()=>setNotificationsModalOpen(false)} notifications={notifications} onMarkAllAsRead={()=>{const n=notifications.map(x=>({...x,isRead:true}));setNotifications(n);Storage.saveNotifications(n)}} onClearAll={()=>{setNotifications([]);Storage.saveNotifications([])}} onAddNotification={()=>setNotifications(Storage.getNotifications())} language={language}/>
      <ProfileSyncModal isOpen={profileModalOpen} onClose={()=>setProfileModalOpen(false)} profile={profile} onSaveProfile={(p)=>{setProfile(p);Storage.saveProfile(p);setPendingSyncCount(Storage.getSyncPendingCount())}} language={language} isOnline={isOnline} pendingSyncCount={pendingSyncCount} onSyncCompleted={()=>setPendingSyncCount(0)}/>
      {selfUpgradeOpen && <SelfUpgradePanel language={language} onClose={() => setSelfUpgradeOpen(false)} />}
      <VoiceAnalysisModal isOpen={analysisModalOpen} onClose={()=>setAnalysisModalOpen(false)} data={selectedAnalysis} history={voiceLogs} language={language}/>
    </div>
  );
}
