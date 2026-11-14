"""One place for every model call. BACKEND=mac | iq9 | replay."""
import os, time, json
from urllib.parse import urlparse
import httpx

BACKEND = os.environ.get("BACKEND", "mac")
TEXT_URL = os.environ.get("TEXT_URL", "http://127.0.0.1:8080")
VISION_URL = os.environ.get("VISION_URL", "http://127.0.0.1:8081")
IQ9_URL = os.environ.get("IQ9_URL", "")  # filled in later: llama-server / Nexa on the iQ9
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}

# Offline proof: every outgoing request is inspected; anything not localhost is counted.
external = {"requests": 0, "bytes": 0}

async def _count(request: httpx.Request):
    host = urlparse(str(request.url)).hostname or ""
    if host not in LOCAL_HOSTS:
        external["requests"] += 1
        external["bytes"] += len(request.content or b"")

client = httpx.AsyncClient(timeout=120, event_hooks={"request": [_count]})

REPLAY = {
    "text": "Hoo-hoo! I'm right here with you. Shall we talk about your favorite song from when you were young?",
    "title": "A happy memory",
    "question": "Tell me about your very first job. What did you do?",
    "scam": json.dumps({"scam_prob": 0.96, "asks_for_money": 0.95, "asks_for_gift_cards": 0.97,
        "asks_for_password": 0.1, "urgency_pressure": 0.93, "pretends_to_be": "IRS",
        "reasons": ["It asks you to pay with gift cards. The real IRS never does that.",
                    "It says you must pay today, which is a pressure trick.",
                    "It threatens arrest to scare you."]}),
}

def _base(kind: str) -> str:
    if BACKEND == "iq9" and IQ9_URL:
        return IQ9_URL
    return VISION_URL if kind == "vision" else TEXT_URL

async def chat(messages, kind="text", max_tokens=200, temperature=0.3, json_schema=None, replay_key="text"):
    """Returns dict(text, latency_s, tok_s, backend, model)."""
    t0 = time.perf_counter()
    if BACKEND == "replay":
        return {"text": REPLAY[replay_key], "latency_s": 0.4, "tok_s": 0, "backend": "replay", "model": "LFM3 (replay)"}
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
    model = "LFM3-VL-2B" if kind == "vision" else "LFM3-1.7B"
    return {"text": d["choices"][0]["message"]["content"].strip(), "latency_s": round(dt, 2),
            "tok_s": round(tok_s, 1), "backend": BACKEND, "model": model}
