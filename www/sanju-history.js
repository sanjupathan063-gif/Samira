/* ══════════════════════════════════════════════════════════════
   SANJU — মেসেজ হিস্টরি
   Messenger / Instagram / Facebook (ও চাইলে WhatsApp, Telegram, SMS) থেকে যে মেসেজ
   নোটিফিকেশন হয়ে ফোনে এসেছে, সেগুলো ফোনের ভেতরেই সংরক্ষণ করে রাখে।
   পাঠানো ব্যক্তি পরে ডিলিট/আনসেন্ড করলেও এখানে থেকে যায়।
   সীমা: যে মেসেজের নোটিফিকেশন আসেনি (চ্যাট খোলা ছিল, ফোন অফলাইন ছিল, Do Not Disturb-এ
   নোটিফিকেশন বন্ধ ছিল) তা ধরা যায় না। ছবি/ভিডিও শুধু “ছবি পাঠিয়েছে” লেখা আসে।
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const PLUG = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MessageHistory) || null;
  const NACC = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NotificationAccess) || null;
  const app = () => window.__sanjuApp || {};
  const $ = (id) => document.getElementById(id);
  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const say = (t, speak) => { try { app().addMessage && app().addMessage("bot", t); if (speak !== false && app().speak) app().speak(String(t).slice(0, 300)); } catch (_) {} };
  const fmt = (ts) => { try { return new Date(ts).toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (_) { return ""; } };
  const PAGE = 50;

  const st = { q: "", pkg: "", unsent: false, msgOnly: false, items: [], total: 0, status: null, loading: false, more: false };
  let clearArmed = false;

  const appName = (pkg) => {
    const a = st.status && st.status.apps ? st.status.apps.find((x) => x.pkg === pkg) : null;
    return a ? a.name : String(pkg || "").split(".").pop();
  };

  async function loadStatus() {
    const p = PLUG();
    if (!p) { st.status = null; return null; }
    try { st.status = await p.status(); } catch (_) { st.status = null; }
    return st.status;
  }

  async function load(reset) {
    const p = PLUG(); if (!p || st.loading) return;
    st.loading = true;
    try {
      const offset = reset ? 0 : st.items.length;
      const r = await p.list({ limit: PAGE, offset, pkg: st.pkg, q: st.q, unsentOnly: st.unsent, msgOnly: st.msgOnly });
      const items = (r && r.items) || [];
      st.items = reset ? items : st.items.concat(items);
      st.total = (r && r.total) || 0;
      st.more = items.length === PAGE;
    } catch (_) { if (reset) st.items = []; }
    st.loading = false;
  }

  function statusHtml() {
    const s = st.status;
    if (!PLUG()) return '<p class="hint-text">এই ফিচার শুধু Android অ্যাপে চলে।</p>';
    if (!s) return '<p class="hint-text">অবস্থা জানা যায়নি। অ্যাপ আবার খোলো।</p>';
    const parts = [];
    if (!s.access) {
      parts.push('<div class="hist-warn"><b>প্রথমে নোটিফিকেশন অ্যাক্সেস দাও।</b><br>সেটিংস খুলবে — তালিকায় SANJU খুঁজে চালু করো। এটা ছাড়া মেসেজ ধরা যায় না।<div class="plus-row"><button class="btn primary" id="histAccess">অ্যাক্সেস দাও</button></div></div>');
    }
    parts.push(`<label class="ca-switch"><input type="checkbox" id="histOn" ${s.enabled ? "checked" : ""}/><span>মেসেজ সেভ করা চালু (ফোনের ভেতরেই থাকে)</span></label>`);
    if (s.enabled && s.access && !s.connected) parts.push('<p class="hint-text hist-bad">সার্ভিস এখন সংযুক্ত নয়। ফোনের সেটিংসে নোটিফিকেশন অ্যাক্সেস বন্ধ-চালু করে দেখো।</p>');
    parts.push(`<p class="hint-text">সেভ হয়েছে ${bn(s.count)}টি। চালু রাখলে এখন থেকে আসা মেসেজ জমবে; আগের মেসেজ ফেরত আনা যায় না।</p>`);
    return parts.join("");
  }

  function settingsHtml() {
    const s = st.status; if (!s || !s.apps) return "";
    return `<details class="hist-set"><summary>কোন অ্যাপ থেকে সেভ হবে</summary>
      ${s.apps.map((a) => `<label class="ca-switch"><input type="checkbox" data-app="${esc(a.pkg)}" ${a.on ? "checked" : ""}/><span>${esc(a.name)}</span></label>`).join("")}
      <label class="ca-switch"><input type="checkbox" id="histSkip" ${s.skipCodes ? "checked" : ""}/><span>OTP/কোড/পাসওয়ার্ড জাতীয় মেসেজ সেভ করবে না (নিরাপত্তার জন্য)</span></label>
      <p class="hint-text">Facebook অ্যাপে লাইক-কমেন্টের নোটিফিকেশনও আসে, তাই ওগুলোও জমতে পারে। “শুধু চ্যাট মেসেজ” ফিল্টার দিয়ে আলাদা করতে পারো।</p>
    </details>`;
  }

  function listHtml() {
    if (!PLUG()) return "";
    if (!st.items.length) return `<p class="hint-text">${st.q || st.pkg || st.unsent || st.msgOnly ? "এই ফিল্টারে কিছু নেই।" : "এখনো কোনো মেসেজ সেভ হয়নি।"}</p>`;
    return st.items.map((m) => {
      const who = m.convo || m.sender || "";
      const sub = m.sender && m.sender !== m.convo ? `<small class="hist-sender">${esc(m.sender)}</small>` : "";
      return `<div class="hist-item${m.unsent ? " unsent" : ""}">
        <div class="hist-top"><b>${esc(who)}</b><span class="hist-app">${esc(appName(m.pkg))}</span></div>${sub}
        <p>${esc(m.body)}</p>
        <div class="hist-bot"><small>${esc(fmt(m.ts))}</small>${m.unsent ? '<span class="hist-flag">মুছে ফেলা হয়ে থাকতে পারে</span>' : ""}<button class="del-btn" data-del="${m.id}" aria-label="মুছো">✕</button></div>
      </div>`;
    }).join("") + (st.more ? '<div class="plus-row"><button class="btn ghost" id="histMore">আরও দেখাও</button></div>' : "");
  }

  function appOptions() {
    const s = st.status; const a = (s && s.apps) || [];
    return '<option value="">সব অ্যাপ</option>' + a.map((x) => `<option value="${esc(x.pkg)}" ${st.pkg === x.pkg ? "selected" : ""}>${esc(x.name)}</option>`).join("");
  }

  async function render() {
    const box = $("histModal"); if (!box) return;
    const body = box.querySelector(".hist-body"); if (!body) return;
    const keepQ = $("histQ") ? $("histQ").value : st.q;
    body.innerHTML = `${statusHtml()}${settingsHtml()}
      <div class="hist-filters">
        <input type="search" id="histQ" placeholder="নাম বা লেখা দিয়ে খোঁজো" value="${esc(keepQ)}"/>
        <select id="histApp">${appOptions()}</select>
        <label class="ca-switch"><input type="checkbox" id="histUnsent" ${st.unsent ? "checked" : ""}/><span>শুধু মুছে ফেলা হয়েছে মনে হওয়া</span></label>
        <label class="ca-switch"><input type="checkbox" id="histMsgOnly" ${st.msgOnly ? "checked" : ""}/><span>শুধু চ্যাট মেসেজ</span></label>
      </div>
      <div id="histList">${listHtml()}</div>
      <div class="plus-row"><button class="btn ghost" id="histCopy">তালিকা কপি করো</button><button class="btn ghost" id="histClear">${clearArmed ? "আবার চাপলে সব মুছবে" : "সব মুছে ফেলো"}</button></div>
      <p class="hint-text">“মুছে ফেলা মনে হওয়া” চিহ্ন অনুমান: অ্যাপ নিজে “মেসেজ সরানো হয়েছে” জাতীয় নোটিফিকেশন দিলে তবেই চিহ্ন পড়ে। চিহ্ন না থাকলেও মেসেজ সেভ থাকে।</p>`;
    bind();
  }

  function bind() {
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    on("histAccess", "click", () => { const n = NACC(); if (n && n.openSettings) n.openSettings().catch(() => {}); });
    on("histOn", "change", async (e) => {
      const p = PLUG(); if (!p) return;
      try { st.status = await p.setConfig({ enabled: e.target.checked }); } catch (_) {}
      if (e.target.checked && st.status && !st.status.access) say("চালু হয়েছে, কিন্তু নোটিফিকেশন অ্যাক্সেস না দিলে মেসেজ জমবে না।", false);
      render(); refreshHome();
    });
    on("histSkip", "change", async (e) => { try { st.status = await PLUG().setConfig({ skipCodes: e.target.checked }); } catch (_) {} });
    document.querySelectorAll("#histModal [data-app]").forEach((el) => el.addEventListener("change", async () => {
      const picks = Array.from(document.querySelectorAll("#histModal [data-app]")).filter((x) => x.checked).map((x) => x.dataset.app);
      try { st.status = await PLUG().setConfig({ apps: picks }); } catch (_) {}
    }));
    let t = null;
    on("histQ", "input", (e) => { clearTimeout(t); t = setTimeout(async () => { st.q = e.target.value.trim(); await load(true); const l = $("histList"); if (l) { l.innerHTML = listHtml(); bindList(); } }, 280); });
    const refilter = async () => { await load(true); render(); };
    on("histApp", "change", (e) => { st.pkg = e.target.value; refilter(); });
    on("histUnsent", "change", (e) => { st.unsent = e.target.checked; refilter(); });
    on("histMsgOnly", "change", (e) => { st.msgOnly = e.target.checked; refilter(); });
    on("histCopy", "click", copyList);
    on("histClear", "click", async () => {
      if (!clearArmed) { clearArmed = true; render(); setTimeout(() => { if (clearArmed) { clearArmed = false; render(); } }, 4000); return; }
      clearArmed = false;
      try { await PLUG().clear(); } catch (_) {}
      await loadStatus(); await load(true); render(); refreshHome();
    });
    bindList();
  }

  function bindList() {
    document.querySelectorAll("#histModal [data-del]").forEach((b) => b.addEventListener("click", async () => {
      try { await PLUG().remove({ id: +b.dataset.del }); } catch (_) {}
      await loadStatus(); await load(true); render(); refreshHome();
    }));
    const more = $("histMore"); if (more) more.addEventListener("click", async () => { await load(false); const l = $("histList"); if (l) { l.innerHTML = listHtml(); bindList(); } });
  }

  async function copyList() {
    const lines = st.items.map((m) => `[${fmt(m.ts)}] ${appName(m.pkg)} — ${m.convo || m.sender}${m.sender && m.sender !== m.convo ? " (" + m.sender + ")" : ""}: ${m.body}${m.unsent ? "  [মুছে ফেলা মনে হয়]" : ""}`).join("\n");
    try { await navigator.clipboard.writeText(lines || ""); say("তালিকা কপি হয়েছে।", false); } catch (_) { say("কপি করা গেল না।", false); }
  }

  function ensureModal() {
    if ($("histModal")) return;
    const ov = document.createElement("div"); ov.className = "modal-overlay"; ov.id = "histModal";
    ov.innerHTML = '<div class="modal reticle extras-modal"><h2>মেসেজ হিস্টরি</h2><p class="hint-text">Messenger, Instagram, Facebook-এ কেউ মেসেজ করে ডিলিট করলেও এখানে থেকে যাবে। সবকিছু শুধু এই ফোনে থাকে।</p><div class="hist-body"></div><div class="modal-actions"><button class="btn primary" id="histClose">বন্ধ করো</button></div></div>';
    document.body.appendChild(ov);
    $("histClose").addEventListener("click", () => (app().closeModal ? app().closeModal("histModal") : ov.classList.remove("open")));
  }

  async function open() {
    ensureModal();
    if (app().openModal) app().openModal("histModal"); else $("histModal").classList.add("open");
    await loadStatus(); await load(true); await render();
  }

  async function refreshHome() {
    const el = $("histHomeState"); if (!el) return;
    if (!PLUG()) { el.textContent = "শুধু Android অ্যাপে"; return; }
    const s = await loadStatus();
    el.textContent = !s ? "মুছে ফেললেও থাকবে" : !s.enabled ? "বন্ধ — চালু করতে ট্যাপ করো" : `চালু • ${bn(s.count)}টি সেভ`;
  }

  /* ───────────── ভয়েস/টেক্সট কমান্ড ───────────── */
  async function intercept(raw) {
    const text = String(raw || "").trim(); if (!text) return false;
    if (/(মেসেজ|মেসেজের)\s*(হিস্টরি|ইতিহাস)\s*(খোলো|দেখাও|দেখি)/.test(text)) { await open(); return true; }
    let m = text.match(/^(?:মেসেজ\s*হিস্টরি|হিস্টরি\s*সেভ|মেসেজ\s*সেভ)\s*(চালু|অন|বন্ধ|অফ)(?:\s*করো)?$/);
    if (m) {
      const p = PLUG(); if (!p) { say("এটা শুধু Android অ্যাপে চলে।"); return true; }
      const on = /(চালু|অন)/.test(m[1]);
      try { st.status = await p.setConfig({ enabled: on }); } catch (_) {}
      say(on ? (st.status && st.status.access ? "মেসেজ হিস্টরি চালু। এখন থেকে আসা মেসেজ সেভ হবে।" : "চালু করলাম, কিন্তু নোটিফিকেশন অ্যাক্সেস দিতে হবে। মেসেজ হিস্টরি খুলে “অ্যাক্সেস দাও” চাপো।") : "মেসেজ হিস্টরি বন্ধ। আগের সেভ করা মেসেজ থাকবে।");
      refreshHome(); return true;
    }
    if (/(মুছে\s*ফেলা|ডিলিট\s*করা|আনসেন্ড)\s*(করা\s*)?(মেসেজ|মেসেজগুলো)?.*(দেখাও|পড়ো|পড়ে\s*শোনাও|কী|কি)/.test(text) && /(মুছে|ডিলিট|আনসেন্ড)/.test(text) && /মেসেজ/.test(text)) {
      const p = PLUG(); if (!p) { say("এটা শুধু Android অ্যাপে চলে।"); return true; }
      try {
        const r = await p.list({ limit: 5, unsentOnly: true });
        const it = (r && r.items) || [];
        if (!it.length) { say("মুছে ফেলা হয়েছে মনে হওয়া কোনো মেসেজ নেই। (সব মেসেজ দেখতে “মেসেজ হিস্টরি খোলো”)"); return true; }
        say("মুছে ফেলা মনে হওয়া সাম্প্রতিক মেসেজ:\n" + it.map((x) => `• ${x.convo || x.sender}: ${x.body}`).join("\n"), true);
      } catch (_) { say("হিস্টরি পড়তে পারলাম না।"); }
      return true;
    }
    m = text.match(/^(.{2,40}?)\s*(?:এর|র|-এর)\s*(?:সর্বশেষ\s*|শেষ\s*|আগের\s*)?মেসেজ(?:গুলো)?\s*(?:দেখাও|পড়ো|পড়ে\s*শোনাও|কী\s*ছিল|কি\s*ছিল)$/);
    if (m) {
      const p = PLUG(); if (!p) return false;
      try {
        const r = await p.list({ limit: 5, q: m[1].trim() });
        const it = (r && r.items) || [];
        if (!it.length) { say(`“${m[1].trim()}”-এর কোনো সেভ করা মেসেজ পাইনি।`); return true; }
        say(`${m[1].trim()}-এর সাম্প্রতিক মেসেজ:\n` + it.map((x) => `• ${x.body}${x.unsent ? " (মুছে ফেলা মনে হয়)" : ""}`).join("\n"), true);
      } catch (_) { say("হিস্টরি পড়তে পারলাম না।"); }
      return true;
    }
    return false;
  }

  function init() {
    const b = $("histBtn"); if (b) b.addEventListener("click", open);
    refreshHome();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshHome(); });
  }

  window.SanjuHistory = { open, intercept, refresh: refreshHome };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
