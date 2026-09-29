/**
 * TypeSafe / Jev-shaped types for decision turns.
 * Keep this interface stable so mockJev and a real client stay interchangeable.
 */

export type JevChoice = {
  /** Selected option id or label */
  choice: string;
  /** Relative score / preference mass */
  score: number;
  /** Optional explanation / natural-language rationale (noul-style) */
  noul?: string;
};

export type JevAnswer = {
  questionId: string;
  /** Ranked choices; first is preferred */
  choices: JevChoice[];
  /** Aggregate confidence 0–1 for this answer */
  confidence: number;
};

export type JevQuestion = {
  id: string;
  prompt: string;
  /** Allowed choice ids when constrained */
  options?: string[];
};

export type JevState = {
  /** Running transcript / utterance text for this turn */
  transcript: string;
  /** Optional prior turn summaries */
  history?: Array<{ role: "user" | "agent"; text: string }>;
  /** Call / session metadata */
  meta?: {
    sessionId?: string;
    brand?: string;
  };
};

export type JevRequest = {
  state: JevState;
  questions: JevQuestion[];
};

export type JevResponse = {
  answers: JevAnswer[];
  /** Raw passthrough for debugging / Decision log */
  raw?: Record<string, unknown>;
};

/** Product-facing decision after mapping Jev answers */
export type TurnDecision = {
  intent: string;
  escalate: boolean;
  path: "script" | "rag";
  scriptId?: string;
  reply: string;
  confidence: number;
  /** Optional CRM / ticket stub hints */
  actions?: Array<{
    type: "ticket" | "crm" | "booking";
    label: string;
    payload?: Record<string, unknown>;
  }>;
  raw: JevResponse;
};

export const TURN_QUESTIONS: JevQuestion[] = [
  {
    id: "intent",
    prompt: "What is the caller intent?",
    options: [
      "greeting",
      "hours",
      "booking",
      "shipping",
      "refund",
      "warranty",
      "escalate",
      "goodbye",
      "account",
      "pricing",
      "privacy",
      "field_eta",
      "clarify",
      "general_faq",
    ],
  },
  {
    id: "escalate",
    prompt: "Should we escalate to a human specialist?",
    options: ["yes", "no"],
  },
  {
    id: "path",
    prompt: "Answer via scripted line or knowledge-base RAG?",
    options: ["script", "rag"],
  },
  {
    id: "script_id",
    prompt: "If path is script, which script id?",
    options: [
      "greeting",
      "hours",
      "booking_ask",
      "booking_confirm",
      "shipping_status",
      "refund_policy_brief",
      "escalate_apology",
      "goodbye",
      "clarify",
      "warranty",
      "privacy",
      "technician_eta",
      "pricing_visit",
      "account_reset",
      "complaint_ack",
      "thanks",
    ],
  },
];
