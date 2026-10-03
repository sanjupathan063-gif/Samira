import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Clock3, ExternalLink, ListTodo, Play, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import type { Language } from '../types';

type AgentTask = { id: string; request: string; action: 'open'|'reminder'|'note'|'unknown'; target?: string; steps: string[]; status: 'planned'|'done'|'blocked'; createdAt: string };
const KEY = 'sanju_agent_tasks_v1';
function planTask(text: string): AgentTask {
  const q = text.toLowerCase().trim();
  const apps: Array<[RegExp,string,string]> = [
    [/(youtube|ইউটিউব)/, 'YouTube', 'com.google.android.youtube'],
    [/(whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ)/, 'WhatsApp', 'com.whatsapp'],
    [/(chrome|ক্রোম|browser|ব্রাউজার)/, 'Chrome', 'com.android.chrome'],
    [/(gmail|জিমেইল)/, 'Gmail', 'com.google.android.gm'],
    [/(maps|ম্যাপস|গুগল ম্যাপ)/, 'Google Maps', 'com.google.android.apps.maps'],
    [/(camera|ক্যামেরা)/, 'Camera', 'camera'],
    [/(settings|সেটিংস)/, 'Android Settings', 'settings'],
  ];
  const app = apps.find(([re]) => re.test(q));
  if (app && /(open|launch|খোলো|খুলে দাও|চালু কর|ওপেন)/.test(q)) return { id: crypto.randomUUID(), request: text, action: 'open', target: app[1] + '|' + app[2], steps: [`Recognize app: ${app[1]}`, 'Ask for confirmation before opening', 'Launch using Android/browser-supported link'], status: 'planned', createdAt: new Date().toISOString() };
  if (/(remind|reminder|মনে করিয়ে|রিমাইন্ডার|মনে করিও)/.test(q)) return { id: crypto.randomUUID(), request: text, action: 'reminder', steps: ['Save reminder to this device', 'Show it in SANJU Agent task list', 'If notification permission is available, request notification access'], status: 'planned', createdAt: new Date().toISOString() };
  if (/(note|নোট|লিখে রাখ|মনে রাখ)/.test(q)) return { id: crypto.randomUUID(), request: text, action: 'note', steps: ['Save request as a local note', 'Show confirmation'], status: 'planned', createdAt: new Date().toISOString() };
  return { id: crypto.randomUUID(), request: text, action: 'unknown', steps: ['Break the request into steps', 'This build only executes app launch, local note, and reminder actions', 'No unsupported or sensitive action will be faked'], status: 'blocked', createdAt: new Date().toISOString() };
}
export function AgentMode({ language, onCreateNote }: { language: Language; onCreateNote?: (title:string, content:string)=>void }) {
  const isBn = language === 'bn';
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<AgentTask[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
  const [busy, setBusy] = useState<string|null>(null);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(tasks.slice(0,30))); }, [tasks]);
  const addTask = () => { if (!input.trim()) return; const t = planTask(input); setTasks(prev => [t,...prev].slice(0,30)); setInput(''); };
  const execute = async (task: AgentTask) => {
    setBusy(task.id);
    try {
      if (task.action === 'open' && task.target) {
        const [appName, target] = task.target.split('|');
        // Android intent with an explicit package is more likely to open the installed app
        // from Chrome/Capacitor than opening a website in a new browser tab.
        let launchUrl = '';
        if (target === 'settings') launchUrl = 'intent:#Intent;action=android.settings.SETTINGS;end';
        else if (target === 'camera') launchUrl = 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end';
        else launchUrl = `intent://#Intent;package=${target};S.browser_fallback_url=${encodeURIComponent(appName === 'YouTube' ? 'https://www.youtube.com/' : appName === 'WhatsApp' ? 'https://wa.me/' : appName === 'Chrome' ? 'https://www.google.com/' : appName === 'Gmail' ? 'https://mail.google.com/' : 'https://maps.google.com/')};end`;
        const anchor = document.createElement('a');
        anchor.href = launchUrl;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        // Do not mark as done blindly; report that Android received the launch request.
        setTasks(prev => prev.map(t => t.id === task.id ? {...t,status:'done',steps:[...t.steps, isBn ? 'Android-এ অ্যাপ চালুর Intent পাঠানো হয়েছে; ইনস্টল/ডিভাইস নীতি অনুযায়ী ফল ভিন্ন হতে পারে।' : 'Launch intent sent to Android; actual result depends on installed app and device policy.']} : t));
      } else if (task.action === 'note') {
        onCreateNote?.(isBn ? 'Agent নোট' : 'Agent note', task.request);
        const notes = JSON.parse(localStorage.getItem('sanju_agent_notes_v1') || '[]');
        localStorage.setItem('sanju_agent_notes_v1', JSON.stringify([{id:task.id,text:task.request,at:new Date().toISOString()},...notes].slice(0,100)));
        setTasks(prev => prev.map(t => t.id === task.id ? {...t,status:'done'} : t));
      } else if (task.action === 'reminder') {
        const reminders = JSON.parse(localStorage.getItem('sanju_agent_reminders_v1') || '[]');
        localStorage.setItem('sanju_agent_reminders_v1', JSON.stringify([{id:task.id,text:task.request,at:new Date().toISOString()},...reminders].slice(0,100)));
        if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
        if ('Notification' in window && Notification.permission === 'granted') new Notification(isBn ? 'SANJU রিমাইন্ডার সংরক্ষিত' : 'SANJU reminder saved', { body: task.request });
        setTasks(prev => prev.map(t => t.id === task.id ? {...t,status:'done'} : t));
      }
    } catch (e) { console.warn('Agent action did not complete', e); setTasks(prev => prev.map(t => t.id === task.id ? {...t,status:'blocked'} : t)); }
    finally { setBusy(null); }
  };
  const examples = isBn ? ['YouTube খোলো','একটা নোট লিখে রাখো: কাল বই পড়ব','রিমাইন্ডার: পানি খেতে হবে'] : ['Open YouTube','Save a note: read tomorrow','Reminder: drink water'];
  return <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 p-5 sm:p-6 shadow-xl space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-2xl bg-cyan-500/15 border border-cyan-400/30 p-3 text-cyan-300"><Bot className="w-6 h-6"/></div><div><h2 className="font-bold text-white text-lg">SANJU Agent Mode</h2><p className="text-xs text-slate-400">{isBn?'কাজ বলো → পরিকল্পনা দেখো → অনুমতি দিয়ে চালাও':'Describe → review the plan → approve execution'}</p></div></div><span className="text-[10px] rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-1">{isBn?'অনুমতি-নির্ভর':'Approval-based'}</span></div>
    <div className="flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTask();}} placeholder={isBn?'যেমন: YouTube খোলো, একটা নোট রাখো...':'e.g. Open YouTube, save a note...'} className="min-w-0 flex-1 rounded-2xl bg-slate-950/80 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"/><button onClick={addTask} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 font-bold text-white text-sm">{isBn?'পরিকল্পনা':'Plan'}</button></div>
    <div className="flex flex-wrap gap-2">{examples.map(ex=><button key={ex} onClick={()=>setInput(ex)} className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500">{ex}</button>)}</div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {[
        [isBn ? '📱 Phone Agent' : '📱 Phone Agent', isBn ? 'YouTube খোলো' : 'Open YouTube'],
        [isBn ? '🗓️ Personal Agent' : '🗓️ Personal Agent', isBn ? 'রিমাইন্ডার: পানি খেতে হবে' : 'Reminder: drink water'],
        [isBn ? '📝 Notes Agent' : '📝 Notes Agent', isBn ? 'নোট লিখে রাখো: আজকের কাজ' : 'Save note: today tasks'],
        [isBn ? '🔎 Research Agent' : '🔎 Research Agent', isBn ? 'ইন্টারনেটে খুঁজে দেখো: আজকের খবর' : 'Research: latest news'],
        [isBn ? '👁️ Vision Agent' : '👁️ Vision Agent', isBn ? 'ক্যামেরা খোলো' : 'Open camera'],
        [isBn ? '❤️ Mood Agent' : '❤️ Mood Agent', isBn ? 'আজ আমার মন খারাপ' : 'I feel sad today'],
      ].map(([label, prompt]) => <button key={label} onClick={() => setInput(prompt)} className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 text-xs text-indigo-100 text-left">{label}</button>)}
    </div>
    <div className="flex items-center gap-2 text-xs text-amber-300/90"><ShieldCheck className="w-4 h-4 shrink-0"/>{isBn?'এই সংস্করণে অ্যাপ লঞ্চ লিংক, লোকাল নোট ও রিমাইন্ডার সংরক্ষণ চলে। কল/মেসেজ/পেমেন্টের মতো সংবেদনশীল কাজ স্বয়ংক্রিয় নয়।':'This build supports app launch links, local notes and reminder storage. Calls, messages and payments are not automated.'}</div>
    {tasks.length>0&&<div className="space-y-3"><div className="flex justify-between items-center"><h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><ListTodo className="w-4 h-4 text-cyan-300"/>{isBn?'কাজের পরিকল্পনা':'Task plans'}</h3><button onClick={()=>setTasks([])} className="text-xs text-slate-500 hover:text-rose-300 flex items-center gap-1"><Trash2 className="w-3 h-3"/>{isBn?'মুছুন':'Clear'}</button></div>
      {tasks.map(task=><div key={task.id} className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 space-y-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-white break-words">{task.request}</p><span className={`shrink-0 text-[10px] rounded-full px-2 py-1 ${task.status==='done'?'bg-emerald-500/15 text-emerald-300':task.status==='blocked'?'bg-rose-500/15 text-rose-300':'bg-amber-500/15 text-amber-300'}`}>{task.status==='done'?(isBn?'সম্পন্ন':'Done'):task.status==='blocked'?(isBn?'সীমাবদ্ধ':'Limited'):(isBn?'অনুমতির অপেক্ষা':'Needs approval')}</span></div><ol className="space-y-1.5">{task.steps.map((step,i)=><li key={i} className="flex gap-2 text-xs text-slate-400"><span className="text-cyan-400">{i+1}.</span>{step}</li>)}</ol>{task.status==='planned'&&<button disabled={busy===task.id||task.action==='unknown'} onClick={()=>execute(task)} className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2">{busy===task.id?<Clock3 className="w-4 h-4 animate-spin"/>:task.action==='open'?<ExternalLink className="w-4 h-4"/>:task.action==='reminder'?<Clock3 className="w-4 h-4"/>:task.action==='note'?<CheckCircle2 className="w-4 h-4"/>:<Smartphone className="w-4 h-4"/>}{isBn?'অনুমতি দিয়ে চালাও':'Approve & execute'}<Play className="w-3.5 h-3.5"/></button>}</div>)}
    </div>}
  </section>;
}
