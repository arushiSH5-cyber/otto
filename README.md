# 🦉 Otto: an offline owl companion for grandparents

Otto is a friendly owl that keeps an older person company, protects them from scams, and watches over them when the power and internet go down. It runs **entirely on-device** with Liquid AI **LFM3** models. There's no cloud and no account, and **0 bytes leave the house**.

Built solo at the Liquid AI × Qualcomm On-Device AI Hackathon.

- **🎙️ Talk out loud:** tap the big button and speak in any of six languages. **LFM3-Audio-2B** transcribes it on-device in ~0.5–1 s. Replies stream in word by word (first word in ~0.3 s), and Otto speaks each sentence as soon as it's ready, his beak moving.
- **🌳 Memory Lane + 🖼️ Photo Memories:** Otto asks about her life, or she shows him an old photo. **LFM3-VL** looks at it, says something specific about it and asks who's in it. Her stories become a **scrapbook** with polaroids, tape and dates, and she can **print it for the grandkids**.
- **🔍 Is this a scam?:** she photographs a letter. Otto puts on his detective hat and returns a verdict ("Likely a scam: 95%") with confidence bars and plain reasons in her language. Then he turns it into action: a giant **📞 Call Maria** button and a script for what to say if they call back.
- **⛈️ Otto notices when things go wrong:** when **Wi-Fi drops** or the **laptop is unplugged** (a power cut), Otto speaks up unprompted: "The internet just went out. Don't worry, I live right here in this house, so I still work." He offers Storm Mode, where the sky turns to rain, Otto holds a lantern, and he shows the battery level, a calm spoken checklist and "Are you OK?" check-ins. No tap within 15 s brings loud beeps and a flashing **I NEED HELP** card for whoever walks in.
- **A living storybook:** the sky follows the real time of day (dawn, day, dusk, night with stars). A big date and clock help with orientation. Otto has moods (happy, worried, detective, listening, storm) that match what's happening.

## Run it offline

```bash
brew install llama.cpp                      # needs build ≥ b12088 for LFM3 (tested: 1.0.0 / b12359)
python3 -m venv .venv && .venv/bin/pip install fastapi uvicorn httpx pydantic
hf download LiquidAI/LFM3-1.7B-GGUF LFM3-1.7B-Q4_K_M.gguf --local-dir models
hf download LiquidAI/LFM3-VL-2B-GGUF LFM3-VL-2B-Q4_K_M.gguf mmproj-LFM3-VL-2B-Q8_0.gguf --local-dir models
hf download LiquidAI/LFM3-Audio-2B-GGUF LFM3-Audio-2B-Q4_K_M.gguf mmproj-LFM3-Audio-2B-Q8_0.gguf --local-dir models
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
llama-server -m models/LFM3-Audio-2B-Q4_K_M.gguf --mmproj models/mmproj-LFM3-Audio-2B-Q8_0.gguf --port 8082 -c 4096 -ngl 99 --jinja --temp 0
BACKEND=mac uvicorn server:app --host 127.0.0.1 --port 8000
```

Backends (`llm.py`): `BACKEND=mac` (local llama-server), `iq9` (set `IQ9_URL`), or `replay` (canned answers, a last-resort demo saver).

Demo letters for Scam Check are in `demo/` (regenerate them with `demo/make_letters.py`). All phone numbers are fake 555 numbers.

## Models

| Use | Model | Quant |
|---|---|---|
| Talk (streamed), Memory Lane, titles, translating reasons | `LiquidAI/LFM3-1.7B-GGUF` | Q4_K_M |
| Voice in (speech recognition, 6 languages) | `LiquidAI/LFM3-Audio-2B-GGUF` + mmproj | Q4_K_M / Q8_0 |
| Scam Check (photo → JSON), Photo Memories | `LiquidAI/LFM3-VL-2B-GGUF` + mmproj | Q4_K_M / Q8_0 |

Thinking is turned off per request (`chat_template_kwargs.enable_thinking=false`) so answers come straight back.

## Real latency (Apple M4, MacBook, Wi-Fi off)

| Action | Time | Speed |
|---|---|---|
| Talk reply, first word (streamed) | ~0.3 s | ~60 tok/s |
| Talk reply, full | ~0.8–1.2 s | ~60 tok/s |
| Voice → text (LFM3-Audio) | ~0.5–1.0 s | ~61 tok/s |
| Photo Memories question | ~1.5 s | ~60 tok/s |
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
- **C.** LFM3-Audio **voice out** too (Otto's own voice instead of the macOS voices). Voice in is done.
- **D.** Family digest: a weekly on-device summary of her memories and check-ins that she chooses to share.
- **E.** Battery and quiet-hours settings for Storm Mode check-ins (every 30 min in real life; turn off Demo mode in Settings).

## 60-second demo

1. "Meet Otto." Tap the mic and say *"Otto, tell me a joke"* in Spanish. Words stream in and Otto speaks.
2. **Turn Wi-Fi off.** Otto notices on his own: "The internet just went out… I still work." The badge turns green: **📴 Offline ✓ · 0 bytes sent**.
3. Show `demo/irs_scam.png` → detective Otto → "Likely a scam: 98%" → **📞 Call Maria**.
4. **Unplug the charger.** Otto: "Looks like the power went out." Storm Mode → rain, lantern, checklist → don't tap → alarm + **I NEED HELP**.
5. Show an old photo → Otto asks about it → it lands in the scrapbook. "All on-device with Liquid LFM3: text, vision and audio. Zero bytes left the house."
