# 🦉 Otto: an offline owl companion for grandparents

Otto is a friendly owl that keeps an older person company, protects them from scams, and watches over them when the power and internet go down. It runs **entirely on-device** with Liquid AI **LFM3** models. There's no cloud and no account, and **0 bytes leave the house**.

Built solo at the Liquid AI × Qualcomm On-Device AI Hackathon.

- **🗣️ Talk + 🌳 Memory Lane:** Grandma chats with Otto in her own language (English, Español, हिन्दी, 中文, Tiếng Việt, Tagalog). Otto is warm, slow and a bit playful, with gentle jokes and easy trivia. In Memory Lane, Otto asks about her life ("Tell me about your first job") and saves each answer with a date and a short title (e.g. *"La Mañana en la Panadería"*) in a Memory book.
- **🔍 Is this a scam?:** She takes a photo of a letter or text (or pastes it). The vision model returns strict JSON with a probability for each red flag. Otto shows a big verdict ("Likely a scam: 98%"), confidence bars and 2–3 plain reasons in her language.
- **⛈️ Storm Mode:** A calm, spoken 4-step checklist, then regular "Are you OK?" check-ins. If she doesn't tap within 15 s, Otto sounds loud beeps and shows a flashing full-screen **I NEED HELP** card with her name, her medical note and a family phone number.

## Run it offline

```bash
brew install llama.cpp                      # needs build ≥ b12088 for LFM3 (tested: 1.0.0 / b12359)
python3 -m venv .venv && .venv/bin/pip install fastapi uvicorn httpx pydantic
hf download LiquidAI/LFM3-1.7B-GGUF LFM3-1.7B-Q4_K_M.gguf --local-dir models
hf download LiquidAI/LFM3-VL-2B-GGUF LFM3-VL-2B-Q4_K_M.gguf mmproj-LFM3-VL-2B-Q8_0.gguf --local-dir models
```

Then turn Wi-Fi off and run:

```bash
./run.sh          # starts both llama-servers in the background + the app
open http://localhost:8000
```

`run.sh` runs:

```bash
llama-server -m models/LFM3-1.7B-Q4_K_M.gguf --port 8080 -c 4096 -ngl 99 --jinja
llama-server -m models/LFM3-VL-2B-Q4_K_M.gguf --mmproj models/mmproj-LFM3-VL-2B-Q8_0.gguf --port 8081 -c 4096 -ngl 99 --jinja
BACKEND=mac uvicorn server:app --host 127.0.0.1 --port 8000
```

Backends (`llm.py`): `BACKEND=mac` (local llama-server), `iq9` (set `IQ9_URL`), or `replay` (canned answers, a last-resort demo saver).

Demo letters for Scam Check are in `demo/` (regenerate them with `demo/make_letters.py`). All phone numbers are fake 555 numbers.

## Models

| Use | Model | Quant |
|---|---|---|
| Talk, Memory Lane, titles, translating reasons | `LiquidAI/LFM3-1.7B-GGUF` | Q4_K_M |
| Scam Check (photo → JSON) | `LiquidAI/LFM3-VL-2B-GGUF` + mmproj | Q4_K_M / Q8_0 |

Thinking is turned off per request (`chat_template_kwargs.enable_thinking=false`) so answers come straight back.

## Real latency (Apple M4, MacBook, Wi-Fi off)

| Action | Time | Speed |
|---|---|---|
| Talk reply | ~0.7–0.8 s | ~62 tok/s |
| Memory Lane question | ~0.65 s | ~62 tok/s |
| Scam Check, pasted text | ~2.4 s | ~61 tok/s |
| Scam Check, photo + reasons translated | ~4.8 s | ~61 tok/s |

The real latency and tokens/sec appear under every answer on screen.

## How Scam Check stays honest

- The JSON schema is enforced by llama.cpp (`response_format`) and validated with pydantic, with one retry on bad JSON.
- The schema puts the **evidence first** (`asks_reader_to`, `reasons`, per-flag probabilities) and the overall `scam_prob` **last**, so the score follows from the evidence.
- `calibrate()` in code keeps the score consistent with what the model itself found: a gift card or password request pushes it up, and no requests or pressure pull it down.
- Rules in code: any money, gift card or password request means **"Don't pay or reply. Let's call family first."** A `scam_prob` between 0.4 and 0.75 means **"I'm not sure. Let's ask Maria before doing anything."**

## Safety (enforced in code, not just in the prompt)

- **No medicine doses or diagnoses.** Medical questions are caught before the model runs, and Otto answers "call your doctor, or 911 in an emergency." Replies are also checked for dosages like "500 mg".
- **Never helps send money, buy gift cards or share passwords.** Those requests get a fixed refusal plus "let's call Maria first".
- **Shows its confidence** and asks family when unsure.
- **Private:** memories and settings stay in `data/` on this device, and photos are never stored. The badge counts every non-localhost request from both the server (an httpx hook) and the browser (Resource Timing). It reads **0 bytes sent**.
- **Not a replacement for 911**, as Otto says on every screen.
- No CDNs, web fonts or remote assets. Speech uses local macOS voices (`speechSynthesis`). Web Speech recognition is deliberately not used because it needs the internet.

## Roadmap

- **A.** Move to the Qualcomm **iQ9** (Nexa SDK on the NPU, or llama.cpp on the CPU) via `BACKEND=iq9`, and show iQ9 latency on screen.
- **B.** **d1-2B** for Scam Check (calibrated probabilities in one pass).
- **C.** **LFM3-Audio** voice in and out, in her language.
- **D.** Memory book → a "print for the grandkids" page.
- **E.** Battery and quiet-hours settings for Storm Mode check-ins (every 30 min in real life; turn off Demo mode in Settings).
