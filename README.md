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
  components/
    VoiceDemo.tsx         Customer call panel (debug UI behind env flag)
  lib/
    scripts.ts            Script lines
    kb.ts                 Local KB + keyword search
    jev/
      types.ts            Types + TURN_QUESTIONS
      mock.ts             mockJev
      client.ts           decideTurn — mock ↔ TypeSafe
```

## Public UI vs API

- **Default UI:** clean Cyberfield Support product — no decision log, provider labels, or stub JSON.  
- **API:** `/api/turn` still returns full `TurnDecision` (intent, path, confidence, actions, raw).  
- **Optional:** set `NEXT_PUBLIC_SHOW_DEBUG=1` for a collapsed “Dev details” panel on the voice page.

## Git

Remote: `https://github.com/mukundhj2001-cyber/fieldops`.

## License

Private sample for Cyberfield AI agency portfolio demos.
