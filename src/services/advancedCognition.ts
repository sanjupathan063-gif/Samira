export type Confidence = { score:number; reason:string };
export type Mission = { id:string; goal:string; steps:string[]; status:'planned'|'running'|'done'|'failed'|'paused'; createdAt:string };
const M='sanju_missions_v1', H='sanju_habit_signals_v1', R='sanju_reflections_v1';
const read=(k:string,d:any)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
const write=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
export function confidence(text:string):Confidence{const t=text.trim(); if(!t)return {score:0,reason:'empty'}; const ambiguous=/\b(it|that|this|ওটা|ওইটা|সেটা|ওকে)\b/i.test(t); return {score:ambiguous?.58:.86,reason:ambiguous?'reference may be ambiguous':'intent appears explicit'};}
export function predictNext(signals:string[]):string[]{const key=signals.join('|').toLowerCase(); const out:string[]=[]; if(/youtube.*(open|খুল)|ভিডিও.*চাল/.test(key))out.push('media_followup'); if(/night|রাত|ঘুম/.test(key))out.push('sleep_routine'); if(/call|কল/.test(key))out.push('call_followup'); return [...new Set(out)];}
export function createMission(goal:string,steps:string[]=[]):Mission{const m:Mission={id:`mission_${Date.now()}`,goal,steps,status:'planned',createdAt:new Date().toISOString()}; const all=[m,...read(M,[])].slice(0,50);write(M,all);return m;}
export function listMissions():Mission[]{return read(M,[])}
export function updateMission(id:string,patch:Partial<Mission>){write(M,listMissions().map(x=>x.id===id?{...x,...patch}:x))}
export function recordHabit(signal:string){const a=read(H,[]);a.unshift({signal,at:new Date().toISOString()});write(H,a.slice(0,500));}
export function reflect(mission:Mission,result:'success'|'failure',lesson:string){const a=read(R,[]);a.unshift({missionId:mission.id,result,lesson,at:new Date().toISOString()});write(R,a.slice(0,300));}
export function chooseStrategy(task:string,resources:{online:boolean;memory:number|null}){if(!resources.online)return 'local'; if(resources.memory&&resources.memory>120000000)return 'lightweight'; if(/screen|click|tap|scroll|স্ক্রিন|ক্লিক/i.test(task))return 'visual-accessibility'; return 'standard-agent';}
export function shouldConfirm(text:string){return /(payment|money|delete|factory|password|otp|টাকা|পেমেন্ট|ডিলিট|মুছে|ওটিপি|পাসওয়ার্ড)/i.test(text)}
export function rootCause(error:string){if(/permission|denied|not allowed/i.test(error))return 'permission';if(/network|timeout|fetch/i.test(error))return 'network';if(/tts|speech/i.test(error))return 'voice';return 'unknown';}
