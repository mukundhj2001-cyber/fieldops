# FieldOps Voice Agent

Portfolio prep demo for **Cyberfield AI**: a hybrid phone/voice support agent for sample client **Cyberfield Support**.

Stack: **Next.js (App Router) · TypeScript · Tailwind**  
Decisioning: **Jev** (mock TypeSafe-style client today; swappable for real API) + **scripted FAQs** + **naive keyword RAG** (no vector DB / paid LLM required).

## Hybrid architecture

```
Caller turn (text or Web Speech)
        │
        ▼
 POST /api/turn  { transcript, history? }
        │
        ▼
 decideTurn()  ──►  mockJev(state, questions)   [or real TypeSafe when configured]
        │                 │
        │                 ├─ intent, escalate, path (script|rag), script_id, confidence
        │                 └─ choice / score / noul answers
        ▼
 path === "script"  →  reply from src/lib/scripts.ts by script_id
 path === "rag"     →  groundedReply() over src/lib/kb.ts (keyword overlap)
        │
        ▼
 UI: transcript + Decision log + Action log (ticket/CRM stubs)
```

| Layer | Role |
|--------|------|
| **Jev** | Structured decisions (intent, escalate, route, script_id) — not free-form chat |
| **Scripts** | Stable, human-approved lines for greetings, hours, booking, escalate, goodbye |
| **RAG** | Tiny local KB for refund / shipping / warranty / hours policy prose |

The mock client implements the **same request/response shape** as a future TypeSafe client (`JevState` + `JevQuestion[]` → `JevAnswer[]` with `choice` / `score` / `noul` + `confidence`). Swap only the transport in `src/lib/jev/client.ts`.

## Quick start

```bash
cd /workspace/fieldops
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open voice demo** → `/demo/voice`.

```bash
npm run build   # production build check
npm start       # serve production build
```

## Try these turns

1. **Start call** → greeting script  
2. Type `What are your hours?` → `path: script`, `script_id: hours`  
3. Type `I want a refund for order 123` → escalate + RAG policy + Action log ticket/CRM stubs  

Optional: **Mic (Web Speech)** in Chromium-based browsers (no server STT).

## Env — real TypeSafe / Jev later

Copy `.env.example` → `.env.local`:

```bash
TYPESAFE_API_KEY=sk_live_xxx
TYPESAFE_API_URL=https://api.typesafe.example/v1
JEV_PROVIDER=typesafe
```

- **Default (no key):** `mockJev` — no network, no paid APIs  
- **`JEV_PROVIDER=typesafe` + `TYPESAFE_API_KEY`:** `decideTurn` calls `callTypeSafe()` (same `TurnDecision` return shape)

Do **not** commit real keys. `.env*` is gitignored by the Next.js template.

## Project map

```
src/
  app/
    page.tsx              Landing
    demo/voice/page.tsx   Dark voice UI
    api/turn/route.ts     POST → decideTurn (+ RAG if needed)
  components/
    VoiceDemo.tsx         Call panel, decision log, action log
  lib/
    scripts.ts            20+ script lines with stable ids
    kb.ts                 Fake KB + keyword search + groundedReply
    jev/
      types.ts            TypeSafe-style types + TURN_QUESTIONS
      mock.ts             mockJev(state, questions)
      client.ts           decideTurn — mock ↔ real swap point
```

## Git

Repo is initialized locally under `/workspace/fieldops`. Do not push unless explicitly asked.

## License

Private portfolio prep — Cyberfield AI internal sample.
