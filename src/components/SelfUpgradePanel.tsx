import React, { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, Cpu, RefreshCw, ShieldCheck, Trash2, Wrench, X } from 'lucide-react';
import { SkillManager, Skill } from '../services/skillManager';
import { runSanjuDiagnostics, DiagnosticResult } from '../services/diagnostics';
import type { Language } from '../types';

export function SelfUpgradePanel({ language, onClose }: { language: Language; onClose:()=>void }) {
  const bn = language === 'bn';
  const [request, setRequest] = useState('');
  const [skills, setSkills] = useState<Skill[]>(SkillManager.all());
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [message, setMessage] = useState('');
  const refresh = () => setSkills(SkillManager.all());
  useEffect(() => { runSanjuDiagnostics().then(setDiagnostics); }, []);
  const add = () => { if (!request.trim()) return; const r=SkillManager.addFromRequest(request); setMessage(r.message); setRequest(''); refresh(); };
  const diagnose = async () => setDiagnostics(await runSanjuDiagnostics());
  return <div className="su-backdrop" onClick={onClose}>
    <section className="su-panel" onClick={e=>e.stopPropagation()}>
      <div className="su-head"><div><small>SELF-EVOLVING CORE</small><h2>{bn?'নিজে শেখা ও আপগ্রেড':'Self Upgrade'}</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
      <p className="su-intro">{bn?'বলুন: “একটা Calculator skill অ্যাড করো” — SANJU নিরাপদ declarative skill হিসেবে সেটি সংরক্ষণ করবে।':'Say “add a calculator skill” — SANJU stores it as a safe declarative skill.'}</p>
      <div className="su-input"><input value={request} onChange={e=>setRequest(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder={bn?'যে skill যোগ করতে চান…':'Describe the skill to add…'}/><button onClick={add}><BrainCircuit size={16}/>{bn?'অ্যাড':'Add'}</button></div>
      {message && <div className="su-message"><CheckCircle2 size={15}/>{message}</div>}
      <div className="su-actions"><button onClick={diagnose}><Wrench size={15}/>{bn?'Self Diagnostic':'Self Diagnostic'}</button><button onClick={refresh}><RefreshCw size={15}/>{bn?'Refresh':'Refresh'}</button></div>
      <div className="su-section"><h3><Cpu size={15}/> {bn?'Installed Skills':'Installed Skills'}</h3>{skills.slice(0,12).map(s=><div className="su-row" key={s.id}><div><strong>{s.name}</strong><small>v{s.version} · {s.source} · {s.action}</small></div>{s.source!=='builtin'&&<button onClick={()=>{SkillManager.remove(s.id);refresh();}} aria-label="remove"><Trash2 size={14}/></button>}</div>)}</div>
      <div className="su-section"><h3><ShieldCheck size={15}/> {bn?'System Diagnostics':'System Diagnostics'}</h3>{diagnostics.map(d=><div className="su-row" key={d.id}><div><strong>{d.label}</strong><small>{d.detail}</small></div><span className={d.ok?'su-ok':'su-bad'}>{d.ok?'OK':'CHECK'}</span></div>)}</div>
      <div className="su-note">{bn?'নতুন arbitrary native code নিজে থেকে চালানো হয় না; নিরাপত্তার জন্য skill registry-তে অনুমোদিত action ব্যবহার হয়।':'Arbitrary native code is never executed automatically; skills use approved actions for safety.'}</div>
    </section>
  </div>;
}
