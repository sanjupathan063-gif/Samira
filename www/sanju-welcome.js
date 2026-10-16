/* ══════════════════════════════════════════════════════════════
   SANJU — স্বাগত + লাইভ খবর + ব্রিফ
   ১) অ্যাপ খুললেই সালাম দেয়, তারপর নিজে থেকে মাইক চালু করে।
   ২) তুমি উত্তর দিলে আজকের আবহাওয়া, শীর্ষ খবর আর ফোনে আসা মেসেজের হিসাব শোনায়।
   ৩) “আজকের নিউজ”, “জন্তর মন্তর নিয়ে খবর বলো” — Google News RSS থেকে সাম্প্রতিক শিরোনাম আনে।
   সীমা: খবর শুধু শিরোনাম + সোর্স; পুরো প্রতিবেদন নয়। মেসেজের সংখ্যা SMS ইনবক্স আর
   নোটিফিকেশন থেকে গোনা (অনুমতি দিলে), তাই আনুমানিক।
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const KEY = "sanju_welcome_cfg";
  const POSKEY = "sanju_welcome_pos";
  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const app = () => window.__sanjuApp || {};
  const S = () => (app().getSettings && app().getSettings()) || {};
  const plug = (n) => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]) || null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const cfg = () => { let o = {}; try { o = JSON.parse(lsGet(KEY) || "{}") || {}; } catch (_) {} return Object.assign({ on: true, mic: true, lastBrief: 0, smsAsked: false, smsNote: false }, o); };
  const setCfg = (p) => { const c = Object.assign(cfg(), p); lsSet(KEY, JSON.stringify(c)); return c; };
  const say = (t, speak) => { try { app().addMessage && app().addMessage("bot", t); if (speak) app().speak && app().speak(speak === true ? String(t).slice(0, 600) : speak); } catch (_) {} };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  /* ───────────── নেটওয়ার্ক (CORS এড়াতে Capacitor-এর নেটিভ HTTP) ───────────── */
  async function fetchText(url, ms) {
    ms = ms || 9000;
    const http = plug("CapacitorHttp");
    if (http && http.get) {
      const r = await withTimeout(http.get({ url, responseType: "text", connectTimeout: ms, readTimeout: ms, headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" } }), ms + 1500);
      if (r && r.status >= 200 && r.status < 300) return typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      throw new Error("http " + (r && r.status));
    }
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error("http " + r.status); return await r.text(); } finally { clearTimeout(to); }
  }

  /* ───────────── খবর (Google News RSS, বাংলা) ───────────── */
  function edition() {
    let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (_) {}
    const bd = { gl: "BD", ceid: "BD:bn" }, inn = { gl: "IN", ceid: "IN:bn" };
    return /Kolkata|Calcutta/.test(tz) ? { main: inn, alt: bd, tz } : { main: bd, alt: inn, tz };
  }
  const feedUrl = (topic, e, when) => topic
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(topic + (when ? " when:" + when : ""))}&hl=bn&gl=${e.gl}&ceid=${encodeURIComponent(e.ceid)}`
    : `https://news.google.com/rss?hl=bn&gl=${e.gl}&ceid=${encodeURIComponent(e.ceid)}`;
  const decode = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  function parseRss(xml) {
    const out = [];
    const items = String(xml || "").match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const it of items) {
      const g = (tag) => { const m = it.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return m ? decode(m[1]) : ""; };
      let title = g("title"); const source = g("source"); const link = g("link");
      if (!title) continue;
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
      else { const m = title.match(/^(.*\S)\s+-\s+([^-]{2,40})$/); if (m) title = m[1]; }
      const ts = Date.parse(g("pubDate")) || 0;
      out.push({ title: title.trim(), source: source || "", link, ts });
    }
    return out;
  }
  function dedupe(arr) {
    const seen = new Set(); const o = [];
    for (const x of arr) { const k = x.title.replace(/\s+/g, "").slice(0, 28); if (seen.has(k)) continue; seen.add(k); o.push(x); }
    return o;
  }
  async function getNews(topic, n) {
    const e = edition(); let items = [];
    const tryFeed = async (ed, when) => { try { items = items.concat(parseRss(await fetchText(feedUrl(topic, ed, when)))); } catch (_) {} };
    await tryFeed(e.main, topic ? "3d" : "");
    if (topic && items.length < 3) await tryFeed(e.alt, "3d");
    if (topic && items.length === 0) await tryFeed(e.main, "");
    items = dedupe(items);
    if (topic) items.sort((a, b) => b.ts - a.ts);
    return items.slice(0, n || 5);
  }
  const NEWS_STOP = new Set(["আজকের", "আজকে", "আজ", "লেটেস্ট", "latest", "সর্বশেষ", "নতুন", "এখন", "এখনকার", "কি", "কী", "কিকি", "কোনো", "কোন", "ভালো", "বল", "বলো", "বলে", "দাও", "দেখাও", "শোনাও", "পড়ো", "জানাও", "নিউজ", "news", "খবর", "খবরগুলো", "খবরটা", "খবরের", "সংবাদ", "হেডলাইন", "আছে", "যে", "হচ্ছে", "চলছে", "ওকে", "আচ্ছা", "তাহলে", "সম্পর্কে", "ব্যাপারে", "বিষয়ে", "নিয়ে", "নিয়েও", "সম্বন্ধে", "ওই", "এই", "ঐ", "সেটা", "বা", "এবং", "আর", "আমাকে", "আমায়", "তুমি", "সাঞ্জু", "সঞ্জু", "কিছু", "একটু", "একটা", "বস", "দিয়ে", "শুধু", "শুধুই", "টা", "টি", "সব", "সবকিছু"]);
  function newsTopic(text) {
    const toks = String(text).replace(/[?？।!,.]/g, " ").split(/\s+/).filter(Boolean).filter((w) => !NEWS_STOP.has(w.toLowerCase()));
    return toks.slice(0, 6).join(" ").trim();
  }
  function isNewsAsk(text) {
    const t = String(text).trim();
    if (!/(খবর|নিউজ|সংবাদ|হেডলাইন|\bnews\b)/i.test(t)) return false;
    if (t.length < 16 && /(কী|কি)\s*খবর/.test(t)) return false; // “কী খবর?” শুভেচ্ছা
    return /(আজকের|আজকে|লেটেস্ট|latest|সর্বশেষ|নতুন|বল|বলো|বলে|দাও|দেখাও|শোনাও|জানাও|আছে|নিয়ে|সম্পর্কে|ব্যাপারে|বিষয়ে|হচ্ছে|কী\s*কী|কি\s*কি)/i.test(t);
  }
  let lastNews = [];
  async function doNews(text) {
    const topic = newsTopic(text);
    say(topic ? `“${topic}” নিয়ে খবর খুঁজছি…` : "শীর্ষ খবর আনছি…");
    const items = await getNews(topic, 5);
    lastNews = items;
    if (!items.length) {
      say(topic ? `“${topic}” নিয়ে সাম্প্রতিক কোনো খবর পাইনি। অন্যভাবে লিখে বলো।` : "খবর আনতে পারলাম না — ইন্টারনেট বা নিউজ সোর্সে সমস্যা হতে পারে। একটু পরে আবার বলো।");
      return;
    }
    const lines = items.map((x, i) => `${bn(i + 1)}. ${x.title}${x.source ? " (" + x.source + ")" : ""}`).join("\n");
    const shown = (topic ? `“${topic}” নিয়ে সাম্প্রতিক খবর:` : "আজকের শীর্ষ খবর:") + "\n" + lines + "\n\nবিস্তারিত পড়তে বলো: “খবর ১ খোলো”। (এগুলো শুধু শিরোনাম)";
    say(shown, (topic ? topic + " নিয়ে খবর। " : "আজকের শীর্ষ খবর। ") + items.slice(0, 3).map((x) => x.title).join("। ") + "।");
  }
  async function openNews(n) {
    const it = lastNews[n - 1];
    if (!it || !it.link) { say("আগে “আজকের নিউজ” বলো, তারপর নম্বর দিয়ে খুলতে বলো।"); return; }
    try { const ph = plug("PhoneControl"); if (ph && ph.openUrl) await ph.openUrl({ url: it.link }); else window.open(it.link, "_blank"); say(`খবর ${bn(n)} ব্রাউজারে খুলছি।`, false); }
    catch (_) { say("লিংক খুলতে পারলাম না।"); }
  }

  /* ───────────── আবহাওয়া (Open-Meteo, key লাগে না) ───────────── */
  const WCODE = (c) => c === 0 ? "আকাশ পরিষ্কার" : c <= 3 ? "আংশিক মেঘলা" : c <= 48 ? "কুয়াশাচ্ছন্ন" : c <= 67 ? "বৃষ্টি" : c <= 77 ? "তুষারপাত" : c <= 82 ? "বৃষ্টির ঝাপটা" : "বজ্রসহ বৃষ্টি";
  function position() {
    return new Promise((res) => {
      let cached = null; try { cached = JSON.parse(lsGet(POSKEY) || "null"); } catch (_) {}
      if (!navigator.geolocation) return res(cached);
      navigator.geolocation.getCurrentPosition(
        (p) => { const v = { lat: p.coords.latitude, lon: p.coords.longitude, exact: true }; lsSet(POSKEY, JSON.stringify(v)); res(v); },
        () => res(cached), { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 });
    });
  }
  async function weather() {
    let pos = await position(); let approx = false;
    if (!pos) { const e = edition(); pos = /Kolkata|Calcutta/.test(e.tz) ? { lat: 22.57, lon: 88.36 } : { lat: 23.81, lon: 90.41 }; approx = true; }
    try {
      const r = await withTimeout(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`), 8000);
      const j = await r.json(); const cur = j.current || {}; const d = j.daily || {};
      return `আজকের আবহাওয়া${approx ? " (আনুমানিক এলাকা)" : ""}: ${WCODE(cur.weather_code)}, এখন ${bn(Math.round(cur.temperature_2m))} ডিগ্রি। আজ ${bn(Math.round(d.temperature_2m_min[0]))} থেকে ${bn(Math.round(d.temperature_2m_max[0]))} ডিগ্রি, বৃষ্টির সম্ভাবনা ${bn(d.precipitation_probability_max[0])}%।`;
    } catch (_) { return "আবহাওয়া আনতে পারলাম না।"; }
  }

  /* ───────────── মেসেজের হিসাব ───────────── */
  const CHAT = { "com.facebook.orca": "Messenger", "com.facebook.mlite": "Messenger", "com.instagram.android": "Instagram", "com.facebook.katana": "Facebook", "com.whatsapp": "WhatsApp", "com.whatsapp.w4b": "WhatsApp", "org.telegram.messenger": "Telegram", "com.google.android.apps.messaging": "মেসেজ অ্যাপ", "com.samsung.android.messaging": "মেসেজ অ্যাপ" };
  const NOISY = new Set(["com.instagram.android", "com.facebook.katana"]); // লাইক/কমেন্টের নোটিফিকেশনও আসে
  async function chatCounts(since) {
    const counts = {}; let ok = false;
    const add = (pkg) => { const n = CHAT[pkg]; if (n) counts[n] = (counts[n] || 0) + 1; };
    try {
      const MH = plug("MessageHistory");
      if (MH) {
        const st = await MH.status();
        if (st.enabled && st.access) {
          const r = await MH.list({ limit: 500 });
          (r.items || []).forEach((m) => { if (m.ts >= since && CHAT[m.pkg] && (!NOISY.has(m.pkg) || m.isMsg)) add(m.pkg); });
          ok = true;
        }
      }
    } catch (_) {}
    if (!ok) {
      try {
        const NA = plug("NotificationAccess");
        if (NA) {
          const st = await NA.status();
          if (st.enabled) {
            const r = await NA.recent();
            (r.items || []).forEach((x) => { if (!x.ongoing && x.timestamp >= since) add(x.package); });
            ok = true;
          }
        }
      } catch (_) {}
    }
    return { ok, counts };
  }
  async function messageSummary() {
    const c = cfg(); const now = Date.now();
    let since = c.lastBrief && now - c.lastBrief < 48 * 3600000 ? c.lastBrief : now - 24 * 3600000;
    const label = since === c.lastBrief ? "শেষ ব্রিফের পর" : "গত ২৪ ঘণ্টায়";
    const parts = []; const notes = [];
    let total = 0;
    const SMS = plug("SmsSummary");
    if (SMS) {
      const allowPrompt = !c.smsAsked;
      if (allowPrompt) setCfg({ smsAsked: true });
      try {
        const r = await SMS.unread({ since, noPrompt: !allowPrompt });
        if (r && r.granted) {
          total += r.recent || 0;
          const named = (r.top || []).filter((x) => /[A-Za-z\u0980-\u09FF]/.test(x.address)).slice(0, 2).map((x) => `${x.address} থেকে ${bn(x.count)}টি`);
          parts.push(`SMS: ${label} ${bn(r.recent || 0)}টি এসেছে, মোট অপঠিত ${bn(r.unread || 0)}টি${named.length ? " (" + named.join(", ") + ")" : ""}`);
        } else if (!cfg().smsNote) { setCfg({ smsNote: true }); notes.push("SMS গুনতে অনুমতি লাগবে — ফোনের সেটিংসে SANJU-কে SMS পারমিশন দাও।"); }
      } catch (_) {}
    }
    const ch = await chatCounts(since);
    if (ch.ok) {
      const names = Object.keys(ch.counts);
      names.forEach((n) => { total += ch.counts[n]; });
      if (names.length) parts.push(`চ্যাট (নোটিফিকেশন অনুযায়ী): ${names.map((n) => `${n} ${bn(ch.counts[n])}টি`).join(", ")}`);
    } else notes.push("Messenger/WhatsApp-এর মেসেজ গুনতে নোটিফিকেশন অ্যাক্সেস লাগবে — মেসেজ হিস্টরি থেকে “অ্যাক্সেস দাও”।");
    let line;
    if (parts.length) line = "মেসেজ — " + parts.join("। ") + "।";
    else line = "নতুন কোনো মেসেজ পাইনি।";
    if (!parts.length && !notes.length) line = "নতুন কোনো মেসেজ নেই।";
    return { line, notes, total };
  }

  /* ───────────── পুরো ব্রিফ ───────────── */
  let briefBusy = false;
  async function fullBrief() {
    if (briefBusy) return; briefBusy = true;
    try {
      const name = S().userName || "বস";
      say(`ঠিক আছে ${name}, সব জোগাড় করছি…`);
      const [w, m, n] = await Promise.all([weather().catch(() => ""), messageSummary().catch(() => ({ line: "", notes: [] })), getNews("", 5).catch(() => [])]);
      lastNews = n;
      const newsLines = n.length ? n.map((x, i) => `${bn(i + 1)}. ${x.title}${x.source ? " (" + x.source + ")" : ""}`).join("\n") : "খবর আনতে পারলাম না (ইন্টারনেট/সোর্স সমস্যা)।";
      const shown = [w, m.line, ...(m.notes || []), "আজকের শীর্ষ খবর:\n" + newsLines].filter(Boolean).join("\n\n");
      const spoken = [w, m.line, n.length ? "আজকের শীর্ষ খবর। " + n.slice(0, 3).map((x) => x.title).join("। ") + "।" : "খবর আনতে পারিনি।"].filter(Boolean).join(" ");
      say(shown, spoken);
      setCfg({ lastBrief: Date.now() });
    } finally { briefBusy = false; }
  }

  /* ───────────── স্বাগত: সালাম → মাইক → উত্তর → ব্রিফ ───────────── */
  let pending = null; let cancelled = false; let started = false;
  async function waitSpeechEnd() {
    const a = app();
    if (!a.isSpeaking) { await sleep(4000); return; }
    const t0 = Date.now();
    while (Date.now() - t0 < 7000 && !a.isSpeaking()) await sleep(150);
    let quiet = 0; const t1 = Date.now();
    while (Date.now() - t1 < 30000) { if (a.isSpeaking()) quiet = 0; else if (++quiet >= 3) break; await sleep(250); }
  }
  async function runWelcome() {
    const c = cfg(); if (!c.on || cancelled || started) return;
    started = true;
    const name = S().userName || "বস";
    const text = `আসসালামু আলাইকুম ${name}! কেমন আছো? বলো, আজকের আবহাওয়া, খবর আর তোমার মেসেজের হিসাব শুনবে?`;
    pending = { t: Date.now() };
    say(text, text);
    if (!c.mic) return;
    await waitSpeechEnd();
    if (!pending || cancelled) return;
    await sleep(300);
    try { if (app().startListening) await app().startListening(); } catch (_) {}
    if (pending && Date.now() - pending.t < 120000) say("শুনতে পাইনি। মাইক চেপে বলো বা লিখে দাও — “হ্যাঁ” বললেই আবহাওয়া, খবর আর মেসেজের হিসাব শোনাব।");
  }
  const isLocked = () => !!(window.SanjuExtras && window.SanjuExtras.isLocked && window.SanjuExtras.isLocked());

  /* ───────────── কমান্ড ধরা (handleUserInput-এর একদম শুরুতে) ───────────── */
  async function intercept(raw) {
    const text = String(raw || "").trim(); if (!text) return false;
    if (isLocked()) return false;
    let m = text.match(/(স্বাগত|ওয়েলকাম|সালাম)\s*(?:মোড)?\s*(চালু|অন|বন্ধ|অফ)/);
    if (m) { const on = /(চালু|অন)/.test(m[2]); setCfg({ on }); say(on ? "ঠিক আছে, অ্যাপ খুললে সালাম দিয়ে শুরু করব।" : "ঠিক আছে, এখন থেকে অ্যাপ খুললে সালাম দেব না।"); return true; }
    m = text.match(/(অটো\s*মাইক|স্বাগতের?\s*মাইক)\s*(চালু|অন|বন্ধ|অফ)/);
    if (m) { const on = /(চালু|অন)/.test(m[2]); setCfg({ mic: on }); say(on ? "অ্যাপ খুললে মাইক নিজে চালু হবে।" : "অ্যাপ খুললে মাইক আর নিজে চালু হবে না।"); return true; }
    m = text.match(/^(?:খবর|নিউজ)\s*([১-৯1-9])\s*(?:নম্বর|নং|টা)?\s*(?:খোলো|দেখাও|পড়ো|ওপেন)/);
    if (m) { pending = null; await openNews(parseInt(String(m[1]).replace(/[১-৯]/g, (d) => BN.indexOf(d)), 10)); return true; }
    if (/(ডেইলি\s*ব্রিফ|আজকের\s*ব্রিফ|সকালের\s*ব্রিফ|ব্রিফিং|আজকের\s*দিনটা\s*কেমন|আজকের\s*আপডেট)/.test(text)) { pending = null; await fullBrief(); return true; }
    if (isNewsAsk(text)) { pending = null; await doNews(text); return true; }
    if (pending) {
      if (Date.now() - pending.t > 120000) { pending = null; return false; }
      if (/^(না|নাহ|থাক|পরে|এখন\s*না|দরকার\s*নেই|বাদ\s*দাও|no)(\s|$|।)/i.test(text)) { pending = null; say("ঠিক আছে, দরকার হলে বলো।", "ঠিক আছে, দরকার হলে বলো।"); return true; }
      if (/(খোলো|খুলো|চালু|বন্ধ|কল|বাজাও|সময়|নোট|রিমাইন্ডার|পাঠাও|সার্চ|ইউটিউব|ডিলিট|মুছ|আবহাওয়া|টাইমার|অ্যালার্ম|ছবি|ক্যামেরা)/.test(text)) { pending = null; return false; }
      pending = null; await fullBrief(); return true;
    }
    return false;
  }

  function init() {
    if (window.SanjuExtras) window.SanjuExtras.brief = fullBrief; // এক্সট্রা প্যানেলের “এখন শোনাও” এখন পুরো ব্রিফ চালায়
    window.addEventListener("sanjuWake", () => { cancelled = true; pending = null; }); // ওয়েক-ওয়ার্ডে খুললে সালাম নয়
    setTimeout(() => {
      if (cancelled) return;
      if (isLocked()) { document.addEventListener("sanjuExtrasLock", (e) => { if (e.detail && !e.detail.locked) setTimeout(runWelcome, 900); }); return; }
      runWelcome();
    }, 2200);
  }

  window.SanjuWelcome = { intercept, fullBrief, runWelcome, getNews, cfg, setCfg, _t: { parseRss, newsTopic, isNewsAsk, dedupe } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
