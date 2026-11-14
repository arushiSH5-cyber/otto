// Otto: vanilla JS, no build step, no remote calls.
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- words in her language ----------
const T = {
  en: { talk: "Talk to Otto", scam: "Is this a scam?", storm: "Storm Mode", memories: "Memories", send: "Send", lane: "Memory Lane",
    save: "Save my memory", back: "← Back", photo: "Take or choose a photo", check: "Check it", next: "Next", stop: "← Stop Storm Mode",
    settings: "Settings", areyouok: "Are you OK?", imok: "I'm OK", type: "Type to Otto…", answer: "Type your answer…",
    paste: "…or paste the message text here", foot: "Otto never gives medicine doses. In an emergency, call 911.",
    hello: "Hoo-hoo! Hello, I'm Otto. What shall we do today?", thinking: "Hmm, let me think…",
    quick: ["Tell me a joke", "Ask me trivia", "How are you?", "I feel lonely"],
    v_scam: "Likely a scam", v_dont_pay: "Likely a scam", v_unsure: "I'm not sure", v_ok: "Looks OK",
    a_dont_pay: "Don't pay or reply. Let's call family first.", a_scam: "Don't reply. Let's show {c} first.",
    a_unsure: "I'm not sure. Let's ask {c} before doing anything.", a_ok: "This looks OK. If it asks for money later, ask {c}.",
    f_money: "Asks for money", f_gift: "Asks for gift cards", f_pass: "Asks for password", f_urg: "Rushes you", reading: "Let me read it carefully…",
    steps: ["Use a flashlight, not candles.", "Keep the fridge and freezer closed.", "Drink some water.", "Stay inside, away from windows."],
    storm_intro: "The power is out. That's OK, I'm here with you. Let's do four calm steps.",
    storm_done: "Well done. I'll check on you every little while.", next_check: "Next check-in in {s} s", ok_thanks: "Thank you. I'm glad you're OK.",
    no_mem: "No memories yet. Tap Memory Lane and tell me a story!", saved: "Saved to your memory book." },
  es: { talk: "Habla con Otto", scam: "¿Es una estafa?", storm: "Modo Tormenta", memories: "Recuerdos", send: "Enviar", lane: "Camino de Recuerdos",
    save: "Guardar mi recuerdo", back: "← Volver", photo: "Toma o elige una foto", check: "Revisar", next: "Siguiente", stop: "← Parar Modo Tormenta",
    settings: "Ajustes", areyouok: "¿Estás bien?", imok: "Estoy bien", type: "Escríbele a Otto…", answer: "Escribe tu respuesta…",
    paste: "…o pega el texto del mensaje aquí", foot: "Otto nunca da dosis de medicinas. En una emergencia, llama al 911.",
    hello: "¡Uh-uh! Hola, soy Otto. ¿Qué hacemos hoy?", thinking: "Mmm, déjame pensar…",
    quick: ["Cuéntame un chiste", "Hazme una pregunta", "¿Cómo estás?", "Me siento sola"],
    v_scam: "Probable estafa", v_dont_pay: "Probable estafa", v_unsure: "No estoy seguro", v_ok: "Parece bien",
    a_dont_pay: "No pagues ni respondas. Llamemos primero a la familia.", a_scam: "No respondas. Enséñaselo primero a {c}.",
    a_unsure: "No estoy seguro. Preguntemos a {c} antes de hacer nada.", a_ok: "Parece bien. Si luego pide dinero, pregunta a {c}.",
    f_money: "Pide dinero", f_gift: "Pide tarjetas de regalo", f_pass: "Pide contraseña", f_urg: "Te apura", reading: "Déjame leerlo con calma…",
    steps: ["Usa una linterna, no velas.", "Mantén cerrado el refrigerador.", "Toma un poco de agua.", "Quédate adentro, lejos de las ventanas."],
    storm_intro: "Se fue la luz. Tranquila, estoy contigo. Hagamos cuatro pasos con calma.",
    storm_done: "Muy bien. Te preguntaré cómo estás cada ratito.", next_check: "Próxima pregunta en {s} s", ok_thanks: "Gracias. Me alegra que estés bien.",
    no_mem: "Aún no hay recuerdos. ¡Toca Camino de Recuerdos y cuéntame una historia!", saved: "Guardado en tu libro de recuerdos." },
  hi: { talk: "ओटो से बात करें", scam: "क्या यह धोखा है?", storm: "तूफ़ान मोड", memories: "यादें", send: "भेजें", lane: "यादों की गली",
    save: "मेरी याद सहेजें", back: "← वापस", photo: "फ़ोटो लें या चुनें", check: "जाँचें", next: "आगे", stop: "← तूफ़ान मोड बंद करें",
    settings: "सेटिंग्स", areyouok: "क्या आप ठीक हैं?", imok: "मैं ठीक हूँ", type: "ओटो को लिखें…", answer: "अपना जवाब लिखें…",
    paste: "…या संदेश यहाँ चिपकाएँ", foot: "ओटो कभी दवा की खुराक नहीं बताता। आपातकाल में 911 पर फ़ोन करें।",
    hello: "हू-हू! नमस्ते, मैं ओटो हूँ। आज क्या करें?", thinking: "हम्म, सोचने दीजिए…",
    quick: ["एक चुटकुला सुनाओ", "मुझसे सवाल पूछो", "आप कैसे हो?", "मैं अकेला महसूस करती हूँ"],
    v_scam: "शायद धोखा है", v_dont_pay: "शायद धोखा है", v_unsure: "मुझे पक्का नहीं पता", v_ok: "ठीक लगता है",
    a_dont_pay: "पैसे न दें, जवाब न दें। पहले परिवार को फ़ोन करें।", a_scam: "जवाब न दें। पहले {c} को दिखाएँ।",
    a_unsure: "मुझे पक्का नहीं पता। कुछ करने से पहले {c} से पूछें।", a_ok: "ठीक लगता है। अगर बाद में पैसे माँगे, तो {c} से पूछें।",
    f_money: "पैसे माँगता है", f_gift: "गिफ्ट कार्ड माँगता है", f_pass: "पासवर्ड माँगता है", f_urg: "जल्दबाज़ी कराता है", reading: "ध्यान से पढ़ने दीजिए…",
    steps: ["मोमबत्ती नहीं, टॉर्च जलाएँ।", "फ्रिज का दरवाज़ा बंद रखें।", "थोड़ा पानी पिएँ।", "घर के अंदर रहें, खिड़कियों से दूर।"],
    storm_intro: "बिजली चली गई है। कोई बात नहीं, मैं आपके साथ हूँ। चार आसान कदम करते हैं।",
    storm_done: "बहुत अच्छे। मैं थोड़ी-थोड़ी देर में आपका हाल पूछूँगा।", next_check: "अगली जाँच {s} सेकंड में", ok_thanks: "धन्यवाद। खुशी है कि आप ठीक हैं।",
    no_mem: "अभी कोई याद नहीं। यादों की गली दबाएँ और कहानी सुनाएँ!", saved: "आपकी यादों की किताब में सहेजा गया।" },
  zh: { talk: "和奥托聊天", scam: "这是诈骗吗？", storm: "风暴模式", memories: "回忆", send: "发送", lane: "回忆小路",
    save: "保存我的回忆", back: "← 返回", photo: "拍照或选择照片", check: "检查", next: "下一步", stop: "← 停止风暴模式",
    settings: "设置", areyouok: "您还好吗？", imok: "我很好", type: "给奥托写点什么…", answer: "写下您的回答…",
    paste: "…或把消息文字粘贴在这里", foot: "奥托从不提供药物剂量。紧急情况请拨打911。",
    hello: "咕咕！您好，我是奥托。今天我们做什么呢？", thinking: "嗯，让我想想…",
    quick: ["讲个笑话", "考考我", "你好吗？", "我有点孤单"],
    v_scam: "很可能是诈骗", v_dont_pay: "很可能是诈骗", v_unsure: "我不太确定", v_ok: "看起来没问题",
    a_dont_pay: "不要付钱，也不要回复。先给家人打电话。", a_scam: "不要回复。先给{c}看看。",
    a_unsure: "我不太确定。做任何事之前先问问{c}。", a_ok: "看起来没问题。如果之后要钱，请问{c}。",
    f_money: "要钱", f_gift: "要礼品卡", f_pass: "要密码", f_urg: "催促您", reading: "让我仔细读一读…",
    steps: ["用手电筒，不要用蜡烛。", "保持冰箱门关闭。", "喝点水。", "待在室内，远离窗户。"],
    storm_intro: "停电了。没关系，我陪着您。我们慢慢做四件事。",
    storm_done: "做得很好。我会时不时问问您。", next_check: "{s} 秒后再问您", ok_thanks: "谢谢。很高兴您没事。",
    no_mem: "还没有回忆。点“回忆小路”，给我讲个故事吧！", saved: "已保存到您的回忆本。" },
  vi: { talk: "Nói chuyện với Otto", scam: "Đây có phải lừa đảo?", storm: "Chế độ Bão", memories: "Kỷ niệm", send: "Gửi", lane: "Đường Kỷ Niệm",
    save: "Lưu kỷ niệm", back: "← Quay lại", photo: "Chụp hoặc chọn ảnh", check: "Kiểm tra", next: "Tiếp", stop: "← Tắt Chế độ Bão",
    settings: "Cài đặt", areyouok: "Bạn có ổn không?", imok: "Tôi ổn", type: "Viết cho Otto…", answer: "Viết câu trả lời…",
    paste: "…hoặc dán tin nhắn vào đây", foot: "Otto không bao giờ cho liều thuốc. Khi khẩn cấp, hãy gọi 911.",
    hello: "Hú hú! Xin chào, tôi là Otto. Hôm nay mình làm gì nhỉ?", thinking: "Ừm, để tôi nghĩ…",
    quick: ["Kể chuyện cười", "Đố tôi đi", "Bạn khỏe không?", "Tôi thấy cô đơn"],
    v_scam: "Có thể là lừa đảo", v_dont_pay: "Có thể là lừa đảo", v_unsure: "Tôi không chắc", v_ok: "Có vẻ ổn",
    a_dont_pay: "Đừng trả tiền hay trả lời. Gọi cho gia đình trước nhé.", a_scam: "Đừng trả lời. Cho {c} xem trước nhé.",
    a_unsure: "Tôi không chắc. Hãy hỏi {c} trước khi làm gì.", a_ok: "Có vẻ ổn. Nếu sau này đòi tiền, hãy hỏi {c}.",
    f_money: "Đòi tiền", f_gift: "Đòi thẻ quà tặng", f_pass: "Đòi mật khẩu", f_urg: "Hối thúc bạn", reading: "Để tôi đọc kỹ…",
    steps: ["Dùng đèn pin, không dùng nến.", "Giữ tủ lạnh đóng kín.", "Uống một ít nước.", "Ở trong nhà, tránh xa cửa sổ."],
    storm_intro: "Mất điện rồi. Không sao, tôi ở đây với bạn. Mình làm bốn bước nhẹ nhàng nhé.",
    storm_done: "Giỏi lắm. Tôi sẽ hỏi thăm bạn thường xuyên.", next_check: "Hỏi lại sau {s} giây", ok_thanks: "Cảm ơn. Mừng là bạn ổn.",
    no_mem: "Chưa có kỷ niệm. Bấm Đường Kỷ Niệm và kể cho tôi nghe nhé!", saved: "Đã lưu vào sổ kỷ niệm." },
  tl: { talk: "Kausapin si Otto", scam: "Scam ba ito?", storm: "Storm Mode", memories: "Mga Alaala", send: "Ipadala", lane: "Daan ng Alaala",
    save: "I-save ang alaala", back: "← Bumalik", photo: "Kumuha o pumili ng litrato", check: "Suriin", next: "Susunod", stop: "← Itigil ang Storm Mode",
    settings: "Settings", areyouok: "Okay ka lang ba?", imok: "Okay lang ako", type: "Sumulat kay Otto…", answer: "Isulat ang sagot mo…",
    paste: "…o i-paste dito ang mensahe", foot: "Hindi nagbibigay si Otto ng dosis ng gamot. Kung emergency, tumawag sa 911.",
    hello: "Huu-huu! Kumusta, ako si Otto. Ano ang gagawin natin ngayon?", thinking: "Hmm, sandali lang…",
    quick: ["Magkuwento ng biro", "Bigyan mo ako ng tanong", "Kumusta ka?", "Nalulungkot ako"],
    v_scam: "Malamang scam", v_dont_pay: "Malamang scam", v_unsure: "Hindi ako sigurado", v_ok: "Mukhang okay",
    a_dont_pay: "Huwag magbayad o sumagot. Tawagan muna ang pamilya.", a_scam: "Huwag sumagot. Ipakita muna kay {c}.",
    a_unsure: "Hindi ako sigurado. Tanungin muna si {c} bago gumawa ng kahit ano.", a_ok: "Mukhang okay. Kung humingi ng pera, tanungin si {c}.",
    f_money: "Humihingi ng pera", f_gift: "Humihingi ng gift card", f_pass: "Humihingi ng password", f_urg: "Minamadali ka", reading: "Babasahin ko nang mabuti…",
    steps: ["Gumamit ng flashlight, hindi kandila.", "Panatilihing sarado ang ref.", "Uminom ng tubig.", "Manatili sa loob, malayo sa bintana."],
    storm_intro: "Nawalan ng kuryente. Okay lang, kasama mo ako. Gawin natin ang apat na hakbang.",
    storm_done: "Magaling. Kukumustahin kita paminsan-minsan.", next_check: "Susunod na tanong sa {s} s", ok_thanks: "Salamat. Natutuwa akong okay ka.",
    no_mem: "Wala pang alaala. Pindutin ang Daan ng Alaala at magkuwento!", saved: "Na-save sa iyong aklat ng alaala." },
};
const VOICE_LANG = { en: "en-US", es: "es-MX", hi: "hi-IN", zh: "zh-CN", vi: "vi-VN", tl: "fil-PH" };

