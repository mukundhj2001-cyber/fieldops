/**
 * decideTurn — product facade over mock or real TypeSafe/Jev (systemone).
 *
 * Real provider when TYPESAFE_API_KEY is set and JEV_PROVIDER=typesafe.
 * Otherwise mockJev (default for portfolio demos).
 */

import { groundedReply } from "@/lib/kb";
import { scriptText } from "@/lib/scripts";
import { mockJev } from "./mock";
import { TURN_QUESTIONS, type JevAnswer, type JevChoice, type JevQuestion, type JevResponse, type TurnDecision } from "./types";

export type DecideTurnInput = {
  transcript: string;
  history?: Array<{ role: "user" | "agent"; text: string }>;
  sessionId?: string;
};

/** Short English labels for TypeSafe choice criteria */
const OPTION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  intent: {
    greeting: "Caller is greeting or starting the call",
    hours: "Asking about business hours or availability",
    booking: "Wants to book, reschedule, or cancel a field visit",
    shipping: "Asking about shipping, tracking, or delivery",
    refund: "Requesting a refund, return, or money back",
    warranty: "Warranty, defect, or replacement question",
    escalate: "Wants a human agent or is highly dissatisfied",
    goodbye: "Ending the call or saying goodbye",
    account: "Account, login, or password reset help",
    pricing: "Asking about prices, fees, or visit cost",
    privacy: "Privacy, GDPR, or data deletion request",
    field_eta: "Asking when a technician will arrive",
    clarify: "Intent unclear; need to ask a clarifying question",
    general_faq: "General FAQ not covered by a specific intent",
  },
  path: {
    script: "Use a pre-approved scripted reply line",
    rag: "Answer from the knowledge-base / policy documents",
  },
  script_id: {
    greeting: "Welcome / hello script",
    hours: "Business hours script",
    booking_ask: "Ask for booking details",
    booking_confirm: "Confirm a booking",
    shipping_status: "Shipping or tracking status script",
    refund_policy_brief: "Brief refund policy script",
    escalate_apology: "Apology and human-escalation script",
    goodbye: "Call closing script",
    clarify: "Ask the caller to clarify",
    warranty: "Warranty overview script",
    privacy: "Privacy policy brief script",
    technician_eta: "Field technician ETA script",
    pricing_visit: "Visit pricing script",
    account_reset: "Account / password reset script",
    complaint_ack: "Acknowledge a complaint",
    thanks: "Thank-you acknowledgment",
  },
};

function topChoice(raw: JevResponse, questionId: string): string | undefined {
  const a = raw.answers.find((x) => x.questionId === questionId);
  return a?.choices[0]?.choice;
}

function questionConfidence(raw: JevResponse, questionId: string): number {
  return raw.answers.find((x) => x.questionId === questionId)?.confidence ?? 0.5;
}

async function callMock(transcript: string, history?: DecideTurnInput["history"]): Promise<JevResponse> {
  return mockJev(
    {
      transcript,
      history,
      meta: { brand: "Cyberfield Support", sessionId: "local-demo" },
    },
    TURN_QUESTIONS,
  );
}

function buildStateString(transcript: string, history?: DecideTurnInput["history"]): string {
  const lines: string[] = [
    "Brand: Cyberfield Support",
    "You are deciding the next turn for a phone/voice support agent.",
  ];

  if (history && history.length > 0) {
    lines.push("Prior turns:");
    for (const turn of history.slice(-8)) {
      const who = turn.role === "user" ? "Caller" : "Agent";
      lines.push(`${who}: ${turn.text}`);
    }
  }

  lines.push(`Current caller utterance: ${transcript}`);
  return lines.join("\n");
}

function buildTypeSafeQuestions(questions: JevQuestion[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const q of questions) {
    if (q.id === "escalate") {
      // Prefer noul (yes/no probability) for escalate
      out[q.id] = {
        type: "noul",
        instructions: q.prompt || "Escalate to a human specialist now?",
      };
      continue;
    }

    if (q.options && q.options.length > 0) {
      const descriptions = OPTION_DESCRIPTIONS[q.id] ?? {};
      const criteria: Record<string, string> = {};
      for (const opt of q.options) {
        criteria[opt] = descriptions[opt] ?? opt.replace(/_/g, " ");
      }
      out[q.id] = {
        type: "choice",
        instructions: q.prompt,
        criteria,
      };
      continue;
    }

    // Fallback: treat as noul if no options
    out[q.id] = {
      type: "noul",
      instructions: q.prompt,
    };
  }

  return out;
}

type TypeSafeChoiceAnswer = {
  type?: string;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};

type TypeSafeNoulAnswer = {
  type?: string;
  noul?: number;
  confidence?: number;
};

type TypeSafeAnswers = Record<string, TypeSafeChoiceAnswer | TypeSafeNoulAnswer>;

