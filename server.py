"""Otto: FastAPI on localhost:8000. Talks only to local llama-servers."""
import asyncio, json, re, uuid, datetime, random
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError
import llm

ROOT = Path(__file__).parent
DATA = ROOT / "data"; DATA.mkdir(exist_ok=True)
MEM = DATA / "memories.json"; SETTINGS = DATA / "settings.json"
app = FastAPI()

LANGS = {"en": "English", "es": "Spanish (Español)", "hi": "Hindi (हिन्दी)", "zh": "Simplified Chinese (中文)",
         "vi": "Vietnamese (Tiếng Việt)", "tl": "Tagalog"}

DEFAULT_SETTINGS = {"name": "Rosa", "medical": "I take heart medicine", "contact_name": "Maria",
                    "contact_relation": "Daughter", "contact_phone": "(555) 010-0100", "demo": True}

def load(p, default):
    try: return json.loads(p.read_text())
    except Exception: return default

def settings(): return {**DEFAULT_SETTINGS, **load(SETTINGS, {})}

# ---------- Safety rules (in code, not just in the prompt) ----------
MED_RE = re.compile(r"\b(dose|dosage|how many (pills|tablets|mg)|\d+\s?mg|overdose|diagnos\w*|prescri\w*|should i take|medicine|medication|pills?)\b|dosis|medicina|pastillas|दवा|खुराक|药|剂量|thuốc|liều|gamot|dosis", re.I)
MONEY_RE = re.compile(r"gift ?cards?|wire (money|transfer)|send (money|cash)|western union|bitcoin|crypto|password|\bpin\b|bank account|routing number|social security|tarjetas? de regalo|contraseña|enviar dinero|पासवर्ड|गिफ्ट कार्ड|礼品卡|密码|汇款|thẻ quà|mật khẩu|chuyển tiền|gift card|magpadala ng pera", re.I)
SAFE = {
 "med": {"en": "I can't give medicine doses or diagnoses. Please call your doctor, or 911 in an emergency.",
         "es": "No puedo dar dosis de medicinas ni diagnósticos. Llama a tu médico, o al 911 en una emergencia.",
         "hi": "मैं दवा की खुराक या बीमारी नहीं बता सकता। कृपया अपने डॉक्टर को फ़ोन करें, या आपातकाल में 911 पर।",
         "zh": "我不能给出药物剂量或诊断。请打电话给您的医生，紧急情况请拨打911。",
         "vi": "Tôi không thể cho liều thuốc hay chẩn đoán. Hãy gọi bác sĩ, hoặc 911 khi khẩn cấp.",
         "tl": "Hindi ako makapagbibigay ng dosis ng gamot o diyagnosis. Tawagan ang iyong doktor, o 911 kung emergency."},
 "money": {"en": "I won't help send money, buy gift cards or share passwords. Let's call {c} first.",
           "es": "No te ayudaré a enviar dinero, comprar tarjetas de regalo ni compartir contraseñas. Llamemos primero a {c}.",
           "hi": "मैं पैसे भेजने, गिफ्ट कार्ड खरीदने या पासवर्ड बताने में मदद नहीं करूँगा। पहले {c} को फ़ोन करते हैं।",
           "zh": "我不会帮忙汇款、买礼品卡或透露密码。我们先给{c}打电话吧。",
           "vi": "Tôi sẽ không giúp gửi tiền, mua thẻ quà tặng hay chia sẻ mật khẩu. Hãy gọi cho {c} trước nhé.",
           "tl": "Hindi ako tutulong magpadala ng pera, bumili ng gift card o magbigay ng password. Tawagan muna natin si {c}."},
}

def system_prompt(lang):
    s = settings()
    return (f"You are Otto, a warm, gentle owl friend for an older person named {s['name']}. "
            f"ALWAYS reply ONLY in {LANGS.get(lang, 'English')}. Keep replies to 1-3 short, simple sentences. "
            "Be kind, slow, a little playful: gentle jokes, easy trivia, owl puns now and then. "
            "Never give medicine doses or diagnoses: say to call the doctor, or 911 in an emergency. "
            "Never help send money, buy gift cards, or share passwords. You are not a replacement for 911.")

def meta(r): return {k: r[k] for k in ("latency_s", "tok_s", "backend", "model")}

# ---------- Talk ----------
class ChatIn(BaseModel):
    messages: list[dict]
    lang: str = "en"

