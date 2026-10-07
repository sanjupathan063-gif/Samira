export type RiskLevel = 'low'|'medium'|'high';
export type TaskStatus = 'planned'|'running'|'done'|'blocked'|'failed'|'rolled_back';
export type TaskStep = { id:string; label:string; status:'pending'|'running'|'done'|'failed'; error?:string };
export type CognitiveTask = { id:string; goal:string; status:TaskStatus; steps:TaskStep[]; createdAt:string; updatedAt:string; attempts:number; risk:RiskLevel };
export type SkillDependency = { skillId:string; requires:string[] };

const TASK_KEY='sanju_cognitive_tasks_v1';
const DEP_KEY='sanju_skill_dependencies_v1';
const JOURNAL_KEY='sanju_action_journal_v1';
const PREF_KEY='sanju_preferences_v1';

const read=(k:string, fallback:any[])=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:fallback}catch{return fallback}};
const write=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

export function riskFor(text:string):RiskLevel{
  if (/(delete|ডিলিট|মুছে|send money|টাকা|payment|পেমেন্ট|password|পাসওয়ার্ড|otp|ওটিপি|factory reset)/i.test(text)) return 'high';
  if (/(sms|মেসেজ|কল|call|post|পোস্ট|share|শেয়ার|install|ইনস্টল|permission|পারমিশন)/i.test(text)) return 'medium';
  return 'low';
}
export function createTask(goal:string, steps:string[]=[]):CognitiveTask{
  const now=new Date().toISOString(); const t:CognitiveTask={id:`task_${Date.now()}`,goal,status:'planned',steps:steps.map((label,i)=>({id:`s${i+1}`,label,status:'pending'})),createdAt:now,updatedAt:now,attempts:0,risk:riskFor(goal)};
  const all=[t,...read(TASK_KEY,[])].slice(0,50); write(TASK_KEY,all); journal('task.created',{id:t.id,goal,risk:t.risk}); return t;
}
export function updateTask(id:string, patch:Partial<CognitiveTask>){const all=read(TASK_KEY,[]).map((t:CognitiveTask)=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t);write(TASK_KEY,all);}
export function listTasks():CognitiveTask[]{return read(TASK_KEY,[])}
export function resumeTask(id:string){const t=listTasks().find(x=>x.id===id);if(!t)return null;updateTask(id,{status:'running',attempts:t.attempts+1});journal('task.resume',{id});return t}
export function rollbackTask(id:string, reason='verification failed'){updateTask(id,{status:'rolled_back'});journal('task.rollback',{id,reason})}
export function journal(type:string,data:any){const rows=[{id:`j_${Date.now()}_${Math.random().toString(16).slice(2)}`,type,data,at:new Date().toISOString()},...read(JOURNAL_KEY,[])].slice(0,300);write(JOURNAL_KEY,rows)}
export function getJournal(){return read(JOURNAL_KEY,[])}
export function registerDependency(skillId:string,requires:string[]){const rows=read(DEP_KEY,[]).filter((x:SkillDependency)=>x.skillId!==skillId);rows.unshift({skillId,requires});write(DEP_KEY,rows.slice(0,200));}
export function dependenciesFor(skillId:string):string[]{const x=read(DEP_KEY,[]).find((d:SkillDependency)=>d.skillId===skillId);return x?.requires||[]}
export function dependencyCheck(skillId:string, available:string[]):{ok:boolean;missing:string[]}{const req=dependenciesFor(skillId);const missing=req.filter(x=>!available.includes(x));return {ok:missing.length===0,missing}}
export function recordPreference(key:string,value:any){const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');p[key]=value;write(PREF_KEY,[p]);journal('preference.updated',{key,value})}
export function getPreferences():Record<string,any>{const a=read(PREF_KEY,[]);return a[0]||{}}
export function resourceSnapshot(){return {online:navigator.onLine,storage:typeof localStorage!=='undefined',memory:(performance as any)?.memory?.usedJSHeapSize||null,voices:('speechSynthesis'in window)?speechSynthesis.getVoices().length:0,at:new Date().toISOString()}}
export function chooseExecutionMode(text:string){const r=riskFor(text);const snap=resourceSnapshot();return {risk:r,mode:!snap.online?'offline':(snap.memory&&snap.memory>120_000_000?'light':'normal'),requiresConfirmation:r!=='low'}}
export function verifyTask(t:CognitiveTask){return t.status==='done' && t.steps.every(s=>s.status==='done')}
export function recoverTask(id:string){const t=listTasks().find(x=>x.id===id);if(!t)return null;const next=t.steps.find(s=>s.status!=='done');updateTask(id,{status:'running',attempts:t.attempts+1});journal('task.recover',{id,nextStep:next?.id||null});return next||null}
