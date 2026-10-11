/* SANJU EXTRAS v4.3 — UI: এক্সট্রা প্যানেল • লক স্ক্রিন */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SP = () => window.SanjuExtras;
  const app = () => window.__sanjuApp || {};
  const P = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const money = (n) => "৳" + bn(Math.round(n));
  const open = (id) => (app().openModal ? app().openModal(id) : $(id) && $(id).classList.add("open"));
  const close = (id) => (app().closeModal ? app().closeModal(id) : $(id) && $(id).classList.remove("open"));

  /* ───────────── প্লাস প্যানেল ───────────── */
  function panelHtml() {
    return `<div class="modal reticle extras-modal">
      <h2>এক্সট্রা ফিচার</h2>
      <p class="hint-text">কমান্ড ভয়েসে বা লিখেও বলা যায়। উদাহরণ প্রতিটি অংশে দেওয়া আছে।</p>

      <details open><summary>দৈনিক ব্রিফ</summary>
        <p class="hint-text">তারিখ, আবহাওয়া, আজকের রিমাইন্ডার ও খরচ একসাথে। বলো: “আজকের ব্রিফ”।</p>
        <div class="plus-row"><button class="btn primary" id="plusBriefNow">এখন শোনাও</button></div>
        <label class="ca-switch"><input type="checkbox" id="plusAutoBrief"/><span>রোজ সকালে অ্যাপ খুললে নিজে শোনাবে</span></label>
      </details>

      <details><summary>রুটিন <b id="plusRoutCount"></b></summary>
        <p class="hint-text">“রুটিন বানাও ঘুম: ডিস্টার্ব করো না চালু, ভলিউম ০ করো”। চালাতে: “ঘুম রুটিন চালাও”। সময়ে চালাতে: “প্রতিদিন রাত ১০টায় ঘুম রুটিন চালাও”। অটো-রানে কল/মেসেজ/মোছার ধাপ চলে না।</p>
        <div id="plusRoutList" class="plus-list"></div>
      </details>

      <details><summary>খরচের হিসাব</summary>
        <p class="hint-text">“খরচ ৫০০ বাজার” • “এই মাসের খরচ কত”। হিসাব শুধু এই ফোনে থাকে।</p>
        <div id="plusExp" class="plus-box"></div>
      </details>

      <details><summary>লোকেশন ট্রিগার</summary>
        <p class="hint-text">ওই জায়গায় গিয়ে বলো “লোকেশন সেভ করো বাড়ি”। তারপর “বাড়ি পৌঁছালে ওয়াইফাই অন করো”। শুধু অ্যাপ খোলা থাকলে কাজ করে।</p>
        <div id="plusGeo" class="plus-list"></div>
        <label class="ca-switch"><input type="checkbox" id="plusGeoOn"/><span>লোকেশন ট্রিগার চালু</span></label>
      </details>

      <details><summary>ভয়েস ও অন্যান্য</summary>
        <label class="ca-switch"><input type="checkbox" id="plusDriving"/><span>ড্রাইভিং মোড (বড় মাইক বাটন, স্ক্রিন জাগানো)</span></label>
        <label for="plusTrans">অনুবাদ মোড</label>
        <select id="plusTrans"><option value="">বন্ধ</option><option value="ইংরেজি">বলা কথা ইংরেজিতে</option><option value="হিন্দি">বলা কথা হিন্দিতে</option><option value="বাংলা">বলা কথা বাংলায়</option></select>
        <div class="plus-row"><button class="btn ghost" id="plusDoc">ডকুমেন্ট/ছবির লেখা পড়ো</button></div>
      </details>

      <details><summary>নিরাপত্তা: অ্যাপ লক</summary>
        <p class="hint-text">PIN দিলে অ্যাপ খুলতে বা ১ মিনিট বাইরে থাকার পর ফিরতে PIN লাগবে। PIN ভুলে গেলে অ্যাপের ডেটা মুছে নতুন করে শুরু করতে হবে।</p>
        <input type="password" inputmode="numeric" id="plusPin" placeholder="নতুন PIN (৪–৮ সংখ্যা)" maxlength="8"/>
        <div class="plus-row"><button class="btn primary" id="plusPinSet">PIN সেট করো</button><button class="btn ghost" id="plusPinOff">লক বন্ধ</button></div>
        <p class="hint-text" id="plusPinMsg"></p>
      </details>

      <details><summary>ব্যাকআপ ও স্কিল শেয়ার</summary>
        <p class="hint-text">API key ও টোকেন ব্যাকআপে যায় না। টেক্সট কপি করে নিজের কাছে রাখো, নতুন ফোনে নিচের ঘরে বসিয়ে “ইমপোর্ট” চাপো।</p>
        <textarea id="plusBackup" rows="4" placeholder="ব্যাকআপ এখানে আসবে / এখানে বসাও"></textarea>
        <div class="plus-row"><button class="btn ghost" id="plusExpAll">সব ডেটা</button><button class="btn ghost" id="plusExpSkill">শুধু স্কিল ও রুটিন</button><button class="btn ghost" id="plusCopy">কপি</button><button class="btn primary" id="plusImport">ইমপোর্ট</button></div>
        <p class="hint-text" id="plusBackMsg"></p>
      </details>

      <div class="modal-actions"><button class="btn primary" id="plusClose">বন্ধ করো</button></div>
    </div>`;
  }

  function render() {
    const sp = SP(); if (!sp) return;
    const c = sp.cfg();
    $("plusAutoBrief").checked = !!c.autoBrief; $("plusGeoOn").checked = c.geoOn !== false;
    $("plusDriving").checked = !!c.driving; $("plusTrans").value = c.translateTo || "";
    const rs = sp.getRoutines(); $("plusRoutCount").textContent = rs.length ? `(${bn(rs.length)})` : "";
    $("plusRoutList").innerHTML = rs.length ? rs.map((r, i) => `<div class="list-item"><span><b>${esc(r.name)}</b><small> ${esc(r.steps.join(" → "))}</small></span><span class="plus-btns"><button class="del-btn" data-run="${i}" aria-label="চালাও">▶</button><button class="del-btn" data-rout="${i}" aria-label="মুছো">✕</button></span></div>`).join("") : '<p class="hint-text">কোনো রুটিন নেই।</p>';
    const m = sp.expSummary("month"), d = sp.expSummary("day");
    $("plusExp").innerHTML = m.items.length ? `আজ ${money(d.total)} • এই মাসে ${money(m.total)}<br>` + Object.entries(m.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)}: ${money(v)}`).join(" • ") : "এ মাসে কোনো খরচ লেখা নেই।";
    const places = sp.getPlaces(), geos = sp.getGeo();
    $("plusGeo").innerHTML = (places.length ? `<p class="hint-text">সেভ করা জায়গা: ${places.map((p) => esc(p.name)).join(", ")}</p>` : '<p class="hint-text">কোনো জায়গা সেভ নেই।</p>') +
      geos.map((g, i) => `<div class="list-item"><span>${esc(g.place)} → ${esc(g.command)}</span><button class="del-btn" data-geo="${i}" aria-label="মুছো">✕</button></div>`).join("");
  }

  function buildPanel() {
    const ov = document.createElement("div"); ov.className = "modal-overlay"; ov.id = "extrasModal"; ov.innerHTML = panelHtml();
    document.body.appendChild(ov);
    ov.addEventListener("click", async (e) => {
      const t = e.target; const sp = SP(); if (!sp || !t) return;
      if (t.dataset.rout != null) { const a = sp.getRoutines(); a.splice(+t.dataset.rout, 1); sp.saveRoutines(a); render(); }
      else if (t.dataset.run != null) { close("extrasModal"); sp.runRoutine(sp.getRoutines()[+t.dataset.run], false); }
      else if (t.dataset.geo != null) { const a = sp.getGeo(); a.splice(+t.dataset.geo, 1); sp.writeGeo(a); render(); }
    });
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    const chg = (id, fn) => { const el = $(id); if (el) el.addEventListener("change", fn); };
    on("plusClose", () => close("extrasModal"));
    on("plusBriefNow", () => { close("extrasModal"); SP().brief(); });
    chg("plusAutoBrief", (e) => SP().setCfg({ autoBrief: e.target.checked }));
    chg("plusGeoOn", (e) => { SP().setCfg({ geoOn: e.target.checked }); e.target.checked ? SP().startWatch() : SP().stopWatch(); });
    chg("plusDriving", (e) => SP().setDriving(e.target.checked));
    chg("plusTrans", (e) => { SP().setCfg({ translateTo: e.target.value }); });
    on("plusDoc", () => { close("extrasModal"); SP().pickDocument(); });
    on("plusPinSet", async () => { const r = await SP().setPin($("plusPin").value.trim()); $("plusPinMsg").textContent = r.msg; if (r.ok) $("plusPin").value = ""; });
    on("plusPinOff", async () => { const ok = await SP().removePin($("plusPin").value.trim()); $("plusPinMsg").textContent = ok ? "লক বন্ধ হয়েছে।" : "বন্ধ করতে বর্তমান PIN ঘরে লিখে আবার চাপো।"; if (ok) $("plusPin").value = ""; });
    on("plusExpAll", () => { $("plusBackup").value = SP().exportData("all"); $("plusBackMsg").textContent = "তৈরি। “কপি” চাপো।"; });
    on("plusExpSkill", () => { $("plusBackup").value = SP().exportData("skills"); $("plusBackMsg").textContent = "শুধু স্কিল ও রুটিন তৈরি। কপি করে শেয়ার করো।"; });
    on("plusCopy", async () => { try { await navigator.clipboard.writeText($("plusBackup").value); $("plusBackMsg").textContent = "কপি হয়েছে।"; } catch (_) { $("plusBackup").select(); $("plusBackMsg").textContent = "নিজে সিলেক্ট করে কপি করো।"; } });
    on("plusImport", () => { const r = SP().importData($("plusBackup").value.trim()); $("plusBackMsg").textContent = r.msg; render(); });
  }

  /* ───────────── লক স্ক্রিন ───────────── */
  function lockScreen(show) {
    let l = $("plusLock");
    if (!l) {
      l = document.createElement("div"); l.id = "plusLock"; l.className = "extras-lock";
      l.innerHTML = `<div class="extras-lock-card"><h2>SANJU লক করা</h2><input id="plusLockPin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off"/><button class="btn primary" id="plusLockGo">খোলো</button><p id="plusLockMsg" class="hint-text"></p></div>`;
      document.body.appendChild(l);
      let fails = 0, until = 0;
      const go = async () => {
        if (Date.now() < until) { $("plusLockMsg").textContent = `অপেক্ষা করো (${Math.ceil((until - Date.now()) / 1000)} সেকেন্ড)`; return; }
        const pin = $("plusLockPin").value.trim();
        if (await SP().unlock(pin)) { fails = 0; $("plusLockPin").value = ""; $("plusLockMsg").textContent = ""; }
        else { fails++; $("plusLockPin").value = ""; if (fails >= 5) { until = Date.now() + 30000; fails = 0; } $("plusLockMsg").textContent = "ভুল PIN।"; }
      };
      $("plusLockGo").onclick = go; $("plusLockPin").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    }
    l.style.display = show ? "flex" : "none";
    if (show) setTimeout(() => { const i = $("plusLockPin"); if (i) i.focus(); }, 80);
  }

  function init() {
    buildPanel(); render();
    const b = $("extrasBtn"); if (b) b.addEventListener("click", () => { render(); open("extrasModal"); });
    document.addEventListener("sanjuExtrasOpenPanel", () => { render(); open("extrasModal"); });
    document.addEventListener("sanjuExtrasLock", (e) => lockScreen(!!e.detail.locked));
    if (SP() && SP().isLocked()) lockScreen(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
