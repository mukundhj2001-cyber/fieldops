/**
 * decideTurn — product facade over mock (or later real) Jev.
 *
 * Swap strategy:
 *   1. Set TYPESAFE_API_KEY (and optional TYPESAFE_API_URL) in env
 *   2. Replace callMock with callTypeSafe below — keep TurnDecision shape
 */

import { groundedReply } from "@/lib/kb";
import { scriptText } from "@/lib/scripts";
import { mockJev } from "./mock";
import { TURN_QUESTIONS, type JevResponse, type TurnDecision } from "./types";

export type DecideTurnInput = {
  transcript: string;
  history?: Array<{ role: "user" | "agent"; text: string }>;
  sessionId?: string;
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

/**
 * Future real client stub — same return type as mockJev.
 * Uncomment body when TYPESAFE_API_KEY is configured.
 */
async function callTypeSafe(
  transcript: string,
  history?: DecideTurnInput["history"],
): Promise<JevResponse> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const baseUrl = process.env.TYPESAFE_API_URL ?? "https://api.typesafe.example/v1";

  if (!apiKey) {
    throw new Error("TYPESAFE_API_KEY is not set");
  }

  const res = await fetch(`${baseUrl}/decide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      state: {
        transcript,
        history,
        meta: { brand: "Cyberfield Support" },
      },
      questions: TURN_QUESTIONS,
    }),
  });

  if (!res.ok) {
    throw new Error(`TypeSafe/Jev HTTP ${res.status}`);
  }

  return (await res.json()) as JevResponse;
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
