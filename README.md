# FieldOps · Cyberfield Support

Public-facing voice/chat support UI for sample client **Cyberfield Support**, backed by a hybrid agent (Jev decisions + scripted FAQs + keyword RAG).

The **site UI** is written for a support caller. Decision/debug panels are off by default; the API still returns full turn metadata for builders.

## Stack

Next.js (App Router) · TypeScript · Tailwind  
Decisioning: **Jev** via TypeSafe `/v1/systemone` when configured (otherwise `mockJev`) + **scripted FAQs** + **naive keyword RAG**.

## Architecture (builders)

```
Caller turn (text or Web Speech)
        │
        ▼
 POST /api/turn  { transcript, history? }
        │
        ▼
 decideTurn()  ──►  callTypeSafe → POST /v1/systemone   [or mockJev]
        │
        ▼
 path === "script"  →  reply from src/lib/scripts.ts
 path === "rag"     →  groundedReply() over src/lib/kb.ts
        │
        ▼
 UI: transcript + friendly escalate notices
 (API still returns intent / path / confidence / actions / raw)
```

| Layer | Role |
|--------|------|
| **Jev** | Structured decisions (intent, escalate, route, script_id) |
| **Scripts** | Stable lines for greetings, hours, booking, escalate, goodbye |
| **RAG** | Tiny local KB for refund / shipping / warranty / hours prose |

## Quick start

```bash
cd /workspace/fieldops
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Start conversation** → `/demo/voice`.

```bash
npm run build
npm start
```

## Try these turns

1. **Start conversation** → greeting  
2. Type `What are your hours?`  
3. Type `I want a refund for order 123` → escalate notice + policy reply  

Optional: **Microphone** in Chromium-based browsers (Web Speech; no server STT).

## Env — TypeSafe / Jev

Copy `.env.example` → `.env.local`:

```bash
TYPESAFE_API_KEY=          # never commit
TYPESAFE_API_URL=https://api.typesafe.ai
TYPESAFE_MODEL=jev-latest
JEV_PROVIDER=typesafe
# NEXT_PUBLIC_SHOW_DEBUG=1   # optional collapsed Dev details on voice page
```

- **Default (`JEV_PROVIDER` unset/mock, or no key):** `mockJev`  
- **`JEV_PROVIDER=typesafe` + key:** real TypeSafe `/v1/systemone`

`.env*` is gitignored.

## Project map

```
src/
  app/
    page.tsx              Public landing (Cyberfield Support)
    demo/voice/page.tsx   Voice/chat conversation UI
    api/turn/route.ts     POST → decideTurn (+ RAG if needed)
    api/twilio/voice/     POST → Twilio Voice TwiML (inbound phone)
  components/
    VoiceDemo.tsx         Customer call panel (debug UI behind env flag)
  lib/
    scripts.ts            Script lines
    kb.ts                 Local KB + keyword search
    jev/
      types.ts            Types + TURN_QUESTIONS
      mock.ts             mockJev
      client.ts           decideTurn — mock ↔ TypeSafe
    twilio/
      session.ts          In-memory CallSid history
      voice.ts            TwiML helpers + signature check
```

## Public UI vs API

- **Default UI:** clean Cyberfield Support product — no decision log, provider labels, or stub JSON.  
- **API:** `/api/turn` still returns full `TurnDecision` (intent, path, confidence, actions, raw).  
- **Optional:** set `NEXT_PUBLIC_SHOW_DEBUG=1` for a collapsed “Dev details” panel on the voice page.


## Phone (Twilio trial)

Inbound PSTN calling is a **separate path** from the web VoiceDemo. The dashboard UI stays for demos; real phone calls hit Twilio → this app’s TwiML webhook → `decideTurn()`.

### 1. Buy a number
In [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming), buy an Incoming Number (trial accounts can only call/receive from [verified caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)).

### 2. Env
Copy `.env.example` → `.env.local` and set:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...
PUBLIC_BASE_URL=https://xxxx.ngrok-free.app   # must be HTTPS, no trailing slash
```

Leave `TWILIO_PHONE_NUMBER` / `PUBLIC_BASE_URL` empty until you have values — the route still responds so local testing works once the URL is set.

### 3. Expose HTTPS
```bash
npm run dev          # localhost:3000
ngrok http 3000      # or: cloudflared tunnel --url http://localhost:3000
```
Put the tunnel HTTPS origin into `PUBLIC_BASE_URL`, then restart the Next.js process so the env is loaded.

### 4. Configure the Voice webhook
On the Incoming Number → **Voice & Fax** → **A call comes in**:
- URL: `{PUBLIC_BASE_URL}/api/twilio/voice`
- Method: **HTTP POST**

### 5. Call
Dial your Twilio number from a **verified** trial caller ID. You should hear the Cyberfield Support greeting, then speak naturally (hours, booking, refund, goodbye, etc.).

Signature validation uses `TWILIO_AUTH_TOKEN` + `PUBLIC_BASE_URL`. If `PUBLIC_BASE_URL` is unset, the handler logs a warning and still answers (useful until ngrok is configured).

Endpoints:
- `POST /api/twilio/voice` — inbound + Gather callback (TwiML)
- `GET  /api/twilio/voice` — small JSON health probe

## Git

Remote: `https://github.com/mukundhj2001-cyber/fieldops`.

## License

Private sample for Cyberfield AI agency portfolio demos.
