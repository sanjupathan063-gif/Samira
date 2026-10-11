/* ══════════════════════════════════════════════════════════════
   SANJU EXTRAS v4.3 — অতিরিক্ত ফিচার (শুধু JS, নতুন নেটিভ অনুমতি লাগে না)
   রুটিন • খরচের হিসাব • নোট/স্মৃতিতে খোঁজা • অনুবাদ (লাইভ মোড) • ডকুমেন্ট/ছবির লেখা পড়া
   লোকেশন ট্রিগার • ড্রাইভিং মোড • অ্যাপ লক (PIN) • ব্যাকআপ/রিস্টোর • ডেইলি ব্রিফ
   নিরাপত্তা: ঝুঁকিপূর্ণ ধাপ (কল/মেসেজ/মোছা) অটো-রানে চলে না।
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const VERSION = "4.2.0";
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
  const K = {
    routines: "sanju_extras_routines",
    exp: "sanju_extras_expenses", places: "sanju_extras_places", geo: "sanju_extras_geotriggers",
    cfg: "sanju_extras_cfg", lock: "sanju_extras_lock", pos: "sanju_extras_lastpos",
  };

  /* ───────────── ছোট helper ───────────── */
  const P = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const PLUS = () => P().SanjuPlus || null;
  const A11Y = () => P().AccessibilityControl || null;
  const PHONE = () => P().PhoneControl || null;
  const app = () => window.__sanjuApp || {};
  const S = () => (app().getSettings && app().getSettings()) || {};
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k) || "null"); return v == null ? d : v; } catch (_) { return d; } };
  const writeJSON = (k, v) => lsSet(k, JSON.stringify(v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const BN = "০১২৩৪৫৬৭৮৯";
  const toEn = (s) => String(s == null ? "" : s).replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  function say(text, speak) {
    try {
      if (app().addMessage) app().addMessage("bot", text);
      if (speak !== false && app().speak) app().speak(String(text).slice(0, 320));
    } catch (_) {}
  }
  const cfg = () => Object.assign({ autoBrief: false, briefHour: 7, autoUpdate: true, driving: false, translateTo: "", geoOn: true }, readJSON(K.cfg, {}));
  const setCfg = (patch) => { const c = Object.assign(cfg(), patch); writeJSON(K.cfg, c); return c; };
  const RISKY = /(কল\s*(করো|দাও)|ফোন\s*(করো|দাও)|sms|এসএমএস|মেসেজ\s*পাঠাও|মুছ|delete|পেমেন্ট|payment|টাকা\s*পাঠাও|ট্রান্সফার|transfer|factory|reset)/i;

  /* ───────────── ২) রুটিন ───────────── */
  const getRoutines = () => readJSON(K.routines, []);
  const saveRoutines = (a) => writeJSON(K.routines, a.slice(0, 40));
  let routineBusy = false;
  async function runRoutine(r, auto) {
    if (routineBusy) { say("আরেকটা রুটিন চলছে, শেষ হলে আবার বলো।"); return; }
    routineBusy = true;
    try {
      say(`“${r.name}” রুটিন শুরু করছি (${bn(r.steps.length)}টি ধাপ)।`, false);
      for (const step of r.steps) {
        if (/^রুটিন\s*চালাও/.test(step)) { say(`ধাপ বাদ: ${step} (রুটিনের ভেতরে রুটিন চলে না)।`, false); continue; }
        if (auto && RISKY.test(step)) { say(`নিরাপত্তার জন্য অটো-রানে এই ধাপ বাদ দিলাম: ${step}`, false); continue; }
        try { if (app().handleUserInput) await app().handleUserInput(step); } catch (_) {}
        await sleep(1600);
      }
      say(`“${r.name}” রুটিন শেষ।`, true);
    } finally { routineBusy = false; }
  }
  const findRoutine = (name) => { const n = norm(name); return getRoutines().find((r) => norm(r.name) === n) || getRoutines().find((r) => norm(r.name).includes(n) && n.length >= 2); };

  /* ───────────── ৩) খরচ ───────────── */
  const getExp = () => readJSON(K.exp, []);
  const CATS = [
    ["খাবার", /(বাজার|খাবার|চা|নাস্তা|নাশতা|রেস্টুরেন্ট|লাঞ্চ|ডিনার|ফল|মাছ|মাংস|সবজি)/],
    ["যাতায়াত", /(ভাড়া|বাস|রিকশা|সিএনজি|পেট্রোল|অকটেন|উবার|পাঠাও|ট্রেন|লঞ্চ)/],
    ["বিল", /(বিল|রিচার্জ|ইন্টারনেট|বিদ্যুৎ|গ্যাস|পানি|মোবাইল)/],
    ["স্বাস্থ্য", /(ওষুধ|ডাক্তার|হাসপাতাল|টেস্ট)/],
  ];
  const catOf = (n) => { for (const [c, re] of CATS) if (re.test(n)) return c; return "অন্যান্য"; };
  function parseExpense(text) {
    const t = toEn(text);
    if (t.length > 90) return null;
    if (/(কত|হিসাব|রিপোর্ট|দেখাও|মুছ)/.test(t) && !/\d/.test(t)) return null;
    if (/\?|কত\s*খরচ/.test(t)) return null;
    let m = t.match(/(?:খরচ|ব্যয়)\s*[:ঃ]?\s*(\d+(?:\.\d+)?)\s*(?:টাকা|৳|tk)?\s*(.*)$/i);
    if (m) return { amt: parseFloat(m[1]), note: m[2].replace(/(করলাম|করেছি|হয়েছে)/g, "").trim() };
    m = t.match(/^(\d+(?:\.\d+)?)\s*(?:টাকা|৳|tk)\s*(.*?)\s*(?:এ|তে|র\s*জন্য)?\s*(?:খরচ|ব্যয়)(?:\s*(?:করলাম|করেছি|হয়েছে|হলো))?$/i);
    if (m) return { amt: parseFloat(m[1]), note: m[2].trim() };
    m = t.match(/^(\d+(?:\.\d+)?)\s*(?:টাকা|৳)\s*(.+?)\s*(কিনলাম|দিলাম|দিয়েছি|কিনেছি)$/);
    if (m) return { amt: parseFloat(m[1]), note: m[2].trim() };
    return null;
  }
  function addExpense(e) {
    const a = getExp(); a.unshift({ t: Date.now(), amt: e.amt, note: e.note || "", cat: catOf(e.note || "") });
    writeJSON(K.exp, a.slice(0, 2000));
  }
  function expSummary(range) {
    const now = new Date(); const start = new Date(now);
    if (range === "day") start.setHours(0, 0, 0, 0);
    else if (range === "week") { start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); }
    else { start.setDate(1); start.setHours(0, 0, 0, 0); }
    const items = getExp().filter((x) => x.t >= start.getTime());
    const total = items.reduce((s, x) => s + x.amt, 0);
    const byCat = {};
    items.forEach((x) => { byCat[x.cat] = (byCat[x.cat] || 0) + x.amt; });
    return { items, total, byCat };
  }
  const money = (n) => "৳" + bn(Math.round(n * 100) / 100);

  /* ───────────── ৪) স্মৃতি/নোট/চ্যাটে খোঁজা ───────────── */
  const STOP = new Set(["আমার", "আমি", "কি", "কী", "কত", "কোথায়", "কোন", "কে", "কখন", "এর", "এই", "সেই", "না", "তুমি", "বলো", "বল", "খুঁজো", "খুঁজে", "দাও", "দেখাও", "নোটে", "স্মৃতিতে", "চ্যাটে", "মেমোরিতে", "লিখেছি", "ছিল", "আছে", "হয়", "ছিলো", "কোনটা", "the", "a", "is", "my", "what", "where"]);
  const tokens = (s) => (String(s || "").toLowerCase().toString().match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter((w) => w.length > 1 && !STOP.has(w));
  const stem = (w) => (w.length > 4 ? w.slice(0, w.length - 1) : w);
  function docs(sources) {
    const out = [];
    const arr = (k) => { const v = readJSON(k, []); return Array.isArray(v) ? v : []; };
    if (sources.includes("notes")) arr("sanju_notes").forEach((n) => out.push({ src: "নোট", text: typeof n === "string" ? n : (n && n.text) || "" }));
    if (sources.includes("memories")) arr("sanju_memories").forEach((n) => out.push({ src: "স্মৃতি", text: typeof n === "string" ? n : (n && n.text) || "" }));
    if (sources.includes("history")) arr("sanju_history").forEach((h) => { if (h && h.content) out.push({ src: "চ্যাট", text: String(h.content).slice(0, 400) }); });
    if (sources.includes("exp")) getExp().slice(0, 300).forEach((e) => out.push({ src: "খরচ", text: `${e.note} ${e.amt} টাকা ${new Date(e.t).toLocaleDateString("bn-BD")}` }));
    return out.filter((d) => d.text);
  }
  function search(q, sources, limit) {
    const qt = tokens(toEn(q)).concat(tokens(q)); const uniq = [...new Set(qt)];
    if (!uniq.length) return { hits: [], need: 1 };
    const scored = docs(sources).map((d) => {
      const dl = (toEn(d.text) + " " + d.text).toLowerCase(); let s = 0;
      for (const w of uniq) if (dl.includes(w) || dl.includes(stem(w))) s++;
      return { d, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return { hits: scored.slice(0, limit || 4), need: Math.max(1, Math.ceil(uniq.length * 0.6)) };
  }

  /* ───────────── AI helper (Groq) ───────────── */
  async function groq(messages, o) {
    o = o || {};
    const key = S().apiKey;
    if (!key) throw new Error("no-key");
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), o.timeout || 25000);
    try {
      const r = await fetch(GROQ_URL, {
        method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: o.model || S().model || "openai/gpt-oss-20b", messages, temperature: o.temp == null ? 0.3 : o.temp, max_tokens: o.max || 900 }),
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "").trim();
    } finally { clearTimeout(to); }
  }
  const needKey = () => { say("এই কাজের জন্য সেটিংসে Groq API key লাগবে।"); return true; };

  /* ───────────── ৫) অনুবাদ ───────────── */
  const LANGS = { "ইংরেজি": "English", "হিন্দি": "Hindi", "বাংলা": "Bengali", "আরবি": "Arabic", "উর্দু": "Urdu" };
  const langKey = (s) => { for (const k of Object.keys(LANGS)) if (String(s || "").indexOf(k) === 0) return k; return ""; };
  async function translate(text, toLang) {
    return groq([
      { role: "system", content: `Translate the user's text into ${toLang}. Output only the translation, nothing else.` },
      { role: "user", content: text },
    ], { temp: 0, max: 700 });
  }
  async function doTranslate(text, lk) {
    if (!S().apiKey) return needKey();
    const target = lk ? LANGS[lk] : (/[ঀ-৿]/.test(text) ? "English" : "Bengali");
    try { const out = await translate(text, target); say(out || "অনুবাদ পাইনি।", true); }
    catch (_) { say("অনুবাদ করতে পারলাম না। ইন্টারনেট/API key দেখো।"); }
    return true;
  }

  /* ───────────── ৬) ডকুমেন্ট/ছবির লেখা পড়া ───────────── */
  function downscale(file, max) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("read"));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("img"));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = String(fr.result);
      };
      fr.readAsDataURL(file);
    });
  }
  async function readDocument(file) {
    if (!S().apiKey) return needKey();
    try {
      const url = await downscale(file, 1400);
      say("ছবিটা পড়ছি…", false);
      const out = await groq([
        { role: "system", content: "তুমি একটি OCR ও সারাংশ সহকারী। ছবির লেখা যতটা সম্ভব হুবহু তোলো (সংক্ষেপে), তারপর বাংলায় ৩-৫ লাইনের সারাংশ আর গুরুত্বপূর্ণ তথ্য (নাম, তারিখ, অঙ্ক) আলাদা করে দাও। লেখা না থাকলে বলো ছবিতে লেখা নেই।" },
        { role: "user", content: [{ type: "text", text: "এই ডকুমেন্ট/ছবিটি পড়ো।" }, { type: "image_url", image_url: { url } }] },
      ], { model: S().visionModel || VISION_MODEL, max: 1200, temp: 0.1, timeout: 40000 });
      say(out || "ছবি থেকে কিছু পড়তে পারিনি।", true);
    } catch (e) { say("ছবি পড়তে সমস্যা হয়েছে। ছবি পরিষ্কার কি না আর ইন্টারনেট দেখো।"); }
  }
  function pickDocument() {
    let inp = document.getElementById("plusDocPicker");
    if (!inp) {
      inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "plusDocPicker"; inp.hidden = true;
      inp.addEventListener("change", () => { const f = inp.files && inp.files[0]; inp.value = ""; if (f) readDocument(f); });
      document.body.appendChild(inp);
    }
    inp.click();
  }

  /* ───────────── ৯) লোকেশন ট্রিগার (অ্যাপ খোলা থাকলে) ───────────── */
  const getPlaces = () => readJSON(K.places, []);
  const getGeo = () => readJSON(K.geo, []);
  let watchId = null; const inside = {};
  function dist(a, b, c, d) {
    const R = 6371000, r = (x) => x * Math.PI / 180, dLat = r(c - a), dLon = r(d - b);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function curPos() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("nogeo"));
      navigator.geolocation.getCurrentPosition((p) => { writeJSON(K.pos, { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now() }); res(p.coords); }, rej, { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
    });
  }
  async function savePlace(name) {
    try {
      const c = await curPos(); const a = getPlaces().filter((p) => norm(p.name) !== norm(name));
      a.push({ name, lat: c.latitude, lon: c.longitude }); writeJSON(K.places, a.slice(0, 30));
      say(`“${name}” জায়গাটা সেভ করলাম।`, true);
    } catch (_) { say("লোকেশন পাইনি। লোকেশন অনুমতি ও GPS চালু আছে কি দেখো।"); }
  }
  function startWatch() {
    if (watchId != null || !navigator.geolocation || !cfg().geoOn || !getGeo().length) return;
    try {
      watchId = navigator.geolocation.watchPosition((p) => {
        const now = Date.now();
        for (const g of getGeo()) {
          const pl = getPlaces().find((x) => norm(x.name) === norm(g.place)); if (!pl) continue;
          const d = dist(p.coords.latitude, p.coords.longitude, pl.lat, pl.lon);
          if (d <= 150 && !inside[g.id] && now - (g.last || 0) > 30 * 60000) {
            inside[g.id] = true; g.last = now; writeJSON(K.geo, getGeo().map((x) => (x.id === g.id ? g : x)));
            say(`${g.place}-এ পৌঁছেছ। “${g.command}” চালাচ্ছি।`, true);
            if (RISKY.test(g.command)) say("নিরাপত্তার জন্য কল/মেসেজ/মোছার কাজ অটো চলে না।", false);
            else if (app().handleUserInput) app().handleUserInput(g.command);
          } else if (d > 300) inside[g.id] = false;
        }
      }, () => {}, { enableHighAccuracy: false, maximumAge: 30000, timeout: 30000 });
    } catch (_) {}
  }
  function stopWatch() { if (watchId != null && navigator.geolocation) { try { navigator.geolocation.clearWatch(watchId); } catch (_) {} watchId = null; } }

  /* ───────────── ১০) ড্রাইভিং মোড ───────────── */
  let wakeLock = null;
  async function setDriving(on) {
    setCfg({ driving: !!on });
    document.body.classList.toggle("sanju-driving", !!on);
    try {
      if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen");
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (_) {}
    say(on ? "ড্রাইভিং মোড চালু। বড় মাইক বাটন, স্ক্রিন জাগানো থাকবে। কল ও বার্তা ভয়েসে বলো।" : "ড্রাইভিং মোড বন্ধ।");
  }

  /* ───────────── ১১) অ্যাপ লক ───────────── */
  let locked = false;
  const lockCfg = () => readJSON(K.lock, { enabled: false });
  async function sha(s) {
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest("SHA-256", b);
    return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const isLocked = () => locked;
  async function setPin(pin) {
    if (!/^\d{4,8}$/.test(pin)) return { ok: false, msg: "PIN ৪–৮টি সংখ্যা হতে হবে।" };
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((x) => x.toString(16).padStart(2, "0")).join("");
    writeJSON(K.lock, { enabled: true, salt, hash: await sha(salt + pin), grace: 60 });
    return { ok: true, msg: "অ্যাপ লক চালু হয়েছে।" };
  }
  async function checkPin(pin) { const c = lockCfg(); return !!(c.enabled && c.hash && (await sha(c.salt + pin)) === c.hash); }
  async function removePin(pin) { if (!(await checkPin(pin))) return false; writeJSON(K.lock, { enabled: false }); locked = false; return true; }
  function lockNow() { if (lockCfg().enabled) { locked = true; document.dispatchEvent(new CustomEvent("sanjuExtrasLock", { detail: { locked: true } })); } }
  async function unlock(pin) { if (await checkPin(pin)) { locked = false; document.dispatchEvent(new CustomEvent("sanjuExtrasLock", { detail: { locked: false } })); return true; } return false; }

  /* ───────────── ১২) ব্যাকআপ / রিস্টোর ───────────── */
  const SECRET_FIELDS = ["apiKey", "geminiTtsKey", "youtubeKey", "homeAssistantToken"];
  function exportData(scope) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf("sanju_") !== 0 || k === K.lock || k === K.cfg) continue;
      if (scope === "skills" && !/(skills|routines|places|geotriggers)/.test(k)) continue;
      let v = localStorage.getItem(k);
      if (k === "sanju_settings") { try { const o = JSON.parse(v); SECRET_FIELDS.forEach((f) => delete o[f]); v = JSON.stringify(o); } catch (_) {} }
      data[k] = v;
    }
    return JSON.stringify({ app: "sanju", v: 1, exported: new Date().toISOString(), data });
  }
  function importData(str) {
    let o; try { o = JSON.parse(str); } catch (_) { return { ok: false, msg: "JSON পড়া যায়নি।" }; }
    if (!o || o.app !== "sanju" || !o.data || typeof o.data !== "object") return { ok: false, msg: "এটা SANJU ব্যাকআপ নয়।" };
    let n = 0;
    for (const [k, v] of Object.entries(o.data)) {
      if (k.indexOf("sanju_") !== 0 || k === K.lock || k === K.cfg || typeof v !== "string" || v.length > 2000000) continue;
      if (k === "sanju_settings") {
        try { const cur = JSON.parse(lsGet(k) || "{}"); const inc = JSON.parse(v); SECRET_FIELDS.forEach((f) => delete inc[f]); lsSet(k, JSON.stringify(Object.assign(cur, inc))); n++; } catch (_) {}
        continue;
      }
      if (lsSet(k, v)) n++;
    }
    return { ok: true, msg: `${bn(n)}টি ডেটা ফিরিয়ে আনা হয়েছে। অ্যাপ আবার চালু করলে সব ঠিকঠাক দেখাবে।` };
  }

  /* ───────────── ১৪) ডেইলি ব্রিফ ───────────── */
  const WCODE = (c) => c === 0 ? "আকাশ পরিষ্কার" : c <= 3 ? "আংশিক মেঘলা" : c <= 48 ? "কুয়াশাচ্ছন্ন" : c <= 67 ? "বৃষ্টি" : c <= 77 ? "তুষারপাত" : c <= 82 ? "বৃষ্টির ঝাপটা" : "বজ্রসহ বৃষ্টি";
  async function weather() {
    let pos = readJSON(K.pos, null);
    try { const c = await curPos(); pos = { lat: c.latitude, lon: c.longitude }; } catch (_) {}
    if (!pos) return "";
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`);
      const j = await r.json();
      const cur = j.current || {}; const d = j.daily || {};
      return `আবহাওয়া: ${WCODE(cur.weather_code)}, এখন ${bn(Math.round(cur.temperature_2m))}°। আজ ${bn(Math.round(d.temperature_2m_min[0]))}°–${bn(Math.round(d.temperature_2m_max[0]))}°, বৃষ্টির সম্ভাবনা ${bn(d.precipitation_probability_max[0])}%।`;
    } catch (_) { return ""; }
  }
  async function brief() {
    const name = S().userName || "বস";
    const parts = [`শুভ দিন ${name}! আজ ${new Date().toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" })}।`];
    const w = navigator.onLine === false ? "" : await weather(); if (w) parts.push(w);
    const e = expSummary("day"); if (e.total > 0) parts.push(`আজ এ পর্যন্ত খরচ ${money(e.total)}।`);
    const rs = getRoutines(); if (rs.length) parts.push(`তোমার রুটিন আছে ${bn(rs.length)}টি, যেমন “${rs[0].name}”।`);
    try { if (navigator.getBattery) { const b = await navigator.getBattery(); parts.push(`ব্যাটারি ${bn(Math.round(b.level * 100))}%${b.charging ? " (চার্জ হচ্ছে)" : ""}।`); } } catch (_) {}
    say(parts.join("\n"), true);
  }
  async function maybeAutoBrief() {
    const c = cfg(); const day = new Date().toDateString();
    if (!c.autoBrief || c.lastBrief === day || new Date().getHours() < c.briefHour) return;
    setCfg({ lastBrief: day }); await brief();
  }

  /* ═════════════ কমান্ড ধরা (handleUserInput থেকে প্রথমেই ডাকা হয়) ═════════════ */
  async function intercept(raw) {
    const text = String(raw || "").trim();
    if (!text) return false;
    if (locked) { say("অ্যাপ লক করা আছে। আগে PIN দিয়ে খোলো।", false); return true; }
    const t = toEn(text);
    let m;
    const c = cfg();
    // অনুবাদ মোড
    if (/^অনুবাদ\s*মোড\s*(বন্ধ|অফ)/.test(text)) { setCfg({ translateTo: "" }); say("অনুবাদ মোড বন্ধ।"); return true; }
    m = text.match(/^অনুবাদ\s*মোড\s*(?:চালু|অন)?\s*[(（]?\s*(ইংরেজি|হিন্দি|বাংলা|আরবি|উর্দু)?/);
    if (m && /^অনুবাদ\s*মোড/.test(text)) { const lk = langKey(m[1] || "ইংরেজি"); setCfg({ translateTo: lk }); say(`অনুবাদ মোড চালু: এখন যা বলবে ${lk}-তে অনুবাদ করে শোনাব। বন্ধ করতে “অনুবাদ মোড বন্ধ”।`); return true; }
    if (c.translateTo && !/^(থামো|স্টপ|stop)/i.test(text)) { await doTranslate(text, c.translateTo); return true; }
    m = text.match(/^(?:অনুবাদ\s*করো|translate)\s*[:：-]?\s*(.+?)(?:\s+(ইংরেজি|হিন্দি|বাংলা|আরবি|উর্দু)(?:তে|য়|েই)?)?$/i);
    if (m && m[1]) { await doTranslate(m[1].trim(), langKey(m[2])); return true; }
    m = text.match(/^(.+?)\s+(ইংরেজি|হিন্দি|বাংলা|আরবি|উর্দু)(?:তে|য়)\s*অনুবাদ\s*(?:করো|কর|দাও)$/);
    if (m) { await doTranslate(m[1].trim(), langKey(m[2])); return true; }

    // ব্রিফ
    if (/(ডেইলি\s*ব্রিফ|আজকের\s*ব্রিফ|সকালের\s*ব্রিফ|ব্রিফিং|আজকের\s*দিনটা\s*কেমন)/.test(text)) { await brief(); return true; }
    if (/ব্রিফ.*(অটো|স্বয়ংক্রিয়)?.*(চালু|অন)/.test(text) && /অটো|স্বয়ংক্রিয়|প্রতিদিন/.test(text)) { setCfg({ autoBrief: true }); say("ঠিক আছে, রোজ সকালে অ্যাপ খুললে ব্রিফ শোনাব।"); return true; }

    // রুটিন
    m = text.match(/^(?:নতুন\s*)?রুটিন\s*(?:বানাও|তৈরি\s*করো|যোগ\s*করো|সেভ\s*করো)\s*[:：-]?\s*(.+?)\s*[:：]\s*(.+)$/);
    if (m) {
      const steps = m[2].split(/\s*(?:,|;|،|তারপর|এরপর|then)\s*/i).map((x) => x.trim()).filter(Boolean).slice(0, 12);
      if (!steps.length) { say("ধাপ বুঝতে পারিনি।"); return true; }
      const a = getRoutines().filter((r) => norm(r.name) !== norm(m[1])); a.unshift({ name: m[1].trim(), steps }); saveRoutines(a);
      say(`“${m[1].trim()}” রুটিন সেভ হলো (${bn(steps.length)}টি ধাপ)। চালাতে বলো: “${m[1].trim()} রুটিন চালাও”।`, true); return true;
    }
    m = text.match(/^(?:রুটিন\s*(?:চালাও|রান\s*করো)\s*(\(অটো\))?\s*[:：-]?\s*(.+)|(.+?)\s*রুটিন\s*(?:চালাও|রান\s*করো|চালু\s*করো))$/);
    if (m) {
      const auto = !!m[1]; const name = (m[2] || m[3] || "").trim();
      const r = findRoutine(name);
      if (!r) { say(`“${name}” নামে রুটিন পাইনি। “রুটিন লিস্ট” বলে দেখো।`); return true; }
      runRoutine(r, auto); return true;
    }
    if (/রুটিন\s*(লিস্ট|তালিকা)|আমার\s*রুটিন/.test(text)) {
      const a = getRoutines();
      say(a.length ? a.map((r) => `• ${r.name}: ${r.steps.join(" → ")}`).join("\n") : "কোনো রুটিন নেই। যেমন: “রুটিন বানাও বাড়ি যাওয়া: ম্যাপস খোলো, ডিস্টার্ব করো না বন্ধ”।", true); return true;
    }
    m = text.match(/^রুটিন\s*(?:মুছো|মুছে\s*দাও)\s*(.+)$/);
    if (m) { const n = norm(m[1]); const a = getRoutines(); const b = a.filter((r) => norm(r.name) !== n); saveRoutines(b); say(b.length < a.length ? "রুটিন মুছলাম।" : "ওই নামে রুটিন পাইনি।"); return true; }
    { const r = getRoutines().find((x) => norm(x.name) === norm(text)); if (r && text.length >= 3) { runRoutine(r, false); return true; } }

    // খরচ
    const ex = parseExpense(text);
    if (ex && ex.amt > 0) { addExpense(ex); say(`${money(ex.amt)} খরচ লিখে রাখলাম${ex.note ? ` (${ex.note})` : ""}।`, true); return true; }
    m = text.match(/(আজকের|আজ|এই\s*সপ্তাহের|সাত\s*দিনের|এই\s*মাসের|মাসের)?\s*খরচ(?:ের)?\s*(?:কত|হিসাব|রিপোর্ট|দেখাও)/);
    if (m) {
      const range = /সপ্তাহ|সাত/.test(m[1] || "") ? "week" : /আজ/.test(m[1] || "") ? "day" : "month";
      const s = expSummary(range); const label = range === "day" ? "আজ" : range === "week" ? "গত ৭ দিনে" : "এই মাসে";
      if (!s.items.length) say(`${label} কোনো খরচ লেখা নেই।`);
      else say(`${label} মোট ${money(s.total)}।\n` + Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${k}: ${money(v)}`).join("\n"), true);
      return true;
    }

    // খোঁজা / স্মৃতি থেকে উত্তর
    m = text.match(/^(?:আমার\s*)?(নোটে|স্মৃতিতে|মেমোরিতে|পুরনো\s*চ্যাটে|পুরোনো\s*চ্যাটে|সব\s*জায়গায়)\s*(.+?)\s*(?:খুঁজো|খুঁজে\s*দাও|খুঁজে\s*দেখো|সার্চ\s*করো|কী\s*লিখেছি|কি\s*লিখেছি)\s*$/);
    if (m) {
      const where = m[1]; const src = /নোটে/.test(where) ? ["notes"] : /স্মৃতি|মেমোরি/.test(where) ? ["memories"] : /চ্যাট/.test(where) ? ["history"] : ["notes", "memories", "history", "exp"];
      const r = search(m[2], src, 4);
      say(r.hits.length ? `পেয়েছি:\n` + r.hits.map((h) => `• [${h.d.src}] ${h.d.text.slice(0, 160)}`).join("\n") : "কিছু খুঁজে পাইনি।", true); return true;
    }
    if (/^আমার\s+.{2,60}\s+(কী|কি|কত|কোথায়|কখন|কোনটা)\s*[?？]?$/.test(text)) {
      const r = search(text, ["memories", "notes"], 1);
      if (r.hits.length && r.hits[0].s >= r.need) { say(r.hits[0].d.text, true); return true; }
      return false; // মিল না পেলে সাধারণ AI উত্তর দেবে
    }

    // ডকুমেন্ট
    if (/(ডকুমেন্ট|কাগজ|বিল|ফর্ম|ছবির\s*লেখা|চিঠি).*(পড়ো|পড়ে\s*শোনাও|সারাংশ)|ছবি\s*থেকে\s*লেখা/.test(text)) { say("ক্যামেরা/গ্যালারি থেকে ছবি দাও।", false); pickDocument(); return true; }

    // ড্রাইভিং মোড
    m = text.match(/ড্রাইভিং\s*মোড\s*(চালু|অন|বন্ধ|অফ)/i);
    if (m) { await setDriving(/চালু|অন/i.test(m[1])); return true; }

    // লোকেশন
    m = text.match(/^(?:এই\s*জায়গা|এখানকার\s*লোকেশন|লোকেশন)\s*(?:সেভ|সংরক্ষণ)\s*করো\s*[:：-]?\s*(.+)$/);
    if (m) { await savePlace(m[1].trim()); return true; }
    m = text.match(/^(.+?)\s*(?:এ|তে|-এ|এর\s*কাছে)?\s*(?:পৌঁছালে|পৌঁছে|পৌছালে|পৌছে|পৌঁছাই)\s*(.+)$/);
    if (m) {
      const place = getPlaces().find((p) => norm(m[1]).includes(norm(p.name)));
      if (!place) return false; // সেভ করা জায়গা না মিললে সাধারণ কথা ধরে নিয়ে AI-কে দিই
      const a = getGeo(); a.push({ id: "g" + Date.now(), place: place.name, command: m[2].replace(/^(আমাকে|আমায়)\s*/, "").trim(), last: 0 }); writeJSON(K.geo, a.slice(0, 20));
      startWatch();
      say(`ঠিক আছে: ${place.name}-এ পৌঁছালে “${a[a.length - 1].command}” চালাব। মনে রেখো, এটা অ্যাপ খোলা থাকলেই কাজ করে।`, true); return true;
    }

    // লক / ব্যাকআপ / মেনু
    if (/অ্যাপ\s*লক\s*(চালু|সেট)/.test(text)) { say("এক্সট্রা মেনু → নিরাপত্তা থেকে PIN সেট করো।"); document.dispatchEvent(new CustomEvent("sanjuExtrasOpenPanel")); return true; }
    if (/(ব্যাকআপ|ডেটা\s*এক্সপোর্ট).*(নাও|করো|দাও|খোলো|দেখাও)/.test(text)) { say("এক্সট্রা মেনু → ব্যাকআপ থেকে কপি/ইমপোর্ট করো।"); document.dispatchEvent(new CustomEvent("sanjuExtrasOpenPanel")); return true; }
    if (/(এক্সট্রা\s*মেনু|এক্সট্রা\s*ফিচার)/.test(text)) { document.dispatchEvent(new CustomEvent("sanjuExtrasOpenPanel")); return true; }
    return false;
  }

  function hookBargeIn() {
    const stop = () => { try { if (app().stopSpeaking) app().stopSpeaking(); } catch (_) {} };
    window.addEventListener("sanjuWake", stop);
    const mic = document.getElementById("micBtn"); if (mic) mic.addEventListener("click", stop, true);
    const inp = document.getElementById("chatInput"); if (inp) inp.addEventListener("input", stop);
  }
  function init() {
    if (cfg().driving) setDriving(true);
    if (lockCfg().enabled) lockNow();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { window.__sanjuExtrasHiddenAt = Date.now(); return; }
      const g = (lockCfg().grace || 60) * 1000;
      if (lockCfg().enabled && window.__sanjuExtrasHiddenAt && Date.now() - window.__sanjuExtrasHiddenAt > g) lockNow();
    });
    hookBargeIn();
    setTimeout(startWatch, 1500);
    setTimeout(maybeAutoBrief, 6000);
  }

  window.SanjuExtras = {
    version: VERSION, intercept, isLocked, unlock, lockNow, setPin, removePin, lockEnabled: () => !!lockCfg().enabled,
    cfg, setCfg, getRoutines, saveRoutines, runRoutine, expSummary, getExp, getPlaces, getGeo,
    writeGeo: (a) => writeJSON(K.geo, a), startWatch, stopWatch, exportData, importData, brief, setDriving, pickDocument,
    _t: { parseExpense, search, toEn },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
