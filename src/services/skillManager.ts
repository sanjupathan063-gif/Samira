import { registerDependency } from './cognitiveCore';
export type SkillAction = 'SPEAK' | 'OPEN_APP' | 'NOTE' | 'REMINDER' | 'SYSTEM_STATUS';
export type Skill = {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  action: SkillAction;
  payload?: string;
  version: number;
  source: 'builtin' | 'user' | 'ai';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const KEY = 'sanju_dynamic_skills_v1';

const BUILTIN: Skill[] = [
  { id:'skill.system.status', name:'System Status', description:'Reports network, browser and storage status.', triggers:['system status','সিস্টেম স্ট্যাটাস','কেমন আছো'], action:'SYSTEM_STATUS', version:1, source:'builtin', enabled:true, createdAt:'2026-10-03T00:00:00.000Z', updatedAt:'2026-10-03T00:00:00.000Z' },
  { id:'skill.quick.note', name:'Quick Note', description:'Creates a local note from a natural command.', triggers:['note','নোট','লিখে রাখো','মনে রাখো'], action:'NOTE', version:1, source:'builtin', enabled:true, createdAt:'2026-10-03T00:00:00.000Z', updatedAt:'2026-10-03T00:00:00.000Z' },
];

function read(): Skill[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return Array.isArray(parsed) ? parsed : BUILTIN;
  } catch { return BUILTIN; }
}
function write(skills: Skill[]) { localStorage.setItem(KEY, JSON.stringify(skills)); }

export const SkillManager = {
  list(): Skill[] { return read().filter(s => s.enabled); },
  all(): Skill[] { return read(); },
  match(text: string): Skill | null {
    const q = text.toLowerCase();
    return this.list().find(s => s.triggers.some(t => q.includes(t.toLowerCase()))) || null;
  },
  addFromRequest(request: string): { skill: Skill; created: boolean; message: string } {
    const q = request.trim();
    const existing = read().find(s => s.name.toLowerCase() === q.toLowerCase());
    if (existing) return { skill: existing, created:false, message:`${existing.name} already exists.` };

    const lower = q.toLowerCase();
    let action: SkillAction = 'SPEAK';
    let name = q.replace(/^(add|create|make|যোগ করো|অ্যাড করো|তৈরি করো)\s+/i,'').trim() || 'New Skill';
    let description = `User-created skill: ${name}`;
    let triggers = [name, q];
    if (/(note|নোট|লিখে|মনে রাখ)/i.test(lower)) action='NOTE';
    else if (/(remind|reminder|রিমাইন্ড|মনে করিয়ে)/i.test(lower)) action='REMINDER';
    else if (/(open|খোলো|চালু|launch)/i.test(lower)) action='OPEN_APP';
    else if (/(status|স্ট্যাটাস|health|স্বাস্থ্য)/i.test(lower)) action='SYSTEM_STATUS';

    const now = new Date().toISOString();
    const skill: Skill = { id:`skill.user.${Date.now()}`, name, description, triggers, action, version:1, source:'ai', enabled:true, createdAt:now, updatedAt:now };
    write([skill, ...read()].slice(0,100));
    registerDependency(skill.id, action === 'OPEN_APP' ? ['PhoneControl'] : action === 'REMINDER' ? ['Scheduler'] : []);
    return { skill, created:true, message:`${name} skill added safely as a declarative skill.` };
  },
  disable(id: string) { write(read().map(s => s.id === id ? {...s, enabled:false, updatedAt:new Date().toISOString()} : s)); },
  remove(id: string) { write(read().filter(s => s.id !== id)); },
  resetUserSkills() { write(read().filter(s => s.source === 'builtin')); },
};
