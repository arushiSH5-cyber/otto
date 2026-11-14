// Otto: vanilla JS, no build step, no remote calls. Words live in i18n.js (T).
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const VOICE_LANG = { en: "en-US", es: "es-MX", hi: "hi-IN", zh: "zh-CN", vi: "vi-VN", tl: "fil-PH" };

let lang = "en";
try { lang = localStorage.getItem("otto-lang") || "en"; } catch (e) {}
let settings = { name: "Rosa", contact_name: "Maria" };
let history = [];
let lane = { question: "", photo_id: null };
const t = (k, vars = {}) => {
  let s = (T[lang] && T[lang][k]) ?? T.en[k] ?? k;
  if (typeof s === "string") for (const [a, b] of Object.entries(vars)) s = s.replace("{" + a + "}", b);
  return s;
};

function applyLang() {
  document.documentElement.lang = lang;
  $("#lang").value = lang;
  $$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $$("[data-ph]").forEach((el) => (el.placeholder = t(el.dataset.ph)));
  $("#quick").innerHTML = "";
  t("quick").forEach((q) => {
    const b = document.createElement("button"); b.textContent = q; b.type = "button";
    b.onclick = () => talk(q); $("#quick").append(b);
  });
  tickClock();
}

// ---------- the world: real time of day, clock for orientation ----------
function tickClock() {
  const now = new Date(), h = now.getHours(), loc = VOICE_LANG[lang];
  $("#day").textContent = now.toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric" });
  $("#time").textContent = now.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
  if (!document.body.classList.contains("storm")) {
    const phase = h < 6 || h >= 20 ? "night" : h < 8 ? "dawn" : h >= 17 ? "dusk" : "day";
    document.body.classList.remove("night", "dawn", "dusk", "day"); document.body.classList.add(phase);
  }
}
function greeting() {
  const h = new Date().getHours();
  return t(h < 12 ? "greet_m" : h < 17 ? "greet_a" : "greet_e", { n: settings.name }) + " " + t("hello").replace(/^[^!]*!\s*/, "");
}

// ---------- Otto: moods + voice ----------
const owl = $("#owl");
let moodTimer = null;
function mood(m, ms = 0) {
  owl.classList.remove("mood-happy", "mood-worried", "mood-detective", "mood-storm", "mood-listen");
  if (m) owl.classList.add("mood-" + m);
  clearTimeout(moodTimer);
  if (ms) moodTimer = setTimeout(() => mood(document.body.classList.contains("storm") ? "storm" : null), ms);
}
function hop() { owl.classList.remove("hop"); void owl.offsetWidth; owl.classList.add("hop"); setTimeout(() => owl.classList.remove("hop"), 1000); }
function happy() { hop(); mood("happy", 2600); }

