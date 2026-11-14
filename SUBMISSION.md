# Otto 🦉: an offline owl friend for grandparents

**Cleared for Takeoff: Liquid AI × Qualcomm Dragonwing hackathon · solo build**
**Code:** https://github.com/arushiSH5-cyber/otto

---

## English

### One line
Otto is a talking owl that keeps grandma company in her own language, stops scams before she pays, and checks on her when the power and internet go down. It runs entirely on-device with Liquid AI LFM3 models (text, vision and audio), and its screen counts every byte that leaves the house: 0.

### Who it's for, and the real need
Older adults living alone face three things at once: loneliness, scams that target them by phone and mail (gift-card "IRS" letters, "grandma, I'm in jail" texts), and emergencies when a storm knocks out power and internet. Those are exactly the moments a cloud assistant stops working.

### Why this should not be a cloud API call
1. **The network is down exactly when she needs Otto most.** Storm Mode exists for power and internet outages. A cloud assistant is dead in that moment; Otto notices the Wi-Fi drop or the charger being pulled and offers help unprompted.
2. **The data is the most private there is.** Her life stories, family photos, her medical note, and the scam letters she photographs (which contain her name, address and account details) never leave the house.
3. **Flat cost for a fixed-income user.** It's always on and checks in every 30 minutes, with no per-token bill and no subscription.

### What each model does
| Model | Runs on | Job in Otto |
|---|---|---|
| **LFM3-1.7B** | llama.cpp (local); GenieX backend for the **iQ9 Hexagon NPU** is built in, with a live Mac/iQ9 switch | Talks with her (jokes, trivia, company), asks Memory Lane questions, titles her memories, translates scam reasons into her language |
| **LFM3-VL-2B** | llama.cpp (local) | Reads a photographed letter → strict JSON with a probability per red flag (money, gift cards, password, urgency, who it pretends to be). Also looks at old family photos and asks who's in them |
| **LFM3-Audio-2B** | llama.cpp (local) | Hears her voice in English or Spanish (tap and talk), so she doesn't have to type |
| **Rules in code** | CPU | The safety gate: no medicine doses, never helps send money or gift cards, a money request means "don't pay, call family", unsure means "ask Maria first" |

### What makes it stand out
- **It acts on its own, not just in chat.** It notices outages (Wi-Fi lost, power lost), runs timed check-ins, and if she doesn't answer within 15 s it sounds an alarm with a flashing **I NEED HELP** card (her name, medical note, daughter's phone).
- **Scam Check you can trust.** The schema puts the evidence first and the overall score last, and code keeps the score consistent with the evidence. A friendly grandkid note went from a wrong 95% to 1%. Every verdict ends in an action: a giant **📞 Call Maria** button and a script for what to say if they call back.
- **Built for her, not for us.** 24px+ text, giant buttons, speech in her language, and a big clock and date for orientation. Otto has moods (detective hat, storm lantern, worried brows), and she can pet him (he giggles). Her stories become a printable scrapbook for the grandkids.
- **Offline is proven, not promised.** A live badge counts non-local requests from both the server and the browser. A **JSONL log** records every decision and action (scam verdicts, safety refusals, check-ins, alarms, outages).

### Rubric map
- **Edge-native value (25%):** it works during outages, which is exactly when it's needed; private data stays in the house.
- **Technical execution (20%):** three LFM3 models, strict JSON with validation and a retry, safety rules in code, a JSONL audit log, and a replay fallback.
- **Originality (20%):** not a chatbot. It's a companion that watches, decides and acts, and turns verdicts into actions.
- **Usefulness (15%):** a clear user (a grandparent living alone), a clear need (scams, outages, loneliness), and a next step: a small box in the home.
- **Performance (10%):** latency and tokens/s are shown live under every answer (first word ~0.3 s, ~60 tok/s on an Apple M4).
- **Demo (10%):** below.

### 2-minute demo
1. "Meet Otto." Ask in Spanish: *"Otto, cuéntame un chiste"*. The answer shows its latency and which device answered.
2. Turn the board's Wi-Fi off (`sudo nmcli radio wifi off`). Otto notices on his own, and the badge reads **0 bytes sent**.
3. Show the fake IRS gift-card letter → "Likely a scam: 95%" → **📞 Call Maria**.
4. Storm Mode → don't tap → alarm + **I NEED HELP**.
5. Show the JSONL log: every decision and action, with timestamps.

### Status, honestly
- **Running and tested offline:** all three LFM3 models, every feature above, and the JSONL log. Measured on an Apple M4 with llama.cpp.
- **Built, bringing up on the board:** `BACKEND=iq9` sends Otto's text model to GenieX v0.10.0 on the IQ-9075's Hexagon NPU (LFM3-1.7B Q4_0, capped and validated requests, thinking off). `iq9/setup.sh` and `iq9/serve.sh` set the board up. Next: VL and Audio on the board via the ZETIC Hexagon route.

### Safety
No medicine doses or diagnoses ("call your doctor, or 911"). Never helps send money, buy gift cards or share passwords. Shows its confidence and asks family when unsure. Not a replacement for 911.

---

## Español

### En una línea
Otto es un búho que habla con la abuela en su idioma, la protege de estafas antes de que pague y la cuida cuando se va la luz y el internet. Funciona completamente en el dispositivo con modelos LFM3 de Liquid AI, y su pantalla cuenta cada byte que sale de la casa: 0.

### ¿Por qué no usar la nube?
1. **El internet se cae justo cuando más lo necesita.** El Modo Tormenta es para apagones. Un asistente en la nube deja de funcionar; Otto se da cuenta solo y ofrece ayuda.
2. **Datos muy privados.** Sus recuerdos, fotos familiares, nota médica y las cartas que fotografía nunca salen de la casa.
3. **Costo fijo.** Está siempre encendido y pregunta cómo está cada 30 minutos, sin cobro por uso.

### Qué hace cada modelo
- **LFM3-1.7B** (local; listo para la NPU del iQ9): conversa, hace preguntas de recuerdos, pone títulos y traduce.
- **LFM3-VL-2B:** lee la carta fotografiada y devuelve la probabilidad de cada señal de estafa; mira fotos antiguas y pregunta quién sale en ellas.
- **LFM3-Audio-2B:** entiende su voz en español o inglés.
- **Reglas en código:** nunca da dosis de medicinas, nunca ayuda a enviar dinero; ante la duda dice "llamemos a Maria".

### Lo que lo hace diferente
Actúa por su cuenta: detecta apagones, pregunta "¿Estás bien?" y, si ella no responde en 15 segundos, suena una alarma con la tarjeta **NECESITO AYUDA**. Cada veredicto de estafa termina en una acción: **📞 Llamar a Maria**. Todo queda registrado en un log JSONL.
