/**
 * mockJev — same interface as a future TypeSafe/Jev HTTP client.
 * Does keyword/heuristic intent routing from transcript text.
 */

import type { JevAnswer, JevChoice, JevQuestion, JevRequest, JevResponse, JevState } from "./types";

type RouteHit = {
  intent: string;
  escalate: boolean;
  path: "script" | "rag";
  scriptId: string;
  confidence: number;
  noul: string;
};

export async function mockJev(state: JevState, questions: JevQuestion[]): Promise<JevResponse> {
  // Simulate slight network latency like a real API
  await delay(40 + Math.floor(Math.random() * 80));

  const route = routeFromTranscript(state.transcript ?? "");
  const answers: JevAnswer[] = questions.map((q) => answerForQuestion(q, route));

  return {
    answers,
    raw: {
      provider: "mockJev",
      transcript: state.transcript,
      route,
      historyLength: state.history?.length ?? 0,
    },
  };
}

/** Drop-in signature matching a future real client */
export async function mockJevRequest(req: JevRequest): Promise<JevResponse> {
  return mockJev(req.state, req.questions);
}

function answerForQuestion(q: JevQuestion, route: RouteHit): JevAnswer {
  const pick = (choice: string, score: number, noul?: string): JevChoice => ({
    choice,
    score,
    noul,
  });

  switch (q.id) {
    case "intent":
      return {
        questionId: q.id,
        choices: [
          pick(route.intent, route.confidence, route.noul),
          ...altIntents(route.intent).map((i, idx) => pick(i, Math.max(0.05, route.confidence - 0.2 - idx * 0.1))),
        ],
        confidence: route.confidence,
      };
    case "escalate":
      return {
        questionId: q.id,
        choices: [
          pick(route.escalate ? "yes" : "no", route.escalate ? 0.9 : 0.85, route.noul),
          pick(route.escalate ? "no" : "yes", 0.15),
        ],
        confidence: route.escalate ? 0.9 : 0.85,
      };
    case "path":
      return {
        questionId: q.id,
        choices: [
          pick(route.path, 0.88, `Route via ${route.path}`),
          pick(route.path === "script" ? "rag" : "script", 0.12),
        ],
        confidence: 0.88,
      };
    case "script_id":
      return {
        questionId: q.id,
        choices: [pick(route.scriptId, route.path === "script" ? 0.9 : 0.4, `Chosen script ${route.scriptId}`)],
        confidence: route.path === "script" ? 0.9 : 0.4,
      };
    default:
      return {
        questionId: q.id,
        choices: [pick("unknown", 0.2)],
        confidence: 0.2,
      };
  }
}

function altIntents(primary: string): string[] {
  const pool = ["clarify", "general_faq", "hours", "booking", "refund"];
  return pool.filter((i) => i !== primary).slice(0, 2);
}