@app.post("/api/chat")
async def chat(inp: ChatIn):
    last = inp.messages[-1]["content"] if inp.messages else ""
    if MED_RE.search(last):
        return {"text": SAFE["med"].get(inp.lang, SAFE["med"]["en"]), "safety": "medical", "latency_s": 0, "model": "safety rule"}
    if MONEY_RE.search(last):
        return {"text": SAFE["money"].get(inp.lang, SAFE["money"]["en"]).format(c=settings()["contact_name"]),
                "safety": "money", "latency_s": 0, "model": "safety rule"}
    msgs = [{"role": "system", "content": system_prompt(inp.lang)}] + inp.messages[-8:]
    r = await llm.chat(msgs, max_tokens=120, temperature=0.4)
    text = r["text"]
    if re.search(r"\d+\s?mg\b", text, re.I):  # output guard
        text = SAFE["med"].get(inp.lang, SAFE["med"]["en"])
    return {"text": text, **meta(r)}

# ---------- Memory Lane ----------
FALLBACK_Q = ["Tell me about your first job.", "What was your favorite song when you were young?",
              "Tell me about the house you grew up in.", "How did you meet someone you love?",
              "What was your favorite meal your mother made?", "Tell me about a trip you'll never forget."]

@app.post("/api/memory/question")
async def memory_question(inp: ChatIn):
    seed = random.choice(FALLBACK_Q)
    msgs = [{"role": "system", "content": system_prompt(inp.lang)},
            {"role": "user", "content": f"Ask me ONE warm, short question about my life, like: \"{seed}\". "
             f"Only the question, in {LANGS.get(inp.lang, 'English')}."}]
    r = await llm.chat(msgs, max_tokens=60, temperature=0.8, replay_key="question")
    return {"text": r["text"].strip('"'), **meta(r)}

class MemIn(BaseModel):
    question: str
    answer: str
    lang: str = "en"

@app.post("/api/memory")
async def memory_save(inp: MemIn):
    lname = LANGS.get(inp.lang, 'English')
    msgs = [{"role": "system", "content": "You write short book-chapter titles. Reply with ONLY the title."},
            {"role": "user", "content": f"Memory: {inp.answer}\n\nWrite a warm 2-5 word chapter title for this memory in {lname}. "
             "Examples: 'The Bakery at Dawn', 'Dancing at the Fair', 'My First Paycheck'. Only the title."}]
    t = await llm.chat(msgs, max_tokens=20, temperature=0.4, replay_key="title")
    title = t["text"].strip().split("\n")[0].strip('"*#“”\' ').rstrip(".")
    if not title or len(title) > 50 or inp.answer.lower().startswith(title.lower()[:20]):
        title = " ".join(inp.answer.split()[:5]) + "…"
    reply = await llm.chat([{"role": "system", "content": system_prompt(inp.lang)},
                            {"role": "user", "content": f"I just told you this memory: {inp.answer}. Thank me warmly in one sentence."}],
                           max_tokens=60, temperature=0.5)
    mems = load(MEM, [])
    item = {"id": uuid.uuid4().hex[:8], "date": datetime.date.today().isoformat(),
            "title": title, "question": inp.question, "answer": inp.answer, "lang": inp.lang}
    mems.insert(0, item); MEM.write_text(json.dumps(mems, ensure_ascii=False, indent=1))
    return {"memory": item, "text": reply["text"], **meta(reply)}

@app.get("/api/memories")
def memories(): return load(MEM, [])

# ---------- Scam Check ----------
class ScamOut(BaseModel):
    scam_prob: float = Field(ge=0, le=1)
    asks_for_money: float = Field(ge=0, le=1)
    asks_for_gift_cards: float = Field(ge=0, le=1)
    asks_for_password: float = Field(ge=0, le=1)
    urgency_pressure: float = Field(ge=0, le=1)
    pretends_to_be: str = ""
    asks_reader_to: str = ""
    reasons: list[str] = []

SCAM_SCHEMA = {"type": "object", "properties": {  # evidence first, overall score last
    "asks_reader_to": {"type": "string"}, "pretends_to_be": {"type": "string"}, "reasons": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 3},
    "asks_for_money": {"type": "number"}, "asks_for_gift_cards": {"type": "number"},
    "asks_for_password": {"type": "number"}, "urgency_pressure": {"type": "number"}, "scam_prob": {"type": "number"}},
    "required": ["asks_reader_to", "pretends_to_be", "reasons", "asks_for_money", "asks_for_gift_cards", "asks_for_password", "urgency_pressure", "scam_prob"]}

