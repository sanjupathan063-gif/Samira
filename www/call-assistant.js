/* ============================================================
   SANJU — call-assistant.js
   ইনকামিং কল: কে কল করছে ভয়েসে বলা, অটো-অ্যানসার (AI), কল কাটা/ধরা,
   কল শেষে সারাংশ। মূল কাজ নেটিভ (CallStateReceiver / CallAiSession)।
   এই ফাইল শুধু সেটিংস, লাইভ কার্ড, কল লগ ও কল-পরবর্তী নোটের UI।
   ============================================================ */
(function () {
  "use strict";

  const P = (window.Capacitor && window.Capacitor.Plugins) || {};
  const CA = P.CallAssistant || null;
  const $ = (id) => document.getElementById(id);
  const APP = () => window.__sanjuApp || {};
  const CFG_KEY = "sanju_call_cfg";
  const NOTES_KEY = "sanju_call_notes";

  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const say = (t) => { try { APP().addMessage("bot", t, { skipHistory: true }); } catch (_) {} };
  const bnNum = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

  let cfg = Object.assign({ enabled: false, announce: true, autoSec: 0 }, lsGet(CFG_KEY, {}));
  let state = null;

  /* ---------- নেটিভে সেটিংস পাঠানো ---------- */
  function pushConfig() {
    if (!CA) return Promise.resolve(null);
    const s = (APP().getSettings && APP().getSettings()) || {};
    const lang = s.voiceLang && s.voiceLang !== "auto" ? s.voiceLang : "bn-BD";
    return CA.setup({
      enabled: !!cfg.enabled,
      announce: !!cfg.announce,
      autoAnswerSec: Number(cfg.autoSec) || 0,
      userName: s.userName || "বস",
      apiKey: s.apiKey || "",
      model: s.model || "openai/gpt-oss-20b",
      lang: lang,
    }).then((r) => { state = r; return r; }).catch(() => null);
  }

  function refreshState() {
    if (!CA) return Promise.resolve(null);
    return CA.getState().then((r) => { state = r; return r; }).catch(() => null);
  }

  /* ---------- UI ---------- */
  function drawPerm() {
    const el = $("caPerm");
    if (!el) return;
    if (!CA) { el.innerHTML = '<span class="ca-bad">এই ফিচার শুধু Android অ্যাপে (APK) কাজ করে। ব্রাউজারে নয়।</span>'; return; }
    if (!state) { el.textContent = "পারমিশন দেখছি…"; return; }
    const item = (ok, t) => '<span class="ca-chip ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ " : "✕ ") + t + "</span>";
    el.innerHTML = item(state.callstate, "কল স্টেট/নম্বর") + item(state.answer, "ধরা/কাটা") + item(state.mic, "মাইক") + item(state.contacts, "কন্টাক্ট নাম") + item(state.hasKey, "Groq key");
  }

  function drawSettings() {
    if ($("caEnabled")) $("caEnabled").checked = !!cfg.enabled;
    if ($("caAnnounce")) $("caAnnounce").checked = !!cfg.announce;
    if ($("caAuto")) $("caAuto").value = String(cfg.autoSec || 0);
    drawPerm();
  }

  function whoOf(r) { return r.name || r.number || "অজানা নম্বর"; }
  const OUT = { answered: "ধরা হয়েছে", missed: "মিসড", rejected: "কাটা হয়েছে" };
  const BY = { sanju: "সাঞ্জু (AI) ধরেছে", user: "আপনি ধরেছেন", "sanju-reject": "সাঞ্জু কেটেছে", none: "" };

  async function drawLog() {
    const box = $("caLog");
    if (!box) return;
    if (!CA) { box.innerHTML = ""; return; }
    let list = [];
    try { list = ((await CA.getLog()) || {}).log || []; } catch (_) {}
    const notes = lsGet(NOTES_KEY, {});
    if (!list.length) { box.innerHTML = '<p class="hint-text">এখনো কোনো কল রেকর্ড নেই।</p>'; return; }
    box.innerHTML = list.slice(0, 20).map((r) => {
      const note = notes[r.id];
      const when = new Date(r.startedAt).toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const sum = note || r.summary || "";
      const canNote = r.outcome === "answered" && r.handledBy === "user" && !note;
      return '<div class="ca-item" data-id="' + esc(r.id) + '">' +
        '<div class="ca-item-h"><b>' + esc(whoOf(r)) + "</b><small>" + esc(when) + "</small></div>" +
        '<div class="ca-tags"><span>' + esc(OUT[r.outcome] || r.outcome) + "</span>" + (BY[r.handledBy] ? "<span>" + esc(BY[r.handledBy]) + "</span>" : "") +
        (r.durationSec ? "<span>" + bnNum(Math.floor(r.durationSec / 60)) + " মি " + bnNum(r.durationSec % 60) + " সে</span>" : "") + "</div>" +
        '<p class="ca-sum">' + esc(sum) + "</p>" +
        (canNote ? '<button class="ca-mini" data-note="' + esc(r.id) + '">📝 কী নিয়ে কথা হলো? সারাংশ বানাও</button>' : "") +
        "</div>";
    }).join("");
  }

  /* কল-পরবর্তী নোট: ব্যবহারকারী নিজে বলে/লিখে, সাঞ্জু সারাংশ বানায় (কলের অডিও অ্যাক্সেস করা যায় না) */
  function openNote(id, btn) {
    const holder = document.createElement("div");
    holder.className = "ca-note";
    holder.innerHTML = '<textarea rows="3" placeholder="কী কী কথা হলো? (বলো বা লেখো)"></textarea><div class="ca-actions"><button class="ca-mini" data-mic>🎤 বলো</button><button class="ca-mini pri" data-sum>সারাংশ বানাও</button></div><div class="ca-sum" data-out></div>';
    btn.replaceWith(holder);
    const ta = holder.querySelector("textarea"), out = holder.querySelector("[data-out]");
    holder.querySelector("[data-mic]").onclick = async () => {
      if (!P.VoiceInput) { out.textContent = "ভয়েস ইনপুট নেই — লিখে দাও।"; return; }
      try {
        try { P.WakeWord && P.WakeWord.pause && (await P.WakeWord.pause()); } catch (_) {}
        const perm = await P.VoiceInput.requestMicPermission();
        if (!perm.granted) { out.textContent = "মাইক পারমিশন দাও।"; return; }
        out.textContent = "শুনছি…";
        const r = await P.VoiceInput.listen({ language: "bn-BD" });
        if (r && r.text) ta.value = (ta.value ? ta.value + " " : "") + r.text;
        out.textContent = "";
      } catch (_) { out.textContent = "শুনতে সমস্যা হলো।"; }
      finally { try { P.WakeWord && P.WakeWord.resume && P.WakeWord.resume(); } catch (_) {} }
    };
    holder.querySelector("[data-sum]").onclick = async () => {
      const text = ta.value.trim();
      if (!text) return;
      const s = APP().getSettings ? APP().getSettings() : {};
      let summary = text.length > 160 ? text.slice(0, 160) + "…" : text;
      if (s.apiKey && navigator.onLine) {
        out.textContent = "সারাংশ বানাচ্ছি…";
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.apiKey },
            body: JSON.stringify({
              model: s.model || "openai/gpt-oss-20b", temperature: 0.3, max_tokens: 600,
              messages: [
                { role: "system", content: "ব্যবহারকারীর বলা কল-নোট থেকে ২-৩ লাইনের বাংলা সারাংশ ও করণীয় (থাকলে) দাও। যা বলা হয়নি তা বানাবে না।" },
                { role: "user", content: text },
              ],
            }),
          });
          const j = await res.json();
          const c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          if (c) summary = c.trim();
        } catch (_) {}
      }
      const notes = lsGet(NOTES_KEY, {});
      notes[id] = summary;
      lsSet(NOTES_KEY, notes);
      drawLog();
    };
  }

  function showLive(ev) {
    const box = $("caLive");
    if (!box) return;
    if (ev && ev.state === "ringing") {
      $("caLiveWho").textContent = "📞 " + (ev.name || ev.number || "অজানা নম্বর") + " কল করছেন";
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  }

  /* ---------- ইভেন্ট ---------- */
  function bindNative() {
    if (!CA || !CA.addListener) return;
    CA.addListener("callState", (ev) => {
      showLive(ev);
      if (ev && ev.state === "ringing") say("📞 " + (ev.name || ev.number || "অজানা নম্বর") + " আপনাকে কল করছেন।");
    });
    CA.addListener("callEnded", (rec) => {
      showLive(null);
      if (rec && rec.summary) say("📝 কল শেষ — " + whoOf(rec) + ": " + rec.summary);
      drawLog();
    });
  }

  /* ---------- টেক্সট/ভয়েস কমান্ড (অ্যাপের ভেতর থেকে) ---------- */
  const HANG = /(কেটে\s*দাও|কেটে\s*দে|কাটো|কল\s*কাট|ফোন\s*কাট|কল\s*বন্ধ|হ্যাং\s*আপ|রিজেক্ট|cut\s*(the\s*)?call|end\s*(the\s*)?call|hang\s*up|disconnect|reject|decline)/i;
  const ANS = /((কল|ফোন)\s*(টা|টি)?\s*(ধর|রিসিভ)|ধরো|রিসিভ\s*কর|answer|pick\s*up|receive)/i;

  async function handleText(text) {
    if (!CA || !text) return false;
    const wantHang = HANG.test(text), wantAns = ANS.test(text);
    if (!wantHang && !wantAns) return false;
    const st = await refreshState();
    if (!st || (!st.ringing && !st.offhook)) return false; // কল না থাকলে সাধারণ কমান্ড হিসেবে চলুক
    if (wantHang) {
      const r = await CA.hangup();
      say(r && r.ok ? "কল কেটে দিলাম।" : "কল কাটতে পারলাম না — কল-অ্যাসিস্ট্যান্টের পারমিশন দাও।");
      return true;
    }
    if (wantAns && st.ringing) {
      const r = await CA.answer();
      say(r && r.ok ? "কল ধরেছি, আপনি কথা বলুন।" : "কল ধরতে পারলাম না — পারমিশন দাও।");
      return true;
    }
    return false;
  }

  /* ---------- init ---------- */
  function init() {
    const btn = $("callAssistBtn");
    if (btn) btn.addEventListener("click", async () => {
      drawSettings();
      APP().openModal && APP().openModal("callAssistModal");
      await pushConfig();
      await refreshState();
      drawSettings();
      if (state && state.ringing) showLive({ state: "ringing", name: state.name, number: state.number });
      drawLog();
    });
    const close = $("caClose");
    if (close) close.addEventListener("click", () => APP().closeModal && APP().closeModal("callAssistModal"));

    const onChange = async () => {
      cfg.enabled = $("caEnabled").checked;
      cfg.announce = $("caAnnounce").checked;
      cfg.autoSec = Number($("caAuto").value) || 0;
      lsSet(CFG_KEY, cfg);
      if (cfg.enabled && CA && (!state || !state.callstate)) await askPerms();
      await pushConfig();
      drawSettings();
      if (cfg.autoSec > 0 && state && !state.answer) say("অটো-অ্যানসারের জন্য ‘ধরা/কাটা’ পারমিশন লাগবে — কল-অ্যাসিস্ট্যান্ট থেকে পারমিশন দাও।");
    };
    ["caEnabled", "caAnnounce", "caAuto"].forEach((id) => { const e = $(id); if (e) e.addEventListener("change", onChange); });

    async function askPerms() {
      if (!CA) return;
      try { state = await CA.askPermissions(); } catch (_) {}
      drawSettings();
    }
    const pb = $("caPermBtn");
    if (pb) pb.addEventListener("click", async () => { await askPerms(); await pushConfig(); drawSettings(); });

    const tb = $("caTestBtn");
    if (tb) tb.addEventListener("click", async () => {
      if (!CA) { say("ভয়েস টেস্ট শুধু APK-তে চলবে।"); return; }
      await pushConfig();
      try { await CA.simulate({ name: "রহিম ভাই", number: "01712345678" }); } catch (_) {}
    });

    const lg = $("caLog");
    if (lg) lg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-note]");
      if (b) openNote(b.dataset.note, b);
    });
    const live = { a: $("caAnswerBtn"), h: $("caHangBtn") };
    if (live.a) live.a.addEventListener("click", async () => { try { const r = await CA.answer(); if (!(r && r.ok)) say("কল ধরতে পারলাম না — পারমিশন দাও।"); } catch (_) {} });
    if (live.h) live.h.addEventListener("click", async () => { try { const r = await CA.hangup(); if (!(r && r.ok)) say("কল কাটতে পারলাম না — পারমিশন দাও।"); showLive(null); } catch (_) {} });
    const clr = $("caClear");
    if (clr) clr.addEventListener("click", async () => { try { await CA.clearLog(); lsSet(NOTES_KEY, {}); } catch (_) {} drawLog(); });

    bindNative();
    // স্টার্টআপে নেটিভের সাথে সেটিংস মিলিয়ে নাও (API key/নাম বদলালেও)
    pushConfig().then(refreshState).then(() => {
      if (state && state.ringing) showLive({ state: "ringing", name: state.name, number: state.number });
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pushConfig(); });
  }

  window.SanjuCalls = { handleText: handleText, sync: pushConfig };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