function pickVoice() {
  const want = VOICE_LANG[lang], voices = speechSynthesis.getVoices().filter((v) => v.localService !== false);
  return voices.find((v) => v.lang === want) || voices.find((v) => v.lang.startsWith(want.slice(0, 2))) ||
         (lang === "tl" ? voices.find((v) => v.lang.startsWith("fil")) : null);
}
const clean = (s) => s.replace(/[*_#`]+/g, "");
let speaking = 0;
function speak(text) {  // queue one sentence; Otto's beak moves while any are queued
  if (!("speechSynthesis" in window)) return;
  const s = clean(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim(); if (!s) return;
  const u = new SpeechSynthesisUtterance(s);
  const v = pickVoice(); if (v) u.voice = v;
  u.lang = VOICE_LANG[lang]; u.rate = 0.9; u.pitch = 1.1;
  speaking++; owl.classList.add("talking");
  u.onend = u.onerror = () => { if (--speaking <= 0) { speaking = 0; owl.classList.remove("talking"); } };
  speechSynthesis.speak(u);
}
function hush() { speechSynthesis?.cancel(); speaking = 0; owl.classList.remove("talking"); }
function say(text, { voice = true } = {}) {
  text = clean(text); $("#bubble").textContent = text;
  if (voice) { hush(); speak(text); }
  else { owl.classList.add("talking"); setTimeout(() => !speaking && owl.classList.remove("talking"), Math.min(4000, 400 + text.length * 40)); }
}
function showMeta(r) {
  if (!r || r.latency_s === undefined) return;
  const s = r.model === "safety rule" ? "🛡️ safety rule · answered in code, instantly"
    : `⚡ on-device · ${r.model} · ${r.first_s ? `first word ${r.first_s} s · ` : ""}${r.latency_s} s${r.tok_s ? ` · ${r.tok_s} tok/s` : ""}${r.backend && r.backend !== "mac" ? ` · ${r.backend}` : ""}`;
  $("#meta").textContent = s;
}

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------- navigation ----------
let current = null;
function go(name) {
  if (current === "storm" && name !== "storm") stopStorm();
  current = name;
  $$(".panel").forEach((p) => (p.hidden = true));
  $("#home").hidden = !!name;
  if (name) { $("#p-" + name).hidden = false; $("#p-" + name).scrollIntoView({ behavior: "smooth", block: "start" }); }
  else window.scrollTo({ top: 0, behavior: "smooth" });
  mood(null);
  if (name === "memories") renderBook();
  if (name === "storm") startStorm();
  if (name === "settings") fillSettings();
  if (name === "scam") { $("#verdict").hidden = true; mood("detective"); say(t("sub_scam") + " 🔍"); }
  if (name === "talk") { $("#laneForm").hidden = true; $("#lanePhoto").hidden = true; }
}
$$("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
$$(".back").forEach((b) => { if (b.id !== "noticeFine") b.onclick = () => go(null); });
$("#gear").onclick = () => go("settings");
$("#lang").onchange = (e) => { lang = e.target.value; try { localStorage.setItem("otto-lang", lang); } catch (x) {} applyLang(); say(greeting()); happy(); };

// ---------- Talk (streamed: words appear as they're made, spoken sentence by sentence) ----------
async function talk(text) {
  if (!text.trim()) return;
  if (current !== "talk") go("talk");
  history.push({ role: "user", content: text });
  hush();
  const bubble = $("#bubble");
  bubble.innerHTML = '<span class="cursor"></span>';
  let full = "", spoken = 0;
  const flush = (final) => {  // speak each finished sentence right away
    const rest = full.slice(spoken);
    const m = final ? [rest] : rest.match(/^[\s\S]*?[.!?。！？](\s|$)/);
    if (m && m[0].trim()) { speak(m[0]); spoken += m[0].length; if (!final) flush(false); }
  };
  try {
    const r = await fetch("/api/chat/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history, lang }) });
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = "", done = null;
    while (true) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line) continue;
        const d = JSON.parse(line);
        if (d.t) { full += d.t; bubble.textContent = clean(full); bubble.insertAdjacentHTML("beforeend", '<span class="cursor"></span>'); flush(false); }
        if (d.replace) { full = d.replace; hush(); spoken = 0; }
        if (d.done) done = d.done;
      }
    }
    bubble.textContent = clean(full); flush(true);
    history.push({ role: "assistant", content: full });
    showMeta(done);
    if (done?.safety) mood("worried", 4000);
    else if (/[!😊😄🦉😸]|ja|haha|jeje/i.test(full)) happy();
  } catch (e) { say("Hoo… I had a little hiccup. Let's try again."); }
}
$("#talkForm").onsubmit = (e) => { e.preventDefault(); const v = $("#talkIn").value; $("#talkIn").value = ""; talk(v); };

// ---------- Voice in: tap, talk, tap. 16 kHz WAV → LFM3-Audio on this device ----------
let rec = null;
async function startRec() {
  hush();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1), chunks = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc); proc.connect(ctx.destination);
  rec = { stream, ctx, proc, chunks, rate: ctx.sampleRate, stopAt: setTimeout(stopRec, 20000) };
  $("#mic").classList.add("rec"); $("#micLabel").textContent = t("listening"); mood("listen");
}
function toWav(chunks, rate) {
  const len = chunks.reduce((a, c) => a + c.length, 0), all = new Float32Array(len); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const ratio = rate / 16000, n = Math.floor(len / ratio), pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) pcm[i] = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)])) * 0x7fff;
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (p, s) => [...s].forEach((ch, i) => v.setUint8(p + i, ch.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(pcm);
  let bin = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function stopRec() {
  if (!rec) return;
  const r = rec; rec = null; clearTimeout(r.stopAt);
  r.proc.disconnect(); r.stream.getTracks().forEach((x) => x.stop()); r.ctx.close();
  $("#mic").classList.remove("rec"); $("#mic").classList.add("busy"); $("#micLabel").textContent = t("hearing");
  try {
    const res = await api("/api/asr", { audio: toWav(r.chunks, r.rate), lang });
    mood(null);
    if (!res.text) throw new Error("empty");
    if (!$("#laneForm").hidden) { $("#laneIn").value = res.text; $("#laneIn").focus(); }   // answering Memory Lane
    else if (current === "scam") { $("#scamText").value = res.text; }
    else talk(res.text);
    $("#meta").textContent = `🎙️ heard on-device · ${res.model} · ${res.latency_s} s`;
  } catch (e) { mood("worried", 2500); say(t("mic_fail")); }
  $("#mic").classList.remove("busy"); $("#micLabel").textContent = t("mic");
}
$("#mic").onclick = () => (rec ? stopRec() : startRec().catch(() => say(t("mic_fail"))));

// ---------- Memory Lane (questions, or an old photo Otto looks at) ----------
$("#laneBtn").onclick = async () => {
  $("#bubble").textContent = t("thinking"); lane = { question: "", photo_id: null }; $("#lanePhoto").hidden = true;
  const r = await api("/api/memory/question", { messages: [], lang });
  lane.question = r.text; say(r.text); showMeta(r);
  $("#laneForm").hidden = false; $("#laneIn").focus();
};
$("#photoFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = await shrink(f, 768);
  $("#lanePhoto").hidden = false; $("#lanePhoto img").src = img;
  mood("listen"); $("#bubble").textContent = t("thinking");
  const r = await api("/api/photo/ask", { image: img, lang });
  lane = { question: r.text, photo_id: r.photo_id };
  say(r.text); showMeta(r); happy();
  $("#laneForm").hidden = false; $("#laneIn").focus(); e.target.value = "";
};
$("#laneForm").onsubmit = async (e) => {
  e.preventDefault();
  const answer = $("#laneIn").value.trim(); if (!answer) return;
  $("#bubble").textContent = t("thinking");
  const r = await api("/api/memory", { question: lane.question, answer, lang, photo_id: lane.photo_id });
  $("#laneIn").value = ""; $("#laneForm").hidden = true; $("#lanePhoto").hidden = true;
  say(`${r.text}  📖 “${r.memory.title}”`); showMeta(r); happy(); confetti();
};
async function renderBook() {
  $("#bookTitle").textContent = t("book_title", { n: settings.name });
  const mems = await api("/api/memories");
  const book = $("#book"); book.innerHTML = "";
  say(mems.length ? t("book_title", { n: settings.name }) + " 📖" : t("no_mem"));
  for (const m of mems) {
    const c = document.createElement("article"); c.className = "mem";
    c.innerHTML = `${m.photo_id ? `<img src="/api/photo/${m.photo_id}" alt="">` : ""}<h4></h4><div class="d"></div><div class="q"></div><p></p>`;
    c.querySelector("h4").textContent = m.title;
    c.querySelector(".d").textContent = new Date(m.date + "T12:00").toLocaleDateString(VOICE_LANG[m.lang] || "en-US", { year: "numeric", month: "long", day: "numeric" });
    c.querySelector(".q").textContent = m.question; c.querySelector("p").textContent = m.answer;
    book.append(c);
  }
}
$("#printBtn").onclick = () => window.print();

// ---------- Scam Check ----------
function shrink(file, max) {
  return new Promise((ok) => {
    const rd = new FileReader();
    rd.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement("canvas");
      cv.width = img.width * k; cv.height = img.height * k; cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      ok(cv.toDataURL("image/jpeg", 0.85)); }; img.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
let scamImage = null;
$("#scamFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  scamImage = await shrink(f, 1024); $("#scamImg").src = scamImage; $("#scamImg").hidden = false;
};
$("#scamGo").onclick = async () => {
  const text = $("#scamText").value.trim();
  if (!scamImage && !text) return;
  say(t("reading")); mood("detective"); owl.classList.add("talking");
  $("#verdict").hidden = true;
  try { const r = await api("/api/scam", { image: scamImage, text: text || null, lang }); showMeta(r); renderVerdict(r); }
  catch (e) { renderVerdict({ verdict: "unsure", contact: settings.contact_name }); }
  owl.classList.remove("talking");
};
function renderVerdict(r) {
  const v = $("#verdict"), c = r.contact || settings.contact_name || "family", res = r.result;
  const pct = res ? Math.round(res.scam_prob * 100) : null, bad = r.verdict === "scam" || r.verdict === "dont_pay";
  const head = t("v_" + r.verdict) + (pct !== null && r.verdict !== "ok" ? `: ${pct}%` : "");
  const advice = t("a_" + r.verdict).replace("{c}", c);
  v.className = "verdict v-" + r.verdict;
  v.innerHTML = `<h3></h3><div class="advice"></div><div class="bars"></div><ul></ul>`;
  v.querySelector("h3").textContent = (r.verdict === "ok" ? "✅ " : r.verdict === "unsure" ? "🤔 " : "🚫 ") + head;
  v.querySelector(".advice").textContent = advice;
  if (res) {
    for (const [k, p] of [["f_money", res.asks_for_money], ["f_gift", res.asks_for_gift_cards], ["f_pass", res.asks_for_password], ["f_urg", res.urgency_pressure]]) {
      const n = Math.round(p * 100), col = n >= 60 ? "var(--red)" : n >= 35 ? "var(--amber)" : "var(--green)";
      const b = document.createElement("div"); b.className = "bar";
      b.innerHTML = `<span></span><div class="track"><div class="fill" style="width:0;background:${col}"></div></div><b>${n}%</b>`;
      b.querySelector("span").textContent = t(k); v.querySelector(".bars").append(b);
      setTimeout(() => (b.querySelector(".fill").style.width = n + "%"), 60);
    }
    (res.reasons || []).slice(0, 3).forEach((x) => { const li = document.createElement("li"); li.textContent = x; v.querySelector("ul").append(li); });
  }
  if (r.verdict !== "ok") {  // turn the verdict into an action
    const phone = (settings.contact_phone || "").replace(/[^\d+]/g, "");
    v.insertAdjacentHTML("beforeend", `<a class="call" href="tel:${phone}">📞 <span></span></a>`);
    v.querySelector(".call span").textContent = t("call", { c }) + (settings.contact_phone ? ` · ${settings.contact_phone}` : "");
  }
  if (bad) {
    v.insertAdjacentHTML("beforeend", `<div class="script"><b></b><p></p></div>`);
    v.querySelector(".script b").textContent = t("callback"); v.querySelector(".script p").textContent = t("callback_line");
  }
  v.hidden = false; v.scrollIntoView({ behavior: "smooth", block: "center" });
  say(`${head}. ${advice}`);
  if (r.verdict === "ok") happy(); else mood("worried");
}

// ---------- Storm Mode ----------
let stepIdx = -1, checkTimer = null, alarmTimer = null, tickTimer = null, beepCtx = null, beepTimer = null;
const CHECK_EVERY = () => (settings.demo ? 60 : 30 * 60) * 1000;
const ALARM_AFTER = () => (settings.demo ? 15 : 120) * 1000;

function startStorm() {
  stepIdx = -1; clearTimers();
  document.body.classList.add("storm"); document.body.classList.remove("night", "dawn", "dusk", "day");
  mood("storm");
  $("#steps").innerHTML = t("steps").map((s) => `<li>${s}</li>`).join("");
  $("#stepNext").hidden = false; $("#checkStatus").textContent = "";
  showBattery();
  say(t("storm_intro"));
}
$("#stepNext").onclick = () => {
  const lis = $$("#steps li");
  if (stepIdx >= 0) lis[stepIdx].className = "done";
  stepIdx++;
  if (stepIdx < lis.length) { lis[stepIdx].className = "on"; say(t("steps")[stepIdx]); }
  else { $("#stepNext").hidden = true; say(t("storm_done")); hop(); setTimeout(checkIn, 2500); }
};
function checkIn() {
  clearTimers();
  $("#checkin").hidden = false; say(t("areyouok"));
  let left = ALARM_AFTER() / 1000;
  $("#countdown").textContent = "⏳ " + left;
  tickTimer = setInterval(() => { left--; $("#countdown").textContent = "⏳ " + Math.max(0, left); }, 1000);
  alarmTimer = setTimeout(raiseAlarm, ALARM_AFTER());
}
function raiseAlarm() {
  clearInterval(tickTimer); hush();
  $("#checkin").hidden = true;
  $("#a-name").textContent = `My name is ${settings.name}`;
  $("#a-medical").textContent = settings.medical || "";
  $("#a-contact").textContent = `${settings.contact_relation || ""} ${settings.contact_name}: ${settings.contact_phone}`;
  $("#alarm").hidden = false;
  startBeeps();
}
function startBeeps() {
  try {
    beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)(); beepCtx.resume();
    const beep = () => [0, 0.25].forEach((dt) => {
      const o = beepCtx.createOscillator(), g = beepCtx.createGain();
      o.type = "square"; o.frequency.value = dt ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, beepCtx.currentTime + dt);
      g.gain.exponentialRampToValueAtTime(0.5, beepCtx.currentTime + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + dt + 0.22);
      o.connect(g).connect(beepCtx.destination); o.start(beepCtx.currentTime + dt); o.stop(beepCtx.currentTime + dt + 0.24);
    });
    beep(); beepTimer = setInterval(beep, 700);
  } catch (e) {}
}
function imOk() {
  clearInterval(beepTimer); beepTimer = null;
  $("#alarm").hidden = true; $("#checkin").hidden = true;
  clearTimers();
  say(t("ok_thanks")); hop(); mood("happy", 2500);
  let left = CHECK_EVERY() / 1000;
  const show = () => ($("#checkStatus").textContent = "🕰️ " + t("next_check").replace("{s}", left));
  show(); tickTimer = setInterval(() => { left--; show(); }, 1000);
  checkTimer = setTimeout(checkIn, CHECK_EVERY());
}
$$("[data-ok]").forEach((b) => (b.onclick = imOk));
function clearTimers() { clearTimeout(checkTimer); clearTimeout(alarmTimer); clearInterval(tickTimer); }
function stopStorm() {
  clearTimers(); clearInterval(beepTimer); beepTimer = null;
  $("#alarm").hidden = true; $("#checkin").hidden = true; $("#checkStatus").textContent = "";
  document.body.classList.remove("storm"); mood(null); tickClock();
}
document.addEventListener("pointerdown", () => { try { beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)(); beepCtx.resume(); } catch (e) {} }, { once: true });

// ---------- Otto notices: Wi-Fi drops or the power goes out ----------
let battery = null;
async function showBattery() {
  const el = $("#battery");
  if (!battery) { el.hidden = true; return; }
  el.hidden = false; el.textContent = "🔋 " + t("battery", { b: Math.round(battery.level * 100) }) + (battery.charging ? " ⚡" : "");
}
function notice(key) {
  if (current === "storm" || !$("#alarm").hidden) return;
  $("#noticeText").textContent = t(key);
  $("#notice").hidden = false; hop(); mood("storm");
  say(t(key));
}
$("#noticeStorm").onclick = () => { $("#notice").hidden = true; go("storm"); };
$("#noticeFine").onclick = () => { $("#notice").hidden = true; mood("happy", 2000); say(t("ok_thanks")); };
window.addEventListener("offline", () => { badge(); notice("offline_hi"); });
window.addEventListener("online", badge);
navigator.getBattery?.().then((b) => {
  battery = b;
  b.addEventListener("chargingchange", () => { if (!b.charging) notice("power_hi"); showBattery(); });
  b.addEventListener("levelchange", showBattery);
}).catch(() => {});

// ---------- Settings ----------
const FIELDS = ["name", "medical", "contact_relation", "contact_name", "contact_phone"];
function fillSettings() { FIELDS.forEach((f) => ($("#s-" + f).value = settings[f] || "")); $("#s-demo").checked = !!settings.demo; }
$("#saveSettings").onclick = async () => {
  const s = {}; FIELDS.forEach((f) => (s[f] = $("#s-" + f).value)); s.demo = $("#s-demo").checked;
  settings = await api("/api/settings", s); go(null); say("👍 " + greeting(), { voice: false }); happy();
};

// ---------- Offline badge: server-side counter + browser-side resource check ----------
async function badge() {
  let bytes = 0, reqs = 0;
  try { const s = await api("/api/status"); bytes += s.external_bytes; reqs += s.external_requests; } catch (e) {}
  for (const e of performance.getEntriesByType("resource")) {
    if (new URL(e.name, location.href).origin !== location.origin) { reqs++; bytes += e.transferSize || 0; }
  }
  const b = $("#badge");
  b.textContent = `${navigator.onLine ? "📶 Wi-Fi on" : "📴 Offline ✓"} · ${bytes} bytes sent` + (reqs ? ` (${reqs} req)` : "");
  b.classList.toggle("offline", !navigator.onLine && !reqs);
  b.classList.toggle("warn", reqs > 0);
}

// ---------- little joys ----------
// Otto's eyes follow your finger or mouse.
const look = $("#look");
window.addEventListener("pointermove", (e) => {
  const r = owl.getBoundingClientRect(), cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.42;
  const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
  look.style.transform = `translate(${(dx / d) * 5 * k}px, ${(dy / d) * 4 * k}px)`;
});
// Pet Otto: he squishes, giggles and hearts float up.
$(".perch").addEventListener("click", () => {
  owl.classList.remove("squish"); void owl.offsetWidth; owl.classList.add("squish");
  const h = $("#hearts");
  for (let i = 0; i < 5; i++) {
    const s = document.createElement("span"); s.textContent = ["💗", "💜", "💛", "🩵", "✨"][i];
    s.style.left = 30 + Math.random() * 40 + "%"; s.style.top = 30 + Math.random() * 20 + "%";
    s.style.setProperty("--r", (Math.random() * 60 - 30) + "deg"); s.style.animationDelay = i * 0.08 + "s";
    h.append(s); setTimeout(() => s.remove(), 1900);
  }
  const lines = TICKLE[lang] || TICKLE.en;
  say(lines[Math.floor(Math.random() * lines.length)]); mood("happy", 2000);
});
// A small sparkle burst on every button tap.
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("button, .wide-btn, .call, .tile")) return;
  for (let i = 0; i < 7; i++) {
    const s = document.createElement("span"); s.className = "spark"; s.textContent = ["✦", "✧", "·", "♡"][i % 4];
    const a = (i / 7) * Math.PI * 2, d = 40 + Math.random() * 30;
    s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px";
    s.style.color = ["#c3a6ea", "#f4a7b9", "#9fc2ea", "#f9c98f"][i % 4];
    s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px");
    document.body.append(s); setTimeout(() => s.remove(), 850);
  }
});
// Confetti of hearts and stars when a memory is saved.
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 28; i++) {
    const c = document.createElement("span"); c.className = "confetti";
    c.textContent = ["💗", "✦", "🌸", "⭐", "💜", "✧"][i % 6];
    c.style.left = Math.random() * 100 + "vw"; c.style.animationDelay = Math.random() * 0.6 + "s";
    c.style.fontSize = 16 + Math.random() * 16 + "px";
    document.body.append(c); setTimeout(() => c.remove(), 3200);
  }
}

