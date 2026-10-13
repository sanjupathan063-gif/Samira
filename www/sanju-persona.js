/* ══════════════════════════════════════════════════════════════
   SANJU — পার্সোনা • ভয়েস নির্বাচন • HUD থিম • লাইভ গেজ
   • পার্সোনা: নাম + কথার ধরন + ডিফল্ট রং + ডিফল্ট ভয়েস (নিজের পার্সোনাও বানানো যায়)
   • ভয়েস: Gemini TTS-এর ৩০টি তৈরি ভয়েস, শুনে দেখার বাটনসহ (Gemini key লাগে)
   • থিম: স্টাইলশিটের রংগুলো রানটাইমে বদলায়, ক্যাসকেডের ক্রম অক্ষুণ্ণ থাকে
   • গেজ: ব্যাটারি / RAM / স্টোরেজ আসল সংখ্যা (নেটিভ DeviceStats), নেট সংযোগের মান
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const LSK = "sanju_persona_v1";
  const app = () => window.__sanjuApp || {};
  const S = () => (app().getSettings && app().getSettings()) || {};
  const $ = (id) => document.getElementById(id);
  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const say = (t, speak) => { try { app().addMessage && app().addMessage("bot", t); if (speak !== false && app().speak) app().speak(String(t).slice(0, 260)); } catch (_) {} };
  const open = (id) => (app().openModal ? app().openModal(id) : $(id) && $(id).classList.add("open"));
  const close = (id) => (app().closeModal ? app().closeModal(id) : $(id) && $(id).classList.remove("open"));

  /* ───────────── থিম ───────────── */
  const THEMES = {
    cyan:    { label: "সায়ান",    rgb: [53, 230, 255],  acc: [255, 47, 146],  violet: "#7b5bff" },
    ice:     { label: "আইস নীল",  rgb: [120, 190, 255], acc: [160, 120, 255], violet: "#8aa4ff" },
    violet:  { label: "বেগুনি",    rgb: [170, 120, 255], acc: [255, 90, 200],  violet: "#c58bff" },
    rose:    { label: "গোলাপি",    rgb: [255, 92, 160],  acc: [255, 190, 92],  violet: "#ff7ac0" },
    crimson: { label: "লাল",       rgb: [255, 84, 84],   acc: [255, 200, 60],  violet: "#ff8a5c" },
    gold:    { label: "সোনালি",    rgb: [255, 196, 64],  acc: [255, 120, 64],  violet: "#ffd98a" },
    emerald: { label: "সবুজ",      rgb: [64, 230, 160],  acc: [53, 230, 255],  violet: "#7bffd0" },
    orange:  { label: "কমলা",      rgb: [255, 150, 60],  acc: [255, 60, 120],  violet: "#ffb36b" },
  };
  const THEME_WORDS = { "সায়ান": "cyan", "আইস": "ice", "নীল": "ice", "বেগুনি": "violet", "ভায়োলেট": "violet", "গোলাপি": "rose", "গোলাপী": "rose", "লাল": "crimson", "সোনালি": "gold", "গোল্ড": "gold", "সবুজ": "emerald", "কমলা": "orange" };
  const hex = (c) => "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");

  // রং বদলানোর জন্য মূল মান মনে রাখা (ক্যাসকেডের ক্রম না ভেঙে জায়গাতেই বদলানো হয়)
  let ORIG = null;
  const RE_PRIMARY = /rgba?\(\s*53\s*,\s*230\s*,\s*255/i;
  const RE_ACCENT = /rgba?\(\s*255\s*,\s*47\s*,\s*146/i;
  const RE_VIOLET = /rgba?\(\s*123\s*,\s*91\s*,\s*255/i;
  function scanRules(rules, out) {
    for (const r of Array.from(rules || [])) {
      if (r.style) {
        const st = r.style;
        for (let i = 0; i < st.length; i++) {
          const p = st[i]; const v = st.getPropertyValue(p);
          if (v && (RE_PRIMARY.test(v) || RE_ACCENT.test(v) || RE_VIOLET.test(v))) out.push({ st, p, v, pr: st.getPropertyPriority(p) });
        }
      }
      if (r.cssRules) scanRules(r.cssRules, out);
    }
  }
  function collectOriginals() {
    if (ORIG) return ORIG;
    ORIG = [];
    for (const sheet of Array.from(document.styleSheets || [])) {
      let rules; try { rules = sheet.cssRules; } catch (_) { continue; } // অন্য ডোমেইনের শিট (ফন্ট) বাদ
      try { scanRules(rules, ORIG); } catch (_) {}
    }
    return ORIG;
  }
  function rewrite(v, t) {
    return String(v)
      .replace(/(rgba?)\(\s*53\s*,\s*230\s*,\s*255/gi, (m, f) => `${f}(${t.rgb.join(",")}`)
      .replace(/(rgba?)\(\s*255\s*,\s*47\s*,\s*146/gi, (m, f) => `${f}(${t.acc.join(",")}`)
      .replace(/(rgba?)\(\s*123\s*,\s*91\s*,\s*255/gi, (m, f) => { const h = t.violet; const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return `${f}(${n.join(",")}`; });
  }
  let themeId = "cyan";
  function applyTheme(id) {
    const t = THEMES[id] || THEMES.cyan; themeId = THEMES[id] ? id : "cyan";
    const root = document.documentElement.style;
    const names = ["--cyan", "--cyan-dim", "--magenta", "--violet", "--edge", "--edge-soft"];
    if (themeId === "cyan") names.forEach((n) => root.removeProperty(n));
    else {
      root.setProperty("--cyan", hex(t.rgb)); root.setProperty("--cyan-dim", `rgba(${t.rgb.join(",")},0.32)`);
      root.setProperty("--magenta", hex(t.acc)); root.setProperty("--violet", t.violet);
      root.setProperty("--edge", `rgba(${t.rgb.join(",")},0.26)`); root.setProperty("--edge-soft", `rgba(${t.rgb.join(",")},0.14)`);
    }
    for (const o of collectOriginals()) {
      try { o.st.setProperty(o.p, themeId === "cyan" ? o.v : rewrite(o.v, t), o.pr); } catch (_) {}
    }
  }

  /* ───────────── ভয়েস (Gemini TTS-এর ৩০টি তৈরি ভয়েস) ───────────── */
  const VOICES = [
    ["Zephyr", "উজ্জ্বল"], ["Puck", "প্রাণবন্ত"], ["Charon", "তথ্যমূলক, গম্ভীর"], ["Kore", "দৃঢ় (এখনকার ডিফল্ট)"], ["Fenrir", "উত্তেজিত"], ["Leda", "তরুণ"],
    ["Orus", "দৃঢ়"], ["Aoede", "হালকা, বাতাসের মতো"], ["Callirrhoe", "সহজ-সরল"], ["Autonoe", "উজ্জ্বল"], ["Enceladus", "ফিসফিসে"], ["Iapetus", "স্পষ্ট"],
    ["Umbriel", "সহজ-সরল"], ["Algieba", "মসৃণ"], ["Despina", "মসৃণ"], ["Erinome", "স্পষ্ট"], ["Algenib", "ভারী, খসখসে"], ["Rasalgethi", "তথ্যমূলক"],
    ["Laomedeia", "প্রাণবন্ত"], ["Achernar", "নরম"], ["Alnilam", "দৃঢ়"], ["Schedar", "সমতাল"], ["Gacrux", "পরিণত"], ["Pulcherrima", "সামনে এগিয়ে থাকা"],
    ["Achird", "বন্ধুসুলভ"], ["Zubenelgenubi", "অনানুষ্ঠানিক"], ["Vindemiatrix", "কোমল"], ["Sadachbia", "চঞ্চল"], ["Sadaltager", "জ্ঞানী"], ["Sulafat", "উষ্ণ"],
  ];
  const VOICE_IDS = VOICES.map((v) => v[0]);

  /* ───────────── পার্সোনা ───────────── */
  const BUILTIN = [
    { id: "sanju", name: "SANJU", desc: "আগের মতোই — ডিফল্ট", theme: "cyan", voice: "", tone: "" },
    { id: "maya", name: "MAYA", desc: "উষ্ণ, যত্নশীল, একটু খুনসুটে বন্ধু", theme: "rose", voice: "Sulafat", aliases: ["maya", "মায়া"],
      tone: "তুমি মায়া — উষ্ণ, যত্নশীল আর একটু খুনসুটে স্বভাবের সহকারী। নরম সুরে কথা বলো, ব্যবহারকারীর কাজের পাশাপাশি তার সুবিধা-অসুবিধার খেয়াল রাখো, তবে বাড়াবাড়ি করবে না।" },
    { id: "jarvis", name: "J.A.R.V.I.S", desc: "শান্ত, মার্জিত, দক্ষ সহকারী", theme: "cyan", voice: "Charon", aliases: ["jarvis", "j.a.r.v.i.s", "জার্ভিস", "জারভিস"],
      tone: "তুমি শান্ত, মার্জিত আর অত্যন্ত দক্ষ ব্যক্তিগত সহকারী। সম্মান দিয়ে ব্যবহারকারীকে নাম ধরে ডাকো, সংক্ষেপে ও নির্ভুলভাবে উত্তর দাও, মাঝে মাঝে সূক্ষ্ম শুকনো রসিকতা করতে পারো।" },
    { id: "friday", name: "FRIDAY", desc: "দ্রুত, কাজের দিকে মনোযোগী", theme: "ice", voice: "Leda", aliases: ["friday", "ফ্রাইডে"],
      tone: "তুমি দ্রুত, স্পষ্টভাষী আর কাজমুখী সহকারী। ছোট বাক্যে সরাসরি উত্তর দাও, দরকার হলে ধাপে ধাপে বলো, ভূমিকা ছাড়াই কাজের কথায় আসো।" },
    { id: "natasha", name: "NATASHA", desc: "চটপটে, আত্মবিশ্বাসী, প্রাণবন্ত", theme: "violet", voice: "Aoede", aliases: ["natasha", "নাতাশা"],
      tone: "তুমি আত্মবিশ্বাসী, চটপটে আর প্রাণবন্ত। হালকা মজা করো, কিন্তু কাজে নির্ভরযোগ্য থাকো এবং স্পষ্ট পরামর্শ দাও।" },
    { id: "ironman", name: "IRON MAN", desc: "বুদ্ধিদীপ্ত, রসিক, আত্মবিশ্বাসী", theme: "crimson", voice: "Alnilam", aliases: ["iron man", "ironman", "আয়রন ম্যান", "আয়রনম্যান"],
      tone: "তুমি আত্মবিশ্বাসী, বুদ্ধিদীপ্ত আর রসিক — ক্যারিশম্যাটিক ইঞ্জিনিয়ারের মতো। ছোট চটপটে উত্তর দাও, মাঝে মাঝে মজার খোঁচা দিতে পারো, কিন্তু কাজে নির্ভুল থাকো।" },
    { id: "sage", name: "SAGE", desc: "ধীর, শান্ত শিক্ষক", theme: "emerald", voice: "Gacrux", aliases: ["sage", "সেজ"],
      tone: "তুমি ধীর, শান্ত আর ধৈর্যশীল শিক্ষকের মতো। জটিল বিষয় সহজ উদাহরণ দিয়ে বোঝাও, তাড়াহুড়ো করবে না।" },
  ];

  const load = () => { try { const o = JSON.parse(localStorage.getItem(LSK) || "{}"); return Object.assign({ id: "sanju", ov: {}, customs: [], gauges: true }, o); } catch (_) { return { id: "sanju", ov: {}, customs: [], gauges: true }; } };
  let state = load();
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify(state)); } catch (_) {} };
  const all = () => BUILTIN.concat((state.customs || []).map((c) => Object.assign({ custom: true }, c)));
  const base = (id) => all().find((p) => p.id === id) || BUILTIN[0];
  function cur() {
    const b = base(state.id); const o = (state.ov && state.ov[b.id]) || {};
    return { id: b.id, custom: !!b.custom, desc: b.desc, tone: b.tone || "", name: o.name || b.name, theme: o.theme || b.theme, voice: o.voice !== undefined ? o.voice : b.voice };
  }
  const name = () => cur().name;
  const voice = () => { const v = cur().voice; return VOICE_IDS.includes(v) ? v : ""; };
  function setOv(patch) { state.ov = state.ov || {}; state.ov[state.id] = Object.assign({}, state.ov[state.id] || {}, patch); save(); apply(); }

  function adjustPrompt(prompt) {
    const p = cur();
    if (p.id === "sanju" && name() === "SANJU") return prompt;
    let out = String(prompt).replace("তুমি SANJU,", `তুমি ${p.name},`);
    if (p.tone) out += `\n\nব্যক্তিত্ব ও কথার ধরন: ${p.tone}`;
    out += `\nনিজেকে সবসময় “${p.name}” নামে পরিচয় দেবে।`;
    return out;
  }

  function apply() {
    const p = cur();
    const brand = document.querySelector(".brand"); if (brand) brand.textContent = p.name;
    const av = document.querySelector(".avatar"); if (av) av.textContent = (p.name.replace(/[^A-Za-z\u0980-\u09FF]/g, "")[0] || "S").toUpperCase();
    try { document.title = p.name; } catch (_) {}
    applyTheme(p.theme);
    const g = $("hudGauges"); if (g) g.style.display = state.gauges ? "" : "none";
    if (state.gauges) updateGauges();
    renderPanel();
  }

  function setPersona(id) {
    if (!all().some((p) => p.id === id)) return false;
    state.id = id; save(); apply(); return true;
  }

  /* ───────────── গেজ ───────────── */
  const C = 2 * Math.PI * 18;
  const ring = (id, label) => `<div class="hud-ring" id="${id}"><svg viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg><b>—</b><small>${label}</small></div>`;
  function ensureGauges() {
    if ($("hudGauges")) return;
    const el = document.createElement("section"); el.id = "hudGauges"; el.className = "hud-gauges";
    el.innerHTML = ring("gBat", "ব্যাটারি") + ring("gRam", "RAM") + ring("gDisk", "স্টোরেজ") + ring("gNet", "নেট");
    const anchor = document.querySelector(".extras-home-row") || document.querySelector(".master-task");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor); else document.body.appendChild(el);
  }
  function setRing(id, pct, text, warn) {
    const r = $(id); if (!r) return;
    const fg = r.querySelector(".fg"), b = r.querySelector("b");
    if (pct == null || isNaN(pct)) { fg.style.strokeDashoffset = C.toFixed(1); b.textContent = text || "—"; r.classList.remove("warn"); return; }
    const p = Math.max(0, Math.min(100, pct));
    fg.style.strokeDashoffset = (C * (1 - p / 100)).toFixed(1);
    b.textContent = text || bn(Math.round(p)) + "%";
    r.classList.toggle("warn", !!warn);
  }
  async function updateGauges() {
    const dev = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.DeviceStats;
    let st = null;
    if (dev) { try { st = await dev.get(); } catch (_) {} }
    let bat = st && st.battery >= 0 ? st.battery : null; let charging = st ? !!st.charging : false;
    if (bat == null && navigator.getBattery) { try { const b = await navigator.getBattery(); bat = Math.round(b.level * 100); charging = b.charging; } catch (_) {} }
    setRing("gBat", bat, bat == null ? "—" : (charging ? "⚡" : "") + bn(bat) + "%", bat != null && bat <= 15 && !charging);
    if (st && st.ramTotal > 0) { const used = (1 - st.ramAvail / st.ramTotal) * 100; setRing("gRam", used, bn(Math.round(used)) + "%", used >= 90); } else setRing("gRam", null, "—");
    if (st && st.diskTotal > 0) { const used = (1 - st.diskFree / st.diskTotal) * 100; setRing("gDisk", used, bn(Math.round(used)) + "%", used >= 92); } else setRing("gDisk", null, "—");
    const online = navigator.onLine !== false; const ct = navigator.connection && navigator.connection.effectiveType;
    const q = !online ? 0 : ct === "4g" ? 100 : ct === "3g" ? 66 : ct === "2g" ? 33 : ct === "slow-2g" ? 15 : 100;
    setRing("gNet", q, !online ? "অফলাইন" : ct ? ct.toUpperCase() : "অনলাইন", !online);
  }
  let gaugeTimer = null;
  function startGauges() {
    ensureGauges(); updateGauges();
    clearInterval(gaugeTimer); gaugeTimer = setInterval(() => { if (!document.hidden && state.gauges) updateGauges(); }, 6000);
    window.addEventListener("online", updateGauges); window.addEventListener("offline", updateGauges);
  }

  /* ───────────── প্যানেল ───────────── */
  function voiceOptions(sel) {
    return `<option value="">ডিফল্ট (Kore)</option>` + VOICES.map(([id, st]) => `<option value="${id}" ${sel === id ? "selected" : ""}>${id} — ${esc(st)}</option>`).join("");
  }
  function themeOptions(sel) { return Object.keys(THEMES).map((k) => `<option value="${k}" ${sel === k ? "selected" : ""}>${THEMES[k].label}</option>`).join(""); }

  function panelHtml() {
    const p = cur();
    const cards = all().map((x) => {
      const b = (state.ov && state.ov[x.id]) || {}; const th = THEMES[b.theme || x.theme] || THEMES.cyan;
      return `<button type="button" class="ps-card${x.id === state.id ? " on" : ""}" data-ps="${esc(x.id)}" style="--ps:${hex(th.rgb)}"><i></i><b>${esc(b.name || x.name)}</b><small>${esc(x.desc || "নিজের বানানো")}</small>${x.custom ? `<span class="ps-del" data-psdel="${esc(x.id)}" aria-label="মুছো">✕</span>` : ""}</button>`;
    }).join("");
    return `<div class="modal reticle extras-modal"><h2>পার্সোনা ও থিম</h2>
      <p class="hint-text">পার্সোনা বদলালে নাম, কথার ধরন, রং আর ভয়েস একসাথে বদলায়। ডিফল্টগুলো পরে আলাদা করেও বদলানো যায়। ওয়েক ওয়ার্ড (ডাকার শব্দ) আগের মতোই থাকে।</p>
      <div class="ps-grid">${cards}</div>
      <details open><summary>নাম, ভয়েস ও রং — ${esc(p.name)}</summary>
        <label for="psName">নাম</label><input id="psName" maxlength="20" value="${esc(p.name)}"/>
        <label for="psVoice">ভয়েস (Gemini)</label><select id="psVoice">${voiceOptions(voice())}</select>
        <div class="plus-row"><button class="btn ghost" id="psPrev">শুনে দেখো</button><button class="btn ghost" id="psPrevAll">কয়েকটা নমুনা শুনি</button></div>
        <p class="hint-text" id="psVoiceMsg">নমুনা বাজাতে Gemini API key লাগে; প্রতিটি নমুনা আপনার Gemini কোটা থেকে সামান্য খরচ করে।</p>
        <label for="psTheme">রঙের থিম</label><select id="psTheme">${themeOptions(p.theme)}</select>
        <label class="ca-switch"><input type="checkbox" id="psGauges" ${state.gauges ? "checked" : ""}/><span>হোমে লাইভ গেজ (ব্যাটারি, RAM, স্টোরেজ, নেট)</span></label>
      </details>
      <details><summary>নিজের পার্সোনা বানাও</summary>
        <input id="psNewName" maxlength="20" placeholder="নাম (যেমন: রিয়া)"/>
        <textarea id="psNewTone" rows="3" maxlength="300" placeholder="কেমন স্বভাবের হবে? যেমন: হাসিখুশি, ছোট উত্তর দেয়, ক্রিকেট ভালোবাসে"></textarea>
        <label for="psNewTheme">রং</label><select id="psNewTheme">${themeOptions("cyan")}</select>
        <label for="psNewVoice">ভয়েস</label><select id="psNewVoice">${voiceOptions("")}</select>
        <div class="plus-row"><button class="btn primary" id="psAdd">যোগ করো</button></div>
        <p class="hint-text" id="psAddMsg"></p>
      </details>
      <div class="modal-actions"><button class="btn primary" id="psClose">বন্ধ করো</button></div></div>`;
  }

  function ensurePanel() {
    if ($("personaModal")) return;
    const ov = document.createElement("div"); ov.className = "modal-overlay"; ov.id = "personaModal"; document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      const t = e.target; if (!t || !t.closest) return;
      const del = t.closest("[data-psdel]");
      if (del) { e.stopPropagation(); const id = del.dataset.psdel; state.customs = (state.customs || []).filter((c) => c.id !== id); if (state.ov) delete state.ov[id]; if (state.id === id) state.id = "sanju"; save(); apply(); return; }
      const card = t.closest("[data-ps]"); if (card) { setPersona(card.dataset.ps); return; }
    });
    ov.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "psVoice") setOv({ voice: t.value });
      else if (t.id === "psTheme") setOv({ theme: t.value });
      else if (t.id === "psGauges") { state.gauges = t.checked; save(); apply(); }
    });
    ov.addEventListener("input", (e) => { if (e.target.id === "psName") { const v = e.target.value.trim(); if (v) { state.ov = state.ov || {}; state.ov[state.id] = Object.assign({}, state.ov[state.id] || {}, { name: v.slice(0, 20) }); save(); const brand = document.querySelector(".brand"); if (brand) brand.textContent = v.slice(0, 20); } } });
    ov.addEventListener("click", async (e) => {
      const id = e.target && e.target.id;
      if (id === "psClose") close("personaModal");
      else if (id === "psPrev") preview([voice() || "Kore"]);
      else if (id === "psPrevAll") preview(["Charon", "Sulafat", "Leda", "Alnilam"]);
      else if (id === "psAdd") {
        const nm = ($("psNewName").value || "").trim(), tone = ($("psNewTone").value || "").trim();
        if (!nm) { $("psAddMsg").textContent = "একটা নাম দাও।"; return; }
        if ((state.customs || []).length >= 8) { $("psAddMsg").textContent = "সর্বোচ্চ ৮টা নিজের পার্সোনা রাখা যায়।"; return; }
        const pid = "c" + Date.now().toString(36);
        state.customs = (state.customs || []).concat([{ id: pid, name: nm.slice(0, 20), desc: tone ? tone.slice(0, 40) : "নিজের বানানো", theme: $("psNewTheme").value, voice: $("psNewVoice").value, tone: tone ? `তুমি ${nm}। ${tone}` : "", aliases: [norm(nm)] }]);
        state.id = pid; save(); apply();
      }
    });
  }
  function renderPanel() { const ov = $("personaModal"); if (!ov) return; const keep = ov.classList.contains("open"); ov.innerHTML = panelHtml(); if (keep) ov.classList.add("open"); }
  function openPanel() { ensurePanel(); renderPanel(); open("personaModal"); }

  async function preview(list) {
    const msg = $("psVoiceMsg");
    if (!S().geminiTtsKey) { if (msg) msg.textContent = "আগে সেটিংসে Gemini API key দাও।"; return; }
    if (!app().previewVoice) return;
    for (const v of list) {
      try {
        if (msg) msg.textContent = `${v} বাজছে…`;
        await app().previewVoice(v, `হ্যালো, আমি ${name()}। আমার গলাটা কেমন লাগছে?`);
        await new Promise((r) => setTimeout(r, 4200));
      } catch (e) { if (msg) msg.textContent = "শোনানো গেল না। ইন্টারনেট ও Gemini key দেখো।"; return; }
    }
    if (msg) msg.textContent = "পছন্দ হলে উপরের ভয়েস তালিকা থেকে বেছে নাও।";
  }

  /* ───────────── কমান্ড ───────────── */
  function findPersona(txt) {
    const n = norm(txt);
    return all().find((p) => (p.aliases || []).some((a) => norm(a) === n) || norm(p.name) === n);
  }
  async function intercept(raw) {
    const text = String(raw || "").trim(); if (!text) return false;
    let m = text.match(/^(.{2,24}?)\s*(?:মোড|পার্সোনা)\s*(?:চালু|অন|সেট)(?:\s*করো)?$/);
    if (m) { const p = findPersona(m[1]); if (p) { setPersona(p.id); say(p.id === "sanju" ? "আমি আবার আগের মতো সঞ্জু।" : `ঠিক আছে, এখন আমি ${cur().name}।`, true); return true; } return false; }
    m = text.match(/^(?:পার্সোনা|ব্যক্তিত্ব)\s*(?:বদলাও|পাল্টাও|বদল|দেখাও|মেনু\s*খোলো)?$/) || text.match(/^(?:ভয়েস|গলা)\s*(?:বদলাও|পাল্টাও)$/) || text.match(/^থিম\s*(?:বদলাও|মেনু)$/);
    if (m) { openPanel(); return true; }
    m = text.match(/^তোমার\s*নাম\s*(?:বদলে\s*)?(.{1,20}?)\s*(?:রাখো|করো|দাও)$/);
    if (m) { setOv({ name: m[1].trim() }); say(`ঠিক আছে, এখন থেকে আমার নাম ${cur().name}।`, true); return true; }
    m = text.match(/^থিম\s*(?:বদলাও|দাও|চালু)?\s*[:：]?\s*(\S+?)(?:\s*করো)?$/) || text.match(/^(\S+?)\s*থিম\s*(?:চালু|দাও|করো)?$/);
    if (m && THEME_WORDS[m[1]]) { setOv({ theme: THEME_WORDS[m[1]] }); say(`${THEMES[THEME_WORDS[m[1]]].label} থিম চালু করলাম।`, false); return true; }
    return false;
  }

  function init() {
    startGauges();
    const b = $("personaBtn"); if (b) b.addEventListener("click", openPanel);
    apply();
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.gauges) updateGauges(); });
  }

  window.SanjuPersona = { intercept, adjustPrompt, voice, name, setPersona, openPanel, cur, apply, _t: { rewrite, THEMES, VOICES, BUILTIN, findPersona, scanRules } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
