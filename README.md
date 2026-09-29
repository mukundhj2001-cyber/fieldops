# FieldOps Voice Agent

Portfolio prep demo for **Cyberfield AI**: a hybrid phone/voice support agent for sample client **Cyberfield Support**.

Stack: **Next.js (App Router) · TypeScript · Tailwind**  
Decisioning: **Jev** via TypeSafe `/v1/systemone` when configured (otherwise `mockJev`) + **scripted FAQs** + **naive keyword RAG**.

## Hybrid architecture

```
Caller turn (text or Web Speech)
        │
        ▼
 POST /api/turn  { transcript, history? }
        │
        ▼
 decideTurn()  ──►  callTypeSafe → POST /v1/systemone   [or mockJev when JEV_PROVIDER!=typesafe]
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

`decideTurn` normalizes both mock and TypeSafe responses into `JevAnswer[]` (`choice` / `score` / `confidence`). Real transport lives in `callTypeSafe` (`src/lib/jev/client.ts`).

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

## Env — TypeSafe / Jev

Copy `.env.example` → `.env.local` and uncomment / fill in:

```bash
TYPESAFE_API_KEY=          # your TypeSafe key (never commit)
TYPESAFE_API_URL=https://api.typesafe.ai
TYPESAFE_MODEL=jev-latest
JEV_PROVIDER=typesafe
```

- **Default (`JEV_PROVIDER` unset/mock, or no key):** `mockJev` — no network, no paid APIs
- **`JEV_PROVIDER=typesafe` + `TYPESAFE_API_KEY`:** `decideTurn` → `callTypeSafe()` which POSTs to `{TYPESAFE_API_URL}/v1/systemone` (Bearer auth, model `jev-latest` by default). Same `TurnDecision` return shape; escalate uses TypeSafe `noul` (≥0.5 → yes).

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

Remote: `https://github.com/mukundhj2001-cyber/fieldops`.

## License

Private portfolio prep — Cyberfield AI internal sample.