// ---------- start ----------
(async () => {
  applyLang();
  try { settings = await api("/api/settings"); } catch (e) {}
  speechSynthesis?.getVoices();
  say(greeting(), { voice: false });
  badge(); setInterval(badge, 3000); setInterval(tickClock, 15000);
  runDemo(new URLSearchParams(location.search).get("demo"));
})();

// Demo links for presenting + README screenshots: ?demo=scam | storm | offline | memories | talk | night | alarm
async function runDemo(d) {
  if (!d) return;
  const quiet = () => hush();
  if (d === "night") { document.body.className = "night"; say(greeting(), { voice: false }); }
  if (d === "talk") { const m = $("#meta"); lang = "es"; applyLang(); await talk("Hola Otto, cuéntame un chiste de búhos"); quiet(); const keep = m.textContent; go(null); m.textContent = keep; }
  if (d === "scam") { go("scam"); $("#scamText").value = "IRS FINAL NOTICE: You owe $2,480 in back taxes. Pay TODAY with Target gift cards or a warrant for your arrest will be issued. Call (555) 013-7788."; await $("#scamGo").onclick(); quiet(); setTimeout(() => $("#verdict").scrollIntoView({ block: "center" }), 900); }
  if (d === "storm") { go("storm"); $("#stepNext").click(); $("#stepNext").click(); quiet(); window.scrollTo(0, 0); }
  if (d === "offline") { notice("offline_hi"); quiet(); }
  if (d === "alarm") { go("storm"); raiseAlarm(); clearInterval(beepTimer); }
  if (d === "memories") { go("memories"); quiet(); }
}