function routeFromTranscript(text: string): RouteHit {
  const t = text.toLowerCase().trim();

  if (!t) {
    return {
      intent: "greeting",
      escalate: false,
      path: "script",
      scriptId: "greeting",
      confidence: 0.95,
      noul: "Empty / call start → greeting",
    };
  }

  // Escalation / anger / human request
  if (
    /\b(human|agent|manager|supervisor|complaint|angry|lawsuit|attorney|lawyer|speak to (a |someone|a person))\b/.test(t) ||
    /\b(this is ridiculous|unacceptable|furious)\b/.test(t)
  ) {
    return {
      intent: "escalate",
      escalate: true,
      path: "script",
      scriptId: /complaint|furious|unacceptable|ridiculous/.test(t) ? "complaint_ack" : "escalate_apology",
      confidence: 0.92,
      noul: "Caller requested human or expressed strong dissatisfaction",
    };
  }

  // Refund — escalate or RAG policy (prefer escalate when order id present)
  if (/\b(refund|return|money back|rma)\b/.test(t)) {
    const hasOrder = /\b(order|#)?\s*\d{3,}\b/.test(t) || /\border\b/.test(t);
    if (hasOrder || /\b(want|need|request|process|start)\b.*\brefund\b/.test(t) || /\brefund\b.*\b(want|need|for)\b/.test(t)) {
      return {
        intent: "refund",
        escalate: true,
        path: "rag",
        scriptId: "escalate_apology",
        confidence: 0.9,
        noul: "Refund request with order context → RAG policy + escalate ticket",
      };
    }
    return {
      intent: "refund",
      escalate: false,
      path: "script",
      scriptId: "refund_policy_brief",
      confidence: 0.84,
      noul: "General refund question → brief script",
    };
  }

  if (/\b(hour|open|close|hours|when are you|availability|timezone)\b/.test(t)) {
    return {
      intent: "hours",
      escalate: false,
      path: "script",
      scriptId: "hours",
      confidence: 0.93,
      noul: "Hours / availability FAQ → scripted hours",
    };
  }

  if (/\b(book|schedule|appointment|reschedule|cancel (my )?appointment|visit)\b/.test(t)) {
    if (/\bcancel\b/.test(t)) {
      return {
        intent: "booking",
        escalate: false,
        path: "script",
        scriptId: "booking_cancel",
        confidence: 0.88,
        noul: "Cancel appointment",
      };
    }
    if (/\breschedule\b/.test(t)) {
      return {
        intent: "booking",
        escalate: false,
        path: "script",
        scriptId: "booking_reschedule",
        confidence: 0.88,
        noul: "Reschedule appointment",
      };
    }
    if (/\b(confirm|confirmed|all set|yes.*(book|schedule)|book.*(yes|please))\b/.test(t)) {
      return {
        intent: "booking",
        escalate: false,
        path: "script",
        scriptId: "booking_confirm",
        confidence: 0.86,
        noul: "Booking confirmation",
      };
    }
    return {
      intent: "booking",
      escalate: false,
      path: "script",
      scriptId: "booking_ask",
      confidence: 0.87,
      noul: "Booking intake",
    };
  }

  if (/\b(ship|shipping|track|tracking|delivery|package|where is my order)\b/.test(t)) {
    // Prefer RAG for detailed shipping policy; script for simple status ask
    if (/\b(policy|international|damaged|customs|expedited|ground)\b/.test(t)) {
      return {
        intent: "shipping",
        escalate: false,
        path: "rag",
        scriptId: "shipping_status",
        confidence: 0.86,
        noul: "Shipping policy detail → RAG",
      };
    }
    return {
      intent: "shipping",
      escalate: false,
      path: "script",
      scriptId: "shipping_status",
      confidence: 0.85,
      noul: "Shipping status ask → script",
    };
  }

  if (/\b(warrant(y|ies)|serial|defect|replacement)\b/.test(t)) {
    return {
      intent: "warranty",
      escalate: false,
      path: "rag",
      scriptId: "warranty",
      confidence: 0.84,
      noul: "Warranty → RAG kb_warranty",
    };
  }

  if (/\b(privacy|gdpr|delete my data|personal data)\b/.test(t)) {
    return {
      intent: "privacy",
      escalate: false,
      path: "script",
      scriptId: "privacy",
      confidence: 0.88,
      noul: "Privacy FAQ",
    };
  }

  if (/\b(password|reset|login|account|sign in)\b/.test(t)) {
    return {
      intent: "account",
      escalate: false,
      path: "script",
      scriptId: "account_reset",
      confidence: 0.86,
      noul: "Account reset",
    };
  }

  if (/\b(price|pricing|cost|how much|fee|diagnostic)\b/.test(t)) {
    return {
      intent: "pricing",
      escalate: false,
      path: "script",
      scriptId: "pricing_visit",
      confidence: 0.87,
      noul: "Pricing FAQ",
    };
  }

  if (/\b(eta|technician|tech (on the way|arrival)|field (tech|visit))\b/.test(t)) {
    return {
      intent: "field_eta",
      escalate: false,
      path: "script",
      scriptId: "technician_eta",
      confidence: 0.86,
      noul: "Field ETA",
    };
  }

  if (/\b(bye|goodbye|that'?s all|nothing else|hang up|end (the )?call)\b/.test(t)) {
    return {
      intent: "goodbye",
      escalate: false,
      path: "script",
      scriptId: "goodbye",
      confidence: 0.94,
      noul: "Call closing",
    };
  }

  if (/\b(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t) && t.split(/\s+/).length < 6) {
    return {
      intent: "greeting",
      escalate: false,
      path: "script",
      scriptId: "greeting",
      confidence: 0.9,
      noul: "Greeting",
    };
  }

  if (/\b(thanks|thank you|appreciate)\b/.test(t)) {
    return {
      intent: "greeting",
      escalate: false,
      path: "script",
      scriptId: "thanks",
      confidence: 0.88,
      noul: "Thanks ack",
    };
  }

  // Default: clarify via script, low confidence
  return {
    intent: "clarify",
    escalate: false,
    path: "script",
    scriptId: "clarify",
    confidence: 0.45,
    noul: "No strong keyword match → clarify",
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