let lang = localStorage.getItem("otto-lang") || "en";
let settings = {};
let history = [];
let laneQuestion = "";
const t = (k) => (T[lang] && T[lang][k]) ?? T.en[k];

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
}

// ---------- Otto speaks ----------
const owl = $("#owl");
function hop() { owl.classList.remove("hop"); void owl.offsetWidth; owl.classList.add("hop"); setTimeout(() => owl.classList.remove("hop"), 1000); }
function pickVoice() {
  const want = VOICE_LANG[lang], voices = speechSynthesis.getVoices().filter((v) => v.localService !== false);
  return voices.find((v) => v.lang === want) || voices.find((v) => v.lang.startsWith(want.slice(0, 2))) ||
         (lang === "tl" ? voices.find((v) => v.lang.startsWith("fil")) : null);
}
function say(text, { speak = true } = {}) {
  text = text.replace(/[*_#`]+/g, "");
  $("#bubble").textContent = text;
  if (!speak || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""));
  const v = pickVoice(); if (v) u.voice = v;
  u.lang = VOICE_LANG[lang]; u.rate = 0.88; u.pitch = 1.1;
  u.onstart = () => owl.classList.add("talking");
  u.onend = u.onerror = () => owl.classList.remove("talking");
  owl.classList.add("talking");
  setTimeout(() => owl.classList.remove("talking"), Math.min(12000, 500 + text.length * 70));
  speechSynthesis.speak(u);
}
function showMeta(r) {
  if (!r || r.latency_s === undefined) return;
  const s = r.model === "safety rule" ? "🛡️ safety rule · instant"
    : `⚡ on-device · ${r.model} · ${r.latency_s} s${r.tok_s ? ` · ${r.tok_s} tok/s` : ""}${r.backend && r.backend !== "mac" ? ` · ${r.backend}` : ""}`;
  $("#meta").textContent = s; $("#speed").textContent = s;
}

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------- navigation ----------
function go(name) {
  $$(".panel").forEach((p) => (p.hidden = true));
  $("#home").hidden = !!name;
  if (name) $("#p-" + name).hidden = false;
  if (name === "memories") renderBook();
  if (name === "storm") startStorm();
  if (name === "settings") fillSettings();
  if (name === "talk") setTimeout(() => $("#talkIn").focus(), 50);
  if (name === "scam") { $("#verdict").hidden = true; say(t("scam") + " 📷", { speak: false }); }
}
$$("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
$$(".back").forEach((b) => (b.onclick = () => { if (b.id === "stormStop") stopStorm(); go(null); }));
$("#gear").onclick = () => go("settings");
$("#lang").onchange = (e) => { lang = e.target.value; localStorage.setItem("otto-lang", lang); applyLang(); say(t("hello")); hop(); };

// ---------- Talk ----------
async function talk(text) {
  if (!text.trim()) return;
  history.push({ role: "user", content: text });
  $("#bubble").textContent = t("thinking");
  try {
    const r = await api("/api/chat", { messages: history, lang });
    history.push({ role: "assistant", content: r.text });
    say(r.text); showMeta(r);
    if (/[!😊😄🦉]|ja|haha/i.test(r.text)) hop();
  } catch (e) { say("Hoo… I had a little hiccup. Let's try again."); }
}
$("#talkForm").onsubmit = (e) => { e.preventDefault(); const v = $("#talkIn").value; $("#talkIn").value = ""; talk(v); };

// ---------- Memory Lane ----------
$("#laneBtn").onclick = async () => {
  $("#bubble").textContent = t("thinking");
  const r = await api("/api/memory/question", { messages: [], lang });
  laneQuestion = r.text; say(r.text); showMeta(r);
  $("#laneForm").hidden = false; $("#laneIn").focus();
};
$("#laneForm").onsubmit = async (e) => {
  e.preventDefault();
  const answer = $("#laneIn").value.trim(); if (!answer) return;
  $("#bubble").textContent = t("thinking");
  const r = await api("/api/memory", { question: laneQuestion, answer, lang });
  $("#laneIn").value = ""; $("#laneForm").hidden = true;
  say(`${r.text}  📖 “${r.memory.title}”`); showMeta(r); hop();
};
async function renderBook() {
  const mems = await api("/api/memories");
  const book = $("#book"); book.innerHTML = "";
  if (!mems.length) { book.innerHTML = `<p>${t("no_mem")}</p>`; return; }
  for (const m of mems) {
    const c = document.createElement("article"); c.className = "mem";
    c.innerHTML = `<h4></h4><div class="d"></div><div class="q"></div><p></p>`;
    c.querySelector("h4").textContent = "📖 " + m.title;
    c.querySelector(".d").textContent = new Date(m.date + "T12:00").toLocaleDateString(VOICE_LANG[m.lang] || "en-US", { year: "numeric", month: "long", day: "numeric" });
    c.querySelector(".q").textContent = m.question; c.querySelector("p").textContent = m.answer;
    book.append(c);
  }
}

// ---------- Scam Check ----------
let scamImage = null;
$("#scamFile").onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(), rd = new FileReader();
  rd.onload = () => {
    img.onload = () => { // shrink to ~1024px so the vision model is fast
      const k = Math.min(1, 1024 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = img.width * k; cv.height = img.height * k;
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      scamImage = cv.toDataURL("image/jpeg", 0.85);
      $("#scamImg").src = scamImage; $("#scamImg").hidden = false;
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
};
$("#scamGo").onclick = async () => {
  const text = $("#scamText").value.trim();
  if (!scamImage && !text) return;
  say(t("reading")); owl.classList.add("talking");
  const v = $("#verdict"); v.hidden = true;
  try {
    const r = await api("/api/scam", { image: scamImage, text: text || null, lang });
    showMeta(r); renderVerdict(r);
  } catch (e) { renderVerdict({ verdict: "unsure", contact: settings.contact_name }); }
  owl.classList.remove("talking");
};
function renderVerdict(r) {
  const v = $("#verdict"), c = r.contact || settings.contact_name || "family", res = r.result;
  const pct = res ? Math.round(res.scam_prob * 100) : null;
  const head = t("v_" + r.verdict) + (pct !== null && r.verdict !== "ok" ? `: ${pct}%` : "");
  const advice = t("a_" + r.verdict).replace("{c}", c);
  v.className = "verdict v-" + r.verdict;
  v.innerHTML = `<h3></h3><div class="advice"></div><div class="bars"></div><ul></ul>`;
  v.querySelector("h3").textContent = (r.verdict === "ok" ? "✅ " : r.verdict === "unsure" ? "🤔 " : "🚫 ") + head;
  v.querySelector(".advice").textContent = advice;
  if (res) {
    const rows = [["f_money", res.asks_for_money], ["f_gift", res.asks_for_gift_cards], ["f_pass", res.asks_for_password], ["f_urg", res.urgency_pressure]];
    for (const [k, p] of rows) {
      const n = Math.round(p * 100), col = n >= 60 ? "var(--red)" : n >= 35 ? "var(--amber)" : "var(--green)";
      const b = document.createElement("div"); b.className = "bar";
      b.innerHTML = `<span></span><div class="track"><div class="fill" style="width:0;background:${col}"></div></div><b>${n}%</b>`;
      b.querySelector("span").textContent = t(k);
      v.querySelector(".bars").append(b);
      requestAnimationFrame(() => setTimeout(() => (b.querySelector(".fill").style.width = n + "%"), 30));
    }
    (res.reasons || []).slice(0, 3).forEach((x) => { const li = document.createElement("li"); li.textContent = x; v.querySelector("ul").append(li); });
  }
  v.hidden = false;
  say(`${head}. ${advice}`);
  if (r.verdict === "ok") hop();
}

// ---------- Storm Mode ----------
let stepIdx = -1, checkTimer = null, alarmTimer = null, tickTimer = null, beepCtx = null, beepTimer = null;
const CHECK_EVERY = () => (settings.demo ? 60 : 30 * 60) * 1000;
const ALARM_AFTER = () => (settings.demo ? 15 : 120) * 1000;

function startStorm() {
  stepIdx = -1; clearTimers();
  $("#steps").innerHTML = t("steps").map((s, i) => `<li>${["🔦", "🧊", "💧", "🏠"][i]} ${s}</li>`).join("");
  $("#stepNext").hidden = false; $("#checkStatus").textContent = "";
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
  clearInterval(tickTimer);
  $("#checkin").hidden = true;
  $("#a-name").textContent = `My name is ${settings.name}`;
  $("#a-medical").textContent = settings.medical;
  $("#a-contact").textContent = `${settings.contact_relation} ${settings.contact_name}: ${settings.contact_phone}`;
  $("#alarm").hidden = false;
  startBeeps();
}
function startBeeps() {
  try {
    beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
    beepCtx.resume();
    const beep = () => {
      [0, 0.25].forEach((dt) => {
        const o = beepCtx.createOscillator(), g = beepCtx.createGain();
        o.type = "square"; o.frequency.value = dt ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, beepCtx.currentTime + dt);
        g.gain.exponentialRampToValueAtTime(0.5, beepCtx.currentTime + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + dt + 0.22);
        o.connect(g).connect(beepCtx.destination); o.start(beepCtx.currentTime + dt); o.stop(beepCtx.currentTime + dt + 0.24);
      });
    };
    beep(); beepTimer = setInterval(beep, 700);
  } catch (e) {}
}
function imOk() {
  clearInterval(beepTimer); beepTimer = null;
  $("#alarm").hidden = true; $("#checkin").hidden = true;
  clearTimers();
  say(t("ok_thanks")); hop();
  let left = CHECK_EVERY() / 1000;
  const show = () => ($("#checkStatus").textContent = "🕰️ " + t("next_check").replace("{s}", left));
  show(); tickTimer = setInterval(() => { left--; show(); }, 1000);
  checkTimer = setTimeout(checkIn, CHECK_EVERY());
}
$$("[data-ok]").forEach((b) => (b.onclick = imOk));
function clearTimers() { clearTimeout(checkTimer); clearTimeout(alarmTimer); clearInterval(tickTimer); }
function stopStorm() { clearTimers(); clearInterval(beepTimer); $("#alarm").hidden = true; $("#checkin").hidden = true; $("#checkStatus").textContent = ""; }
// Warm up audio on first tap so the alarm can sound later without a gesture.
document.addEventListener("pointerdown", () => { try { beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)(); beepCtx.resume(); } catch (e) {} }, { once: true });

// ---------- Settings ----------
const FIELDS = ["name", "medical", "contact_relation", "contact_name", "contact_phone"];
function fillSettings() { FIELDS.forEach((f) => ($("#s-" + f).value = settings[f] || "")); $("#s-demo").checked = !!settings.demo; }
$("#saveSettings").onclick = async () => {
  const s = {}; FIELDS.forEach((f) => (s[f] = $("#s-" + f).value)); s.demo = $("#s-demo").checked;
  settings = await api("/api/settings", s); go(null); say("👍"); hop();
};

// ---------- Offline badge: server-side counter + browser-side resource check ----------
async function badge() {
  let bytes = 0, reqs = 0;
  try { const s = await api("/api/status"); bytes += s.external_bytes; reqs += s.external_requests; } catch (e) {}
  for (const e of performance.getEntriesByType("resource")) {
    if (new URL(e.name, location.href).origin !== location.origin) { reqs++; bytes += e.transferSize || 0; }
  }
  const b = $("#badge");
  const net = navigator.onLine ? "📶 Wi-Fi on" : "📴 Offline ✓";
  b.textContent = `${net} · ${bytes} bytes sent` + (reqs ? ` (${reqs} req)` : "");
  b.classList.toggle("warn", reqs > 0);
}
window.addEventListener("online", badge); window.addEventListener("offline", badge);

// ---------- start ----------
(async () => {
  applyLang();
  try { settings = await api("/api/settings"); } catch (e) {}
  speechSynthesis?.getVoices(); speechSynthesis?.addEventListener?.("voiceschanged", () => {});
  say(t("hello"), { speak: false });
  badge(); setInterval(badge, 3000);
})();
