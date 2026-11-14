"""One place for every model call. BACKEND=mac | iq9 | replay (switchable live via /api/backend).

iq9: text (Talk, Memory Lane, titles, translation) runs on the Qualcomm Dragonwing IQ-9075's
Hexagon NPU through GenieX (LFM3-1.7B Q4_0). GenieX listens on the board's loopback, reached
from this laptop through an SSH tunnel over the local link, so IQ9_URL is a localhost port.
Vision and audio stay on the Mac's local llama-servers until they run on the board too.
"""
import os, time, json
from urllib.parse import urlparse
import httpx

BACKEND = os.environ.get("BACKEND", "mac")
TEXT_URL = os.environ.get("TEXT_URL", "http://127.0.0.1:8080")
VISION_URL = os.environ.get("VISION_URL", "http://127.0.0.1:8081")
AUDIO_URL = os.environ.get("AUDIO_URL", "http://127.0.0.1:8082")
IQ9_URL = os.environ.get("IQ9_URL", "http://127.0.0.1:18181")   # ssh -L 18181:127.0.0.1:18181 to the board
IQ9_MODEL = os.environ.get("IQ9_MODEL", "LiquidAI/LFM3-1.7B-GGUF:Q4_0")
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}

# Offline proof: every outgoing request is inspected; anything not localhost is counted.
external = {"requests": 0, "bytes": 0}

async def _count(request: httpx.Request):
    host = urlparse(str(request.url)).hostname or ""
    if host not in LOCAL_HOSTS:
        external["requests"] += 1
        external["bytes"] += len(request.content or b"")

client = httpx.AsyncClient(timeout=120, event_hooks={"request": [_count]})

MODEL_NAMES = {"text": "LFM3-1.7B", "vision": "LFM3-VL-2B", "audio": "LFM3-Audio-2B"}

REPLAY = {
    "asr": "Tell me a joke, Otto.",
    "photo": "What a lovely photo! Who is the person smiling in the middle?",
    "text": "Hoo-hoo! I'm right here with you. Shall we talk about your favorite song from when you were young?",
    "title": "A happy memory",
    "question": "Tell me about your very first job. What did you do?",
    "scam": json.dumps({"scam_prob": 0.96, "asks_for_money": 0.95, "asks_for_gift_cards": 0.97,
        "asks_for_password": 0.1, "urgency_pressure": 0.93, "pretends_to_be": "IRS",
        "reasons": ["It asks you to pay with gift cards. The real IRS never does that.",
                    "It says you must pay today, which is a pressure trick.",
                    "It threatens arrest to scare you."]}),
}

def on_iq9(kind: str) -> bool:
    return BACKEND == "iq9" and kind == "text"

def device(kind: str) -> str:
    return "iq9" if on_iq9(kind) else ("replay" if BACKEND == "replay" else "mac")

def _base(kind: str) -> str:
    if on_iq9(kind):
        return IQ9_URL
    return {"vision": VISION_URL, "audio": AUDIO_URL}.get(kind, TEXT_URL)

async def _iq9_chat(messages, max_tokens):
    """GenieX on the NPU: capped request, thinking off, content validated, one retry."""
    body = {"model": IQ9_MODEL, "messages": messages, "max_completion_tokens": max_tokens,
            "compute": "npu", "enable_think": False, "stream": False}
    for attempt in range(2):
        r = await client.post(IQ9_URL + "/v1/chat/completions", json=body)
        r.raise_for_status()
        d = r.json()
        text = ((d.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        if text.strip():
            return text.strip(), (d.get("usage") or {}).get("completion_tokens", 0)
    raise RuntimeError("iQ9 returned an empty answer twice")

async def chat(messages, kind="text", max_tokens=200, temperature=0.3, json_schema=None, replay_key="text"):
    """Returns dict(text, latency_s, tok_s, backend, model)."""
    t0 = time.perf_counter()
    if BACKEND == "replay":
        return {"text": REPLAY[replay_key], "latency_s": 0.4, "tok_s": 0, "backend": "replay", "model": "LFM3 (replay)"}
    if on_iq9(kind):
        text, toks = await _iq9_chat(messages, max_tokens)
        dt = time.perf_counter() - t0
        return {"text": text, "latency_s": round(dt, 2), "tok_s": round(toks / dt, 1) if dt and toks else 0,
                "backend": "iq9", "model": "LFM3-1.7B · iQ9 NPU"}
    body = {"messages": messages, "max_tokens": max_tokens, "temperature": temperature,
            "top_k": 50, "repeat_penalty": 1.1,
            "chat_template_kwargs": {"enable_thinking": False}}  # fast, direct answers
    if json_schema:
        body["response_format"] = {"type": "json_object", "schema": json_schema}
    r = await client.post(_base(kind) + "/v1/chat/completions", json=body)
    r.raise_for_status()
    d = r.json()
    dt = time.perf_counter() - t0
    timings = d.get("timings") or {}
    toks = (d.get("usage") or {}).get("completion_tokens", 0)
    tok_s = timings.get("predicted_per_second") or (toks / dt if dt else 0)
    return {"text": d["choices"][0]["message"]["content"].strip(), "latency_s": round(dt, 2),
            "tok_s": round(tok_s, 1), "backend": "mac", "model": MODEL_NAMES[kind] + " · Mac"}


async def stream(messages, max_tokens=160, temperature=0.4):
    """Yields text pieces, then a final dict with timing."""
    t0 = time.perf_counter()
    if BACKEND == "replay":
        for w in REPLAY["text"].split(" "):
            yield w + " "
        yield {"latency_s": 0.4, "tok_s": 0, "backend": "replay", "model": "LFM3 (replay)"}
        return
    if on_iq9("text"):  # whole answer from the NPU, then shown word by word
        text, toks = await _iq9_chat(messages, max_tokens)
        dt = time.perf_counter() - t0
        for w in text.split(" "):
            yield w + " "
        yield {"latency_s": round(dt, 2), "tok_s": round(toks / dt, 1) if dt and toks else 0,
               "backend": "iq9", "model": "LFM3-1.7B · iQ9 NPU"}
        return
    body = {"messages": messages, "max_tokens": max_tokens, "temperature": temperature, "top_k": 50,
            "repeat_penalty": 1.1, "stream": True, "chat_template_kwargs": {"enable_thinking": False}}
    first, n, tps = None, 0, 0
    async with client.stream("POST", _base("text") + "/v1/chat/completions", json=body) as r:
        async for line in r.aiter_lines():
            if not line.startswith("data: ") or line.endswith("[DONE]"):
                continue
            d = json.loads(line[6:])
            if d.get("timings"):
                tps = d["timings"].get("predicted_per_second", tps)
            for c in d.get("choices", []):
                piece = (c.get("delta") or {}).get("content")
                if piece:
                    first = first or time.perf_counter(); n += 1
                    yield piece
    dt = time.perf_counter() - t0
    yield {"latency_s": round(dt, 2), "first_s": round((first or time.perf_counter()) - t0, 2),
           "tok_s": round(tps or (n / dt if dt else 0), 1), "backend": "mac", "model": MODEL_NAMES["text"] + " · Mac"}