def calibrate(o: "ScamOut") -> "ScamOut":
    """Keep the overall score consistent with the evidence the model itself reported."""
    said = o.asks_reader_to.lower()
    if re.search(r"gift ?card|itunes|google play|steam card", said): o.asks_for_gift_cards = max(o.asks_for_gift_cards, 0.9)
    if re.search(r"password|\bpin\b|verification code|login", said): o.asks_for_password = max(o.asks_for_password, 0.8)
    if re.search(r"\bpay\b|\$\d|\bwire\b|card details|bank account|\bowe\b|send money", said): o.asks_for_money = max(o.asks_for_money, 0.7)
    red = max(o.asks_for_gift_cards, o.asks_for_password)
    if red >= 0.5: o.scam_prob = max(o.scam_prob, 0.9)
    elif max(o.asks_for_money, o.urgency_pressure) < 0.3: o.scam_prob = min(o.scam_prob, 0.25)
    return o

class ScamIn(BaseModel):
    image: str | None = None  # data URL
    text: str | None = None
    lang: str = "en"

@app.post("/api/scam")
async def scam(inp: ScamIn):
    instr = ("You protect older people from scams. Read this letter or message carefully. Return ONLY JSON. "
             "asks_reader_to: exactly what it asks the reader to do, and how to pay if it mentions payment (English). "
             "pretends_to_be: who it claims to be (or \"\"). reasons: 2-3 very short, plain reasons for your judgment, in simple English. "
             "Then probabilities 0-1: asks_for_money, asks_for_gift_cards, asks_for_password, urgency_pressure, "
             "and finally scam_prob. A normal friendly note from family with no requests is NOT a scam (low scam_prob). "
             "Real government agencies and banks never ask for gift cards or passwords.")
    content = [{"type": "text", "text": instr + ("\n\nMessage:\n" + inp.text if inp.text else "")}]
    if inp.image:
        content.append({"type": "image_url", "image_url": {"url": inp.image}})
    msgs = [{"role": "user", "content": content}]
    out, r = None, None
    for attempt in range(2):  # retry once on bad JSON
        r = await llm.chat(msgs, kind="vision", max_tokens=300, temperature=0.1, json_schema=SCAM_SCHEMA, replay_key="scam")
        try:
            raw = r["text"]; raw = raw[raw.find("{"): raw.rfind("}") + 1]
            out = calibrate(ScamOut.model_validate_json(raw)); break
        except (ValidationError, ValueError):
            msgs = msgs + [{"role": "assistant", "content": r["text"]}, {"role": "user", "content": "That was not valid JSON. Return ONLY the JSON object."}]
    if out is None:
        return {"error": "unsure", "verdict": "unsure", **meta(r)}
    asks = max(out.asks_for_gift_cards, out.asks_for_password) >= 0.5 or (out.asks_for_money >= 0.6 and out.scam_prob > 0.25)
    if asks: verdict = "dont_pay"           # rule: any money / gift card / password request
    elif 0.4 <= out.scam_prob <= 0.75: verdict = "unsure"
    elif out.scam_prob > 0.75: verdict = "scam"
    else: verdict = "ok"
    if inp.lang != "en" and out.reasons:  # reasons in her language, via the text model
        async def tr(line):
            r2 = await llm.chat([{"role": "system", "content": f"You are a translator. The text is a safety note explaining why a message may be a scam. Translate it into {LANGS[inp.lang]}. Output only the translation, nothing else."},
                                 {"role": "user", "content": line}], max_tokens=80, temperature=0.1)
            return r2["text"].split("\n")[0].strip()
        out.reasons = list(await asyncio.gather(*[tr(x) for x in out.reasons]))
    return {"result": out.model_dump(), "verdict": verdict, "contact": settings()["contact_name"], **meta(r)}

# ---------- Settings / status ----------
@app.get("/api/settings")
def get_settings(): return settings()

@app.post("/api/settings")
def set_settings(s: dict):
    SETTINGS.write_text(json.dumps({**settings(), **s}, ensure_ascii=False, indent=1)); return settings()

@app.get("/api/status")
def status(): return {"backend": llm.BACKEND, "external_requests": llm.external["requests"], "external_bytes": llm.external["bytes"]}

app.mount("/", StaticFiles(directory=ROOT / "static", html=True), name="static")
