/* SANJU — API key পরীক্ষা ও পরিষ্কার
   • সেটিংসে “🔑 Key গুলো পরীক্ষা করো” বাটন: Groq ও Gemini key আসল সার্ভারে যাচাই করে বলে দেয় কোনটা কেন কাজ করছে না।
   • সেভ চাপার সময় key থেকে স্পেস, কোটেশন, “Bearer ” ও অদৃশ্য অক্ষর নিজে সরিয়ে দেয়।
   key স্ক্রিনে বা লগে দেখানো হয় না (শুধু প্রথম ৪ অক্ষর ও দৈর্ঘ্য)। */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);

  const clean = (v) => String(v == null ? "" : v)
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/^\s*bearer\s+/i, "")
    .replace(/["'`“”‘’]/g, "")
    .replace(/\s+/g, "");
  const kind = (k) => (/^gsk_/.test(k) ? "groq" : /^AIza/.test(k) ? "gemini" : /^sk-/.test(k) ? "openai" : "unknown");
  const peek = (k) => `${k.slice(0, 4)}… (${bn(k.length)} অক্ষর)`;

  function classify(service, status, body) {
    const b = String(body || "");
    if (status === 0) return { ok: false, text: "সার্ভারে পৌঁছাতে পারিনি — ইন্টারনেট বা VPN/ডেটা দেখো।" };
    if (status === 200) return { ok: true, text: "ঠিক আছে ✅ key কাজ করছে।" };
    if (service === "groq") {
      if (status === 401) return { ok: false, text: "❌ key ভুল, মেয়াদোত্তীর্ণ বা বাতিল (401)। console.groq.com/keys থেকে নতুন key বানিয়ে পেস্ট করো।" };
      if (status === 403) return { ok: false, text: "❌ Groq এই key/অঞ্চল/অ্যাকাউন্ট আটকে দিয়েছে (403)।" };
      if (status === 429) return { ok: true, text: "key ঠিক ✅ কিন্তু এই মুহূর্তে ব্যবহারের সীমা শেষ (429), একটু পরে চেষ্টা করো।" };
    } else {
      if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(b)) return { ok: false, text: "❌ Google বলছে key বৈধ নয় (400)। aistudio.google.com/apikey থেকে নতুন key নাও।" };
      if (status === 401) return { ok: false, text: "❌ key গৃহীত হয়নি (401)।" };
      if (status === 403) return { ok: false, text: "❌ অনুমতি নেই (403) — key বাতিল, বা Generative Language API বন্ধ, বা তোমার অঞ্চলে অনুমোদিত নয়।" };
      if (status === 429) return { ok: true, text: "key ঠিক ✅ কিন্তু ফ্রি লিমিট এখন শেষ (429)।" };
    }
    return { ok: false, text: `অপ্রত্যাশিত উত্তর (কোড ${bn(status)})।` };
  }

  async function probe(url, headers) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(url, { headers, signal: ctl.signal });
      const body = await r.text().catch(() => "");
      return { status: r.status, body };
    } catch (e) {
      return { status: 0, body: "" };
    } finally { clearTimeout(to); }
  }

  async function testOne(service, key) {
    const label = service === "groq" ? "Groq (চ্যাটের মস্তিষ্ক)" : "Gemini (আসল কণ্ঠস্বর)";
    if (!key) return { ok: service === "gemini", text: `${label}: ঘর খালি।${service === "groq" ? " Groq key ছাড়া উত্তর আসবে না।" : " থাকলে আসল ভয়েস পাবে, না থাকলে ফোনের ভয়েস।"}` };
    const k = kind(key);
    if (service === "groq" && (k === "gemini" || k === "openai")) return { ok: false, text: `${label}: ❌ এটা ${k === "gemini" ? "Gemini" : "OpenAI"} key (${peek(key)}), Groq ঘরে বসেছে। Groq key সবসময় gsk_ দিয়ে শুরু হয়।` };
    if (service === "gemini" && (k === "groq" || k === "openai")) return { ok: false, text: `${label}: ❌ এটা ${k === "groq" ? "Groq" : "OpenAI"} key (${peek(key)}), Gemini ঘরে বসেছে। Gemini key AIza দিয়ে শুরু হয়।` };
    const r = service === "groq"
      ? await probe("https://api.groq.com/openai/v1/models", { Authorization: "Bearer " + key })
      : await probe("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": key });
    const c = classify(service, r.status, r.body);
    const warn = service === "groq" && k === "unknown" && !c.ok ? " (key gsk_ দিয়ে শুরু হয়নি)" : "";
    return { ok: c.ok, text: `${label} ${peek(key)}: ${c.text}${warn}` };
  }

  async function runTest() {
    const out = $("keyTestOut"), btn = $("keyTestBtn");
    if (!out) return;
    btn.disabled = true; out.textContent = "পরীক্ষা করছি…";
    const g = clean(($("apiKeyInput") || {}).value);
    const m = clean(($("geminiKeyInput") || {}).value);
    const [a, b] = await Promise.all([testOne("groq", g), testOne("gemini", m)]);
    out.textContent = (a.ok ? "✅ " : "⚠️ ") + a.text + "\n\n" + (b.ok ? "✅ " : "⚠️ ") + b.text + "\n\nসব ঠিক থাকলে “সেভ করুন” চাপো।";
    out.style.whiteSpace = "pre-wrap";
    btn.disabled = false;
  }

  function init() {
    const save = $("saveSettings"); if (!save) return;
    if (!$("keyTestBtn")) {
      const row = document.createElement("div");
      row.innerHTML = '<button type="button" class="btn ghost" id="keyTestBtn">🔑 Key গুলো পরীক্ষা করো</button><p class="hint-text" id="keyTestOut" style="margin-top:8px"></p>';
      (save.parentElement || save).insertAdjacentElement("beforebegin", row);
      $("keyTestBtn").addEventListener("click", runTest);
    }
    // সেভের ঠিক আগে key পরিষ্কার (app.js-এর হ্যান্ডলারের আগে চলে)
    save.addEventListener("click", () => {
      ["apiKeyInput", "geminiKeyInput", "youtubeKeyInput"].forEach((id) => { const el = $(id); if (el && el.value) el.value = clean(el.value); });
    }, true);
  }

  window.SanjuKeyTest = { clean, kind, classify };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
