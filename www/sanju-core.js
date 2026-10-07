/* ══════════════════════════════════════════════════════════════
   SANJU CORE v3.4
   1) Self-Heal  : ভুল ধরে নিজে ঠিক করে (সেটিংস, নষ্ট ডেটা, wake word, টুনটুন)
   2) Controls   : টুনটুন বন্ধ / Wake / Self-Heal / এজেন্ট বাটন
   3) Persona    : আধা-মানুষ আধা-সাইবার 3D মুখ (tilt + চোখ)
   4) One Agent  : একটাই এজেন্ট — কাজ বুঝে ভেতরের সঠিক মডিউল বেছে নেয়
   নিরাপত্তা: এখানে কোনো AI-জেনারেটেড কোড চালানো হয় না; শুধু অনুমোদিত সেটিংস/ডেটা মেরামত।
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const A = () => window.__sanjuApp || null;
  const S = () => (A() && A().getSettings && A().getSettings()) || {};
  const WW = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WakeWord) || null;
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  const ERR_KEY = "sanju_error_log";
  const HEAL_KEY = "sanju_heal_log";
  const now = () => Date.now();

  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function readArr(k) { try { const v = JSON.parse(lsGet(k) || "[]"); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
  function pushLog(k, item, max) { const a = readArr(k); a.unshift(item); lsSet(k, JSON.stringify(a.slice(0, max))); }
  function say(text) { try { if (A()) A().addMessage("bot", text, { skipHistory: true }); } catch (_) {} }

  /* ───────────── 1) Error log (সবার আগে চালু হয়) ───────────── */
  let errBurst = [];
  function logError(msg, where) {
    pushLog(ERR_KEY, { t: now(), msg: String(msg || "").slice(0, 220), where: String(where || "") }, 40);
    errBurst = errBurst.filter((t) => now() - t < 60000);
    errBurst.push(now());
    if (errBurst.length >= 5 && S().autoHeal !== false) { errBurst = []; setTimeout(() => runHeal("error-storm"), 300); }
  }
  window.addEventListener("error", (e) => logError(e.message, (String(e.filename || "").split("/").pop() || "") + ":" + (e.lineno || "")));
  window.addEventListener("unhandledrejection", (e) => logError("Promise: " + ((e.reason && e.reason.message) || e.reason), ""));

  /* ───────────── 2) Self-Heal engine ───────────── */
  const STORES = [
    ["sanju_settings", "object", {}],
    ["sanju_history", "array", []],
    ["sanju_notes", "array", []],
    ["sanju_memories", "array", []],
    ["sanju_agent_history", "array", []],
    ["sanju_agent_learning", "object", { content: [], code: [], research: [], support: [] }],
    ["sanju_dynamic_skills_v1", "array", null],
  ];

  function checkStorage(report) {
    STORES.forEach(([key, type, def]) => {
      const raw = lsGet(key);
      if (raw == null) return;
      let ok = false, v;
      try { v = JSON.parse(raw); ok = type === "array" ? Array.isArray(v) : !!(v && typeof v === "object" && !Array.isArray(v)); } catch (_) {}
      if (!ok) {
        lsSet("sanju_backup_" + key, String(raw).slice(0, 200000));
        if (def === null) { try { localStorage.removeItem(key); } catch (_) {} } else lsSet(key, JSON.stringify(def));
        report.push({ id: "store:" + key, label: "ডেটা: " + key, ok: true, fixed: true, detail: "নষ্ট ডেটা ব্যাকআপ রেখে রিসেট করেছি" });
      } else if (key === "sanju_history" && v.length > 300) {
        lsSet(key, JSON.stringify(v.slice(-80)));
        report.push({ id: "store:" + key, label: "চ্যাট ইতিহাস", ok: true, fixed: true, detail: "অতিরিক্ত বড় ইতিহাস ছোট করেছি (ধীর হওয়া ঠেকাতে)" });
      }
    });
  }

  function checkSettings(report) {
    const s = S();
    if (!s || typeof s !== "object" || !A()) return;
    const changed = [];
    if (typeof s.apiKey === "string") {
      const t = s.apiKey.replace(/^["'\s]+|["'\s]+$/g, "");
      if (t !== s.apiKey) { s.apiKey = t; changed.push("API key-এর বাড়তি স্পেস/কোটেশন"); }
    }
    if (!s.model || typeof s.model !== "string" || !s.model.trim()) { s.model = "openai/gpt-oss-20b"; changed.push("খালি মডেল নাম"); }
    if (!s.wakePhrase || !String(s.wakePhrase).trim()) { s.wakePhrase = "Hey Sanju"; changed.push("খালি wake phrase"); }
    if (changed.length) {
      A().saveSettings();
      report.push({ id: "settings", label: "সেটিংস", ok: true, fixed: true, detail: "ঠিক করেছি: " + changed.join(", ") });
    }
    if (!s.apiKey) report.push({ id: "key", label: "Groq API key", ok: false, detail: "বসানো নেই — ⚙️ সেটিংসে বসাও, নইলে উত্তর আসবে না" });
    else if (!/^gsk_/.test(s.apiKey)) report.push({ id: "key", label: "Groq API key", ok: false, detail: "সাধারণত gsk_ দিয়ে শুরু হয় — ঠিকভাবে কপি হয়েছে কিনা দেখো" });
  }

  async function disableWake(why) {
    const s = S();
    s.wakeEnabled = false;
    try { A().saveSettings(); } catch (_) {}
    try { const w = WW(); if (w) await w.stop(); } catch (_) {}
    syncUI();
    say("🩺 Wake Word বন্ধ করলাম (" + why + ")। এখন মাইক বাটন চেপে কথা বলো; ঠিক হলে Wake বাটন দিয়ে আবার চালু করো।");
  }

  async function checkWake(report) {
    const s = S(), w = WW();
    if (!A()) return;
    if (!w) { report.push({ id: "wake", label: "Wake Word", ok: true, detail: "ব্রাউজার মোড — native wake নেই" }); return; }
    if (!s.wakeEnabled) { report.push({ id: "wake", label: "Wake Word", ok: true, detail: "বন্ধ আছে — টুনটুন হবে না" }); return; }
    let st;
    try { st = await w.status(); } catch (e) { report.push({ id: "wake", label: "Wake Word", ok: false, detail: "status পড়া যায়নি: " + ((e && e.message) || e) }); return; }
    const fixes = [];

    if (st.lastError === 9 || st.lastError === -3) {
      let granted = false;
      try { const r = await w.requestPermission(); granted = !!(r && r.granted); if (granted) { await w.start(A().wakeOpts()); fixes.push("মাইক পারমিশন নিয়ে আবার চালু করেছি"); } } catch (_) {}
      if (!granted) { await disableWake("মাইক পারমিশন নেই"); report.push({ id: "wake", label: "Wake Word", ok: false, fixed: true, detail: "মাইক পারমিশন নেই — বন্ধ করেছি" }); return; }
    } else if (st.lastError === -1) {
      await disableWake("এই ফোনে speech recognition সার্ভিস নেই");
      report.push({ id: "wake", label: "Wake Word", ok: false, fixed: true, detail: "speech সার্ভিস নেই — বন্ধ করেছি" });
      return;
    } else if (!st.running) {
      try { await w.start(A().wakeOpts()); fixes.push("সার্ভিস বন্ধ হয়ে গিয়েছিল — আবার চালু করেছি"); } catch (_) {}
    }

    if (st.failures >= 8) {
      await disableWake("বারবার ব্যর্থ, mode " + st.strategy + ", error " + st.lastError);
      report.push({ id: "wake", label: "Wake Word", ok: false, fixed: true, detail: "বারবার ব্যর্থ — বন্ধ করেছি" });
      return;
    }
    if (st.restartsPerMin >= 20 && !st.slow) {
      s.wakeSlow = true; A().saveSettings();
      try { await w.configure({ silent: true, slow: true }); fixes.push("টুনটুন কমাতে slow mode চালু করেছি"); } catch (_) {}
    }
    if (s.beepOff !== false && st.silent === false) {
      try { await w.configure({ silent: true, slow: !!s.wakeSlow }); fixes.push("বিপ mute আবার চালু করেছি"); } catch (_) {}
    }

    let detail = "running=" + st.running + " · mode=" + (st.strategy || "-") + " · lastError=" + st.lastError + " · restarts/min=" + st.restartsPerMin + " · শুনেছে: " + (st.lastHeard || "-");
    if ((st.lastError === 7 || st.lastError === 6) && st.restarts > 30 && !st.lastHeard) {
      detail += " — শব্দ ধরতে পারছে না: ফোনের 'Speech Services by Google' আপডেট করো ও বাংলা ভাষা ডাউনলোড করো; ততক্ষণ মাইক বাটন ব্যবহার করো";
    }
    if (fixes.length) detail += " | ঠিক করেছি: " + fixes.join(", ");
    report.push({ id: "wake", label: "Wake Word", ok: st.failures < 3, fixed: fixes.length > 0, detail });
  }

  function checkPlatform(report) {
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (window.Capacitor) {
      const miss = ["VoiceInput", "WakeWord", "PhoneControl", "SanjuScheduler"].filter((n) => !P[n]);
      report.push({ id: "native", label: "Native plugin", ok: miss.length === 0, detail: miss.length ? "পাওয়া যায়নি: " + miss.join(", ") + " — নতুন APK build করে ইনস্টল করো" : "সব plugin আছে" });
    }
    report.push({ id: "net", label: "Network", ok: navigator.onLine, detail: navigator.onLine ? "অনলাইন" : "অফলাইন — AI উত্তর আসবে না, লোকাল ফিচার চলবে" });
  }

  let healing = false, lastReport = null;
  async function runHeal(reason) {
    if (healing) return lastReport;
    healing = true; setBusy(true);
    const report = [];
    try { checkStorage(report); checkSettings(report); await checkWake(report); checkPlatform(report); }
    catch (e) { report.push({ id: "heal", label: "Self-Heal", ok: false, detail: String((e && e.message) || e) }); }
    healing = false; setBusy(false);
    lastReport = { t: now(), reason, report };
    const fixed = report.filter((r) => r.fixed);
    if (fixed.length) pushLog(HEAL_KEY, { t: now(), reason, fixed: fixed.map((r) => r.label + ": " + r.detail).slice(0, 6) }, 30);
    updateChips(); renderHealBlock();
    return lastReport;
  }

  async function aiAnalyze() {
    const s = S();
    if (!s.apiKey) return "API key নেই — আগে ⚙️ সেটিংসে Groq key বসাও।";
    if (!navigator.onLine) return "অফলাইন — ইন্টারনেট চালু করে আবার চেষ্টা করো।";
    const errs = readArr(ERR_KEY).slice(0, 10).map((e) => e.msg + " @" + e.where);
    const rep = (lastReport ? lastReport.report : []).map((r) => (r.ok ? "OK " : "BAD ") + r.label + ": " + r.detail);
    const body = {
      model: s.model || "openai/gpt-oss-20b",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are the self-diagnosis module of SANJU, an Android voice assistant. In simple Bengali, explain the most likely cause and give at most 5 short safe steps that use only the app's own settings (wake word on/off, beep mute, slow mode, API key, microphone permission, language, reinstall APK). Never output code to run." },
        { role: "user", content: "Health report:\n" + rep.join("\n") + "\n\nRecent JS errors:\n" + (errs.join("\n") || "none") },
      ],
    };
    try {
      const r = await fetch(GROQ_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.apiKey }, body: JSON.stringify(body) });
      if (!r.ok) return "AI বিশ্লেষণ ব্যর্থ (HTTP " + r.status + ")। API key/মডেল নাম ঠিক আছে কিনা দেখো।";
      const j = await r.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "কোনো উত্তর আসেনি।";
    } catch (e) { return "AI বিশ্লেষণ ব্যর্থ: " + ((e && e.message) || e); }
  }

  /* ───────────── Self Upgrade মডালে Self-Heal প্যানেল ───────────── */
  function renderHealBlock() {
    const list = $("diagnosticList");
    if (!list) return;
    let box = $("healBlock");
    if (!box) {
      box = document.createElement("div");
      box.id = "healBlock"; box.className = "heal-block";
      list.insertAdjacentElement("afterend", box);
      box.addEventListener("click", async (ev) => {
        const b = ev.target.closest("button"); if (!b) return;
        if (b.id === "healNowBtn") { await runHeal("manual"); }
        if (b.id === "healAiBtn") { const out = $("healAiOut"); if (out) out.textContent = "বিশ্লেষণ করছি…"; const t = await aiAnalyze(); const o2 = $("healAiOut"); if (o2) o2.textContent = t; }
        if (b.id === "healClearBtn") { lsSet(ERR_KEY, "[]"); lsSet(HEAL_KEY, "[]"); renderHealBlock(); }
      });
    }
    const rows = (lastReport ? lastReport.report : []).map((r) => {
      const cls = r.fixed ? "heal-fix" : r.ok ? "heal-ok" : "heal-bad";
      const tag = r.fixed ? "ঠিক করা হয়েছে" : r.ok ? "OK" : "CHECK";
      return `<div class="heal-row"><div><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></div><span class="${cls}">${tag}</span></div>`;
    }).join("") || '<div class="heal-row"><small>এখনো স্ক্যান হয়নি — “এখনই ঠিক করো” চাপো।</small></div>';
    const errs = readArr(ERR_KEY);
    const errHtml = errs.length ? `<div class="heal-row"><div><strong>সাম্প্রতিক ত্রুটি (${errs.length})</strong><small>${esc(errs.slice(0, 3).map((e) => e.msg).join(" • "))}</small></div></div>` : "";
    const prevAi = ($("healAiOut") && $("healAiOut").textContent) || "";
    box.innerHTML = `<h3>🩺 Self-Heal (নিজে ঠিক করা)</h3>
      <div class="heal-actions"><button id="healNowBtn">🔧 এখনই ঠিক করো</button><button id="healAiBtn">🧠 AI দিয়ে বিশ্লেষণ</button><button id="healClearBtn">🧹 লগ মুছো</button></div>
      ${rows}${errHtml}<div class="heal-ai" id="healAiOut">${esc(prevAi)}</div>`;
  }

  /* ───────────── 3) কন্ট্রোল বাটন ও chips ───────────── */
  function setBusy(on) { const b = $("healQuickBtn"); if (b) b.classList.toggle("busy", !!on); }

  function syncUI() {
    const s = S();
    const silent = s.beepOff !== false;
    const bb = $("beepToggleBtn"), bl = $("beepToggleLabel");
    if (bb) { bb.classList.toggle("on", silent); bb.classList.toggle("warn", !silent); const ic = bb.querySelector("span"); if (ic) ic.textContent = silent ? "🔇" : "🔔"; }
    if (bl) bl.textContent = silent ? "টুনটুন বন্ধ" : "টুনটুন চালু";
    const wb = $("wakeQuickBtn"), wl = $("wakeQuickLabel");
    if (wb) wb.classList.toggle("on", !!s.wakeEnabled);
    if (wl) wl.textContent = s.wakeEnabled ? "Wake চালু" : "Wake বন্ধ";
    const ws = $("wakeState"); if (ws) ws.textContent = s.wakeEnabled ? "চালু" : "বন্ধ";
    const wc = $("wakeEnabledInput"); if (wc) wc.checked = !!s.wakeEnabled;
    updateChips();
  }

  function updateChips() {
    const s = S();
    const c1 = $("chipCore"), c2 = $("chipWake"), c3 = $("chipAgents");
    if (c1) c1.textContent = navigator.onLine ? (s.apiKey ? "CORE ONLINE" : "CORE · KEY নেই") : "CORE OFFLINE";
    if (c2) c2.textContent = "WAKE · " + (s.wakeEnabled ? "চালু" : "বন্ধ");
    const AG = window.__sanjuAgents;
    if (c3) c3.textContent = "সব এজেন্ট → ১" + (AG ? " · " + Object.keys(AG.SYSTEMS).length + " মডিউল" : "");
  }

  function bindControls() {
    const bb = $("beepToggleBtn");
    if (bb) bb.addEventListener("click", async () => {
      const s = S(); s.beepOff = !(s.beepOff !== false);
      try { A().saveSettings(); } catch (_) {}
      try { const w = WW(); if (w && w.configure) await w.configure({ silent: s.beepOff !== false, slow: !!s.wakeSlow }); } catch (_) {}
      const bi = $("beepOffInput"); if (bi) bi.checked = s.beepOff !== false;
      syncUI();
    });
    const wb = $("wakeQuickBtn");
    if (wb) wb.addEventListener("click", async () => {
      const s = S(); const next = !s.wakeEnabled;
      try { await A().setWakeEnabled(next); } catch (_) {}
      syncUI();
    });
    const hb = $("healQuickBtn");
    if (hb) hb.addEventListener("click", async () => {
      const r = await runHeal("manual");
      const fixed = r.report.filter((x) => x.fixed), bad = r.report.filter((x) => !x.ok);
      let msg = "🩺 Self-Heal শেষ — " + fixed.length + "টি ঠিক করেছি, " + bad.length + "টি সমস্যা বাকি।";
      fixed.slice(0, 4).forEach((x) => { msg += "\n✅ " + x.label + ": " + x.detail; });
      bad.slice(0, 4).forEach((x) => { msg += "\n⚠️ " + x.label + ": " + x.detail; });
      if (!fixed.length && !bad.length) msg += "\nসব ঠিক আছে।";
      say(msg);
    });
    const ab = $("agentQuickBtn");
    if (ab) ab.addEventListener("click", () => { if (window.__sanjuAgents) window.__sanjuAgents.open(); });
    window.addEventListener("sanjuSettingsChanged", syncUI);
    window.addEventListener("online", updateChips);
    window.addEventListener("offline", updateChips);

    const modal = $("selfUpgradeModal");
    if (modal) new MutationObserver(() => { if (modal.classList.contains("open")) { renderHealBlock(); if (!lastReport) runHeal("modal"); } }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  /* ───────────── 4) Persona 3D (tilt + চোখ) ───────────── */
  function initPersona() {
    const stage = $("personaStage"), rig = $("personaRig"), p = $("orb");
    if (!stage || !rig || !p) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, lastPtr = 0, lastOri = 0;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    function fromPointer(e) {
      const r = stage.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) / (Math.max(r.width, 260) / 1.3));
      ty = clamp((e.clientY - (r.top + r.height * 0.4)) / (Math.max(r.height, 300) / 1.3));
      lastPtr = now();
    }
    window.addEventListener("pointermove", fromPointer, { passive: true });
    window.addEventListener("pointerdown", fromPointer, { passive: true });
    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null || now() - lastPtr < 2500) return;
      tx = clamp((e.gamma || 0) / 30); ty = clamp(((e.beta || 45) - 45) / 30); lastOri = now();
    }, { passive: true });
    (function loop() {
      if (now() - lastPtr > 2500 && now() - lastOri > 1200) { tx *= 0.94; ty *= 0.94; }
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      rig.style.setProperty("--ry", (cx * 16).toFixed(2) + "deg");
      rig.style.setProperty("--rx", (-cy * 11).toFixed(2) + "deg");
      p.style.setProperty("--ix", (cx * 3.2).toFixed(2) + "px");
      p.style.setProperty("--iy", (cy * 2.4).toFixed(2) + "px");
      requestAnimationFrame(loop);
    })();
  }

  /* ───────────── 5) একটাই এজেন্ট — ভেতরে সব মডিউল ───────────── */
  const ROUTES = [
    ["factcheck", /(ফ্যাক্ট|fact.?check|সত্যি কিনা|সত্যতা|যাচাই)/i],
    ["security", /(পাসওয়ার্ড|password|security|সিকিউরিটি|নিরাপত্তা|vault|encrypt|ভল্ট)/i],
    ["support", /(গ্রাহক|customer|অভিযোগ|complaint|refund|রিফান্ড|অর্ডার|order|সাপোর্ট|support)/i],
    ["code", /(কোড|code|bug|debug|ভুল ঠিক|error|function|python|javascript|java\b|html|css|কম্পাইল)/i],
    ["content", /(ব্লগ|blog|পোস্ট|post|কন্টেন্ট|content|ক্যাপশন|caption|script|স্ক্রিপ্ট|linkedin|facebook|article|আর্টিকেল|লিখে দাও|লিখো)/i],
    ["research", /(রিপোর্ট|report|গবেষণা|research|বিশ্লেষণ|বাজার|market|study|তুলনা)/i],
    ["language", /(অনুবাদ|translate|ব্যাকরণ|grammar|বানান|ইংরেজিতে|বাংলায় করো)/i],
    ["data", /(ডেটা|data|chart|চার্ট|হিসাব|calculate|excel|sheet|সংখ্যা)/i],
    ["vision", /(ছবি|image|camera|ক্যামেরা|vision|স্ক্রিন|photo)/i],
    ["files", /(ফাইল|file|pdf|ডকুমেন্ট|document|csv)/i],
    ["automation", /(অটোমেশন|automation|routine|schedule|রিমাইন্ডার|reminder|প্রতিদিন)/i],
    ["phone", /(কল করো|call|sms|এসএমএস|ফোন|volume|torch|flashlight|টর্চ|wifi|bluetooth|battery|ব্যাটারি|খোলো|open)/i],
    ["system", /(সিস্টেম|system|diagnos|status|স্ট্যাটাস)/i],
  ];

  function routeTask(text) {
    const AG = window.__sanjuAgents;
    const keys = AG ? Object.keys(AG.SYSTEMS) : [];
    let best = "master", bestN = 0;
    ROUTES.forEach(([k, re]) => {
      if (!keys.includes(k)) return;
      const m = String(text).match(new RegExp(re.source, "gi"));
      const n = m ? m.length : 0;
      if (n > bestN) { best = k; bestN = n; }
    });
    return keys.includes(best) ? best : keys[0];
  }

  const shortName = (n) => String(n || "").split(/&| and /)[0].trim();

  function renderModules() {
    const box = $("uaModules"), AG = window.__sanjuAgents;
    if (!box || !AG) return;
    const keys = Object.keys(AG.SYSTEMS);
    const cnt = $("uaCount"); if (cnt) cnt.textContent = "(" + keys.length + "টি)";
    box.innerHTML = keys.map((k) => `<button class="ua-mod" data-k="${k}" type="button"><span>${esc(AG.SYSTEMS[k].icon)}</span><b>${esc(shortName(AG.SYSTEMS[k].name))}</b></button>`).join("");
  }

  async function runUnified(forcedKey) {
    const AG = window.__sanjuAgents, ta = $("unifiedTaskInput"), route = $("unifiedRoute");
    if (!AG || !ta) return;
    const text = ta.value.trim();
    if (!text) { ta.style.borderColor = "var(--magenta)"; setTimeout(() => (ta.style.borderColor = ""), 1400); if (route) route.textContent = "আগে কাজটা লেখো বা বলো।"; return; }
    const key = forcedKey && AG.SYSTEMS[forcedKey] ? forcedKey : routeTask(text);
    const sy = AG.SYSTEMS[key];
    if (route) route.textContent = "→ আমি বেছে নিলাম: " + sy.icon + " " + sy.name + " (" + sy.agents.length + " জন এজেন্ট ভেতরে কাজ করবে)";
    try { if (A()) A().setMasterState("CORE → " + sy.name.toUpperCase()); } catch (_) {}
    ta.value = "";
    await AG.run(key, text);
  }

  function bindUnified() {
    const run = $("unifiedRunBtn");
    if (run) run.addEventListener("click", () => runUnified());
    const box = $("uaModules");
    if (box) box.addEventListener("click", (ev) => {
      const b = ev.target.closest(".ua-mod"); if (!b) return;
      box.querySelectorAll(".ua-mod").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      runUnified(b.getAttribute("data-k"));
    });
    const hub = $("agentsHub");
    if (hub) new MutationObserver(() => { if (hub.classList.contains("open")) renderModules(); }).observe(hub, { attributes: true, attributeFilter: ["class"] });
    renderModules();
  }

  /* ───────────── init ───────────── */
  function init() {
    // app.js নিজের init শেষ করার পরে চালাই
    setTimeout(() => {
      bindControls(); bindUnified(); initPersona(); syncUI();
      setTimeout(() => { if (S().autoHeal !== false) runHeal("startup"); }, 3500);
      setInterval(() => { if (!document.hidden && S().autoHeal !== false) runHeal("auto"); }, 60000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden && S().autoHeal !== false) runHeal("resume"); });
    }, 120);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.SanjuCore = { runHeal, routeTask, errors: () => readArr(ERR_KEY) };
})();
