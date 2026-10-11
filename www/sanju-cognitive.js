/* SANJU Cognitive Core v1.0
 * Safe, local-first agent layer. It does NOT execute arbitrary generated code.
 */
(function () {
  "use strict";
  const K = {
    skills: "sanju_dynamic_skills_v1",
    tasks: "sanju_cognitive_tasks_v1",
    journal: "sanju_action_journal_v1",
    prefs: "sanju_cognitive_prefs_v1",
    graph: "sanju_knowledge_graph_v1",
    predictions: "sanju_predictions_v1"
  };
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (_) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  const now = () => new Date().toISOString();
  const app = () => window.__sanjuApp || {};
  const say = (t) => { if (app().addMessage) app().addMessage("bot", t); if (app().speak) app().speak(t); };
  const norm = s => String(s || "").trim().toLowerCase();

  function context() {
    const p = (window.Capacitor && window.Capacitor.Plugins) || {};
    return {
      time: now(), online: navigator.onLine !== false,
      screenVisible: !document.hidden,
      batteryHint: navigator.getBattery ? "available" : "native-only",
      native: !!window.Capacitor,
      plugins: Object.keys(p),
      language: navigator.language || "unknown",
      route: location.hash || "#home"
    };
  }

  function risk(text) {
    const t = norm(text);
    if (/(delete|মুছে|erase|factory|reset|টাকা|payment|পেমেন্ট|password|পাসওয়ার্ড|পাসওয়ার্ড|otp|ওটিপি)/i.test(t)) return {level:"high", confirmation:2};
    if (/(call|কল|sms|এসএমএস|message|মেসেজ|remind|রিমাইন্ড|open|খোলো|share|শেয়ার|শেয়ার)/i.test(t)) return {level:"medium", confirmation:1};
    return {level:"low", confirmation:0};
  }

  function journal(type, data) {
    const a = read(K.journal, []); a.unshift({id:"j."+Date.now(),t:now(),type,data}); write(K.journal,a.slice(0,200));
  }

  function capabilities() {
    const p = (window.Capacitor && window.Capacitor.Plugins) || {};
    const builtins = [
      "voice", "tts", "memory", "local-skills", "task-planner", "risk-check", "self-diagnostic",
      "prediction", "action-journal", "resource-governor", "knowledge-graph", "rollback"
    ];
    return {builtins, native:Object.keys(p), online:navigator.onLine !== false};
  }

  function resources() {
    return {online:navigator.onLine !== false, visibility:!document.hidden,
      connection:(navigator.connection && navigator.connection.effectiveType) || "unknown"};
  }

  function skills() { const s = read(K.skills, []); return Array.isArray(s) ? s : []; }
  function saveSkills(s) { write(K.skills, Array.isArray(s) ? s.slice(0,100) : []); }

  function makeDeclarativeSkill(name, description) {
    const ts = now();
    return {id:"gen."+Date.now(), name:name.trim().slice(0,80), description:description.trim().slice(0,240),
      action:"SPEAK", triggers:[name.trim()], source:"ai-generated-declarative", version:1,
      enabled:true, permissions:[], dependencies:[], rollbackSafe:true, createdAt:ts, updatedAt:ts};
  }

  function genesis(text) {
    const m = String(text).match(/(?:skill|স্কিল)\s*(?:called|named|নাম)?\s*[:：-]?\s*(.+)$/i);
    if (!m) return false;
    const name = m[1].trim(); if (!name) return false;
    const old = skills();
    if (old.some(s => norm(s.name) === norm(name))) { say(`“${name}” skill আগে থেকেই আছে।`); return true; }
    const s = makeDeclarativeSkill(name, `User requested capability: ${name}`);
    saveSkills([s, ...old]); journal("skill_created", {skill:s});
    say(`ঠিক আছে। “${name}” skill-এর নিরাপদ declarative version তৈরি করে Skill Library-তে যোগ করেছি।`);
    return true;
  }

  function createTask(goal) {
    const tasks = read(K.tasks, []);
    const task = {id:"task."+Date.now(), goal:goal.trim().slice(0,500), status:"planned", step:0,
      steps:["Goal বুঝে নেওয়া","Permission/Risk যাচাই","Supported action execute","ফলাফল যাচাই"], createdAt:now(), updatedAt:now()};
    tasks.unshift(task); write(K.tasks,tasks.slice(0,50)); journal("task_created", task); return task;
  }

  function prediction() {
    const j = read(K.journal, []); const counts = {};
    j.filter(x => x.type === "action").slice(0,100).forEach(x => { const key = x.data && x.data.intent; if(key) counts[key]=(counts[key]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([intent,count])=>({intent,count}));
  }

  function addGraphFact(subject, relation, object) {
    const g = read(K.graph, []); g.unshift({subject,relation,object,t:now()}); write(K.graph,g.slice(0,300));
  }

  function explain(text) {
    const r = risk(text), c = context(), caps = capabilities();
    return `আমি এই command-টাকে ${r.level} risk হিসেবে দেখছি। ${r.confirmation ? r.confirmation + " ধাপ confirmation দরকার।" : "সরাসরি চালানো যেতে পারে।"} Native capabilities: ${caps.native.length}টি। Network: ${c.online ? "online" : "offline"}।`;
  }

  async function intercept(text) {
    const t = String(text || "").trim(); if (!t) return false;
    const l = norm(t);
    if (/^(capabilities|capability|কি কি পারো|কী কী পারো|তোমার capability)/i.test(t)) {
      const c=capabilities(); say(`আমার ${c.builtins.length}টি cognitive capability এবং ${c.native.length}টি native plugin শনাক্ত হয়েছে।`); return true;
    }
    if (/(কেন কর|কেন করলে|why did|explain).*(command|কাজ|এটা)/i.test(t)) { say(explain(t)); return true; }
    if (/(নোটিফিকেশন পড়|নোটিফিকেশন পড়|নোটিফিকেশন শুন|read notifications|read my notifications|নোটিফিকেশন দেখাও|সাম্প্রতিক নোটিফিকেশন)/i.test(t)) {
      const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NotificationAccess;
      if (!plugin) { say("Notification পড়তে Android APK-তে Notification Access চালু করতে হবে।"); return true; }
      try {
        const status = await plugin.status();
        if (!status || !status.enabled) {
          say("প্রথমে SANJU-র Notification Access অনুমতি চালু করুন।"); 
          try { await plugin.openSettings(); } catch (_) {}
          return true;
        }
        const result = await plugin.recent();
        const items = (result && Array.isArray(result.items) ? result.items : []).slice(0, 8);
        if (!items.length) { say("এখনও কোনো recent notification পাওয়া যায়নি।"); return true; }
        const safe = items.map((n, i) => {
          const pkg = String(n.package || "অজানা অ্যাপ").split(".").pop();
          const title = String(n.title || "").slice(0, 100);
          const body = String(n.text || "").slice(0, 180);
          if (/(otp|one.time.password|verification code|পিন কোড|ওটিপি|verification code|password reset)/i.test(title+" "+body)) {
            return `${i+1}. ${pkg}: sensitive code notification এসেছে; নিরাপত্তার জন্য এর text পড়ছি না।`;
          }
          return `${i+1}. ${pkg}${title ? ", "+title : ""}${body ? ": "+body : ""}`;
        });
        journal("notifications.read",{count:items.length});
        say("সাম্প্রতিক নোটিফিকেশন: "+safe.join("। "));
      } catch (e) { say("Notification পড়তে পারলাম না। Notification Access চালু আছে কি না দেখুন।"); }
      return true;
    }
    if (/(pause task|কাজ থামাও|কাজ বিরতি|pause mission)/i.test(t)) {
      const tasks=read(K.tasks,[]), active=tasks.find(x=>x.status==="running" || x.status==="resumed");
      if (!active) say("এখন কোনো active task চলছে না।");
      else { active.status="paused"; active.updatedAt=now(); write(K.tasks,tasks); journal("task_paused",{id:active.id,goal:active.goal}); say(`কাজটি pause করেছি: ${active.goal}`); }
      return true;
    }
    if (/(self reflection|নিজের কাজ পর্যালোচনা|আজ কী শিখলে|কাজের রিপোর্ট)/i.test(t)) {
      const j=read(K.journal,[]), recent=j.slice(0,20), failures=recent.filter(x=>/fail|error|rollback/i.test(x.type)).length;
      const actions=recent.length;
      say(`সাম্প্রতিক ${actions}টি event পর্যালোচনা করেছি। ${failures}টি failure/rollback signal পেয়েছি। এটি local journal-এর ভিত্তিতে তৈরি রিপোর্ট—আমি নিজে থেকে model train করি না।`);
      journal("self_reflection",{events:actions,failures});
      return true;
    }
    if (/(diagnostic|diagnostics|self test|নিজেকে পরীক্ষা|নিজে পরীক্ষা)/i.test(t)) {
      const c=context(), r=resources(); journal("diagnostic",{context:c,resources:r});
      say(`Self-diagnostic সম্পন্ন। Network: ${r.online?"OK":"OFFLINE"} · Native bridge: ${c.native?"OK":"Browser mode"} · Screen: ${c.screenVisible?"active":"background"}`); return true;
    }
    if (/(goal|লক্ষ্য|কাজ শুরু|task তৈরি|task বানাও)/i.test(t)) {
      const goal=t.replace(/^(goal|লক্ষ্য|task তৈরি|task বানাও)\s*[:：-]?/i,"").trim() || t;
      const task=createTask(goal); say(`Goal তৈরি করেছি। ${task.steps.length} ধাপে পরিকল্পনা প্রস্তুত। Risk check ও execution-এর আগে অনুমতি লাগতে পারে।`); return true;
    }
    if (/(resume|continue|চালিয়ে যাও|চালিয়ে যাও|আগের কাজ)/i.test(t)) {
      const tasks=read(K.tasks,[]), pending=tasks.find(x=>x.status!=="done");
      if(pending){pending.status="resumed";pending.updatedAt=now();write(K.tasks,tasks);journal("task_resumed",pending);say(`আগের কাজটি resume করছি: ${pending.goal}`);} else say("কোনো অসম্পূর্ণ task পাওয়া যায়নি।");
      return true;
    }
    if (/(মনে রাখো|এটা মনে রেখো|remember this|remember that)/i.test(t)) {
      const value=t.replace(/^(.*?)(মনে রাখো|এটা মনে রেখো|remember this|remember that)\s*[:：-]?/i,"").trim() || t;
      const prefs=read(K.prefs,{});
      prefs[`note_${Date.now()}`]={value:value.slice(0,500),createdAt:now()};
      write(K.prefs,prefs);
      journal("user_memory_saved",{length:value.length});
      say("ঠিক আছে, এই কথাটি এই ডিভাইসের local memory-তে সংরক্ষণ করেছি।");
      return true;
    }
    if (/(prediction|predict|আগে থেকে বল|সম্ভাব্য কাজ)/i.test(t)) {
      const p=prediction(); say(p.length ? "সাম্প্রতিক action pattern: " + p.map(x=>`${x.intent} (${x.count}x)`).join(", ") : "এখনও পর্যাপ্ত action history নেই।"); return true;
    }
    if (/(add|create|যোগ|অ্যাড|তৈরি).*(skill|স্কিল)/i.test(t)) return genesis(t);
    if (/(show|দেখাও|দেখাও).*(task|কাজ|journal|লগ|history)/i.test(t)) {
      const tasks=read(K.tasks,[]), j=read(K.journal,[]); say(`Task: ${tasks.length}টি · Action journal: ${j.length}টি। সর্বশেষ task: ${tasks[0]?.goal || "নেই"}`); return true;
    }
    if (/(rollback|পিছনে যাও|পুরনো skill)/i.test(t)) {
      const s=skills(); const target=s.find(x=>x.source==="ai-generated-declarative" && x.enabled!==false);
      if(target){target.enabled=false;target.rolledBackAt=now();saveSkills(s);journal("skill_rollback",target);say(`“${target.name}” skill disable করে rollback করেছি।`);} else say("Rollback করার মতো generated skill পাওয়া যায়নি।"); return true;
    }
    journal("action",{intent:l.slice(0,100),risk:risk(t),context:context()});
    return false;
  }

  window.SanjuCognitive = {version:"1.0.0", context, risk, capabilities, resources, prediction, createTask, addGraphFact, journal, intercept,
    getTasks:()=>read(K.tasks,[]), getJournal:()=>read(K.journal,[]), getSkills:skills};
})();