function normalizeTypeSafeAnswers(apiAnswers: TypeSafeAnswers): JevAnswer[] {
  const answers: JevAnswer[] = [];

  for (const [questionId, ans] of Object.entries(apiAnswers ?? {})) {
    if (!ans || typeof ans !== "object") continue;

    // noul escalate → yes/no choices for decideTurn
    if (ans.type === "noul" || ("noul" in ans && typeof (ans as TypeSafeNoulAnswer).noul === "number")) {
      const noul = Number((ans as TypeSafeNoulAnswer).noul ?? 0);
      const yes = noul >= 0.5;
      const conf =
        typeof (ans as TypeSafeNoulAnswer).confidence === "number"
          ? (ans as TypeSafeNoulAnswer).confidence!
          : Math.max(noul, 1 - noul);
      const choices: JevChoice[] = yes
        ? [
            { choice: "yes", score: noul },
            { choice: "no", score: 1 - noul },
          ]
        : [
            { choice: "no", score: 1 - noul },
            { choice: "yes", score: noul },
          ];
      answers.push({ questionId, choices, confidence: conf });
      continue;
    }

    // choice answer
    const choiceAns = ans as TypeSafeChoiceAnswer;
    const probs = choiceAns.probabilities ?? {};
    let choices: JevChoice[];

    if (Object.keys(probs).length > 0) {
      choices = Object.entries(probs)
        .map(([choice, score]) => ({ choice, score: Number(score) || 0 }))
        .sort((a, b) => b.score - a.score);
    } else if (choiceAns.choice) {
      choices = [{ choice: choiceAns.choice, score: choiceAns.confidence ?? 1 }];
    } else {
      choices = [];
    }

    const confidence =
      typeof choiceAns.confidence === "number"
        ? choiceAns.confidence
        : choices[0]?.score ?? 0.5;

    answers.push({ questionId, choices, confidence });
  }

  return answers;
}

/**
 * Real TypeSafe / Jev client — POST /v1/systemone
 */
async function callTypeSafe(
  transcript: string,
  history?: DecideTurnInput["history"],
): Promise<JevResponse> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const baseUrl = (process.env.TYPESAFE_API_URL ?? "https://api.typesafe.ai").replace(/\/$/, "");
  const model = process.env.TYPESAFE_MODEL ?? "jev-latest";

  if (!apiKey) {
    throw new Error("TYPESAFE_API_KEY is not set");
  }

  const body = {
    model,
    state: buildStateString(transcript, history),
    questions: buildTypeSafeQuestions(TURN_QUESTIONS),
  };

  const res = await fetch(`${baseUrl}/v1/systemone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const truncated = errText.slice(0, 400).replace(/\s+/g, " ").trim();
    throw new Error(`TypeSafe/Jev HTTP ${res.status}${truncated ? `: ${truncated}` : ""}`);
  }

  const payload = (await res.json()) as {
    model?: string;
    answers?: TypeSafeAnswers;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const answers = normalizeTypeSafeAnswers(payload.answers ?? {});

  return {
    answers,
    raw: {
      provider: "typesafe",
      model: payload.model,
      usage: payload.usage,
      api: payload,
    },
  };
}

function isRealJevProvider(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY) && process.env.JEV_PROVIDER === "typesafe";
}

export async function decideTurn(input: DecideTurnInput): Promise<TurnDecision> {
  const transcript = input.transcript?.trim() ?? "";

  const raw = isRealJevProvider()
    ? await callTypeSafe(transcript, input.history)
    : await callMock(transcript, input.history);

  const intent = topChoice(raw, "intent") ?? "clarify";
  const escalate = topChoice(raw, "escalate") === "yes";
  const path = (topChoice(raw, "path") as "script" | "rag") ?? "script";
  const scriptId = topChoice(raw, "script_id");
  const confidence = questionConfidence(raw, "intent");

  let reply: string;
  if (path === "rag") {
    const grounded = groundedReply(transcript);
    reply = grounded.reply;
    // If escalating on RAG path, soft-prepend apology when script available
    if (escalate) {
      reply = `${scriptText("escalate_apology")} ${reply}`;
    }
  } else {
    reply = scriptText(scriptId ?? "clarify");
  }

  const actions: TurnDecision["actions"] = [];
  if (escalate) {
    actions.push({
      type: "ticket",
      label: "Create priority support ticket",
      payload: {
        intent,
        transcript: transcript.slice(0, 500),
        priority: "high",
        stub: true,
      },
    });
    actions.push({
      type: "crm",
      label: "Flag CRM contact for specialist callback",
      payload: { queue: "specialist", stub: true },
    });
  }
  if (intent === "booking" && scriptId === "booking_confirm") {
    actions.push({
      type: "booking",
      label: "CRM: confirm field visit booking",
      payload: { status: "confirmed", stub: true },
    });
  }
  if (intent === "booking" && (scriptId === "booking_ask" || scriptId === "booking_reschedule")) {
    actions.push({
      type: "booking",
      label: "CRM: open booking draft",
      payload: { status: "draft", stub: true },
    });
  }

  return {
    intent,
    escalate,
    path,
    scriptId: scriptId ?? undefined,
    reply,
    confidence,
    actions: actions.length ? actions : undefined,
    raw,
  };
}

export { callMock, callTypeSafe, isRealJevProvider };
