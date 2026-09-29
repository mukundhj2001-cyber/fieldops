/**
 * Tiny fake knowledge base for naive keyword RAG (no vector DB).
 * Used when Jev routes path === 'rag'.
 */

export type KbDoc = {
  id: string;
  title: string;
  tags: string[];
  body: string;
};

export const KB_DOCS: KbDoc[] = [
  {
    id: "kb_hours",
    title: "Support Hours",
    tags: ["hours", "open", "schedule", "availability", "timezone", "holiday"],
    body: "Cyberfield Support phone and chat: Mon–Fri 8:00 AM–8:00 PM ET, Sat 9:00 AM–5:00 PM ET. Closed Sundays and U.S. federal holidays. After-hours: leave a message or email support@cyberfield.example for next-business-day follow-up.",
  },
  {
    id: "kb_refund",
    title: "Refund Policy",
    tags: ["refund", "return", "money", "cancel order", "credit", "rma"],
    body: "Refunds within 30 days of delivery for unused items in original packaging. Opened software licenses and custom-configured kits are non-refundable. Start a return in the portal or by phone; RMA label emailed within 1 business day. Refunds post 5–10 business days after warehouse receipt. Order-number required.",
  },
  {
    id: "kb_shipping",
    title: "Shipping & Tracking",
    tags: ["shipping", "track", "delivery", "carrier", "order status", "package"],
    body: "Standard ground: 3–5 business days. Expedited: 1–2 business days. Tracking emails go out at shipment. International orders may incur customs delays. Damaged-in-transit claims need photos within 48 hours of delivery.",
  },
  {
    id: "kb_warranty",
    title: "Hardware Warranty",
    tags: ["warranty", "defect", "serial", "repair", "replacement"],
    body: "12-month limited warranty from ship date covers manufacturing defects. Excludes accidental damage, water, and consumables. Provide serial number for warranty check. In-warranty: advance replacement or depot repair at no parts cost.",
  },
  {
    id: "kb_field_visit",
    title: "Field Technician Visits",
    tags: ["technician", "visit", "onsite", "appointment", "eta", "field"],
    body: "Book Mon–Sat inside support hours. Diagnostic fee $79 credited toward approved repair. SMS two-hour window day-before; live ETA ~30 minutes prior. Cancel/reschedule free ≥24 hours ahead; late cancel may incur diagnostic fee.",
  },
  {
    id: "kb_privacy",
    title: "Privacy & Data",
    tags: ["privacy", "data", "gdpr", "delete", "personal information"],
    body: "Contact data used only for support and scheduling. We do not sell personal data. Request export or deletion via privacy@cyberfield.example. Call recordings retained 90 days for quality, then deleted.",
  },
];

export type KbHit = {
  doc: KbDoc;
  score: number;
};

/** Naive keyword overlap score against title, tags, and body. */
export function searchKb(query: string, topK = 2): KbHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = KB_DOCS.map((doc) => {
    const hay = tokenize(`${doc.title} ${doc.tags.join(" ")} ${doc.body}`);
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
      // light boost for tag hits
      if (doc.tags.some((tag) => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))) {
        score += 0.5;
      }
    }
    return { doc, score };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

export function groundedReply(query: string): { reply: string; sources: string[]; confidence: number } {
  const hits = searchKb(query, 2);
  if (hits.length === 0) {
    return {
      reply:
        "I don't have a policy match for that yet. I can connect you with a specialist, or you can rephrase with keywords like hours, refund, shipping, or warranty.",
      sources: [],
      confidence: 0.35,
    };
  }

  const primary = hits[0];
  const secondary = hits[1];
  let reply = `Based on our ${primary.doc.title}: ${primary.doc.body}`;
  if (secondary && secondary.score >= primary.score * 0.6) {
    reply += ` Also relevant — ${secondary.doc.title}: ${secondary.doc.body.slice(0, 160)}${secondary.doc.body.length > 160 ? "…" : ""}`;
  }

  const maxPossible = Math.max(tokenize(query).length * 1.5, 1);
  const confidence = Math.min(0.95, 0.45 + primary.score / maxPossible);

  return {
    reply,
    sources: hits.map((h) => h.doc.id),
    confidence: Number(confidence.toFixed(2)),
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "are",
  "you",
  "your",
  "our",
  "with",
  "what",
  "when",
  "where",
  "how",
  "can",
  "could",
  "would",
  "please",
  "about",
  "this",
  "that",
  "have",
  "from",
  "want",
  "need",
  "tell",
  "know",
]);
