/**
 * Twilio Voice inbound webhook.
 *
 * Configure the phone number Voice URL to:
 *   {PUBLIC_BASE_URL}/api/twilio/voice  (POST)
 *
 * Flow:
 *  1. First hit (no SpeechResult) → greet + <Gather speech>
 *  2. Gather callback with SpeechResult → decideTurn → <Say> reply → Gather again
 *  3. goodbye / bye → Say goodbye + <Hangup/>
 *  4. escalate → Say escalate line + <Hangup/>
 */

import { decideTurn } from "@/lib/jev/client";
import {
  appendCallTurn,
  clearCallSession,
  getCallHistory,
} from "@/lib/twilio/session";
import {
  buildSayAndHangup,
  buildSayThenGather,
  escalateLine,
  goodbyeLine,
  greetingLine,
  looksLikeGoodbye,
  stripForTts,
  twimlResponse,
  validateTwilioSignature,
} from "@/lib/twilio/voice";

export const runtime = "nodejs";

const VOICE_PATH = "/api/twilio/voice";

async function parseTwilioForm(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  const params: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") params[key] = value;
    }
    return params;
  }

  // Fallback: raw urlencoded body
  const text = await req.text();
  if (text) {
    const search = new URLSearchParams(text);
    for (const [key, value] of search.entries()) {
      params[key] = value;
    }
  }
  return params;
}

function gatherActionUrl(): string {
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  // Absolute action when public URL known (Twilio prefers absolute for Gather);
  // relative still works when Twilio posts back to the same host.
  return base ? `${base}${VOICE_PATH}` : VOICE_PATH;
}

export async function POST(req: Request) {
  let params: Record<string, string>;
  try {
    params = await parseTwilioForm(req);
  } catch {
    return twimlResponse(
      buildSayAndHangup("Sorry, we could not process this call. Please try again later."),
      400,
    );
  }

  const signature = req.headers.get("x-twilio-signature");
  const validation = validateTwilioSignature({
    authToken: process.env.TWILIO_AUTH_TOKEN,
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    signature,
    path: VOICE_PATH,
    params,
  });

  if (!validation.ok) {
    console.warn("[twilio/voice] signature rejected:", validation.reason);
    return new Response("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid ?? "unknown";
  const speechResult = (params.SpeechResult ?? "").trim();
  const confidence = params.Confidence;
  const action = gatherActionUrl();

  // --- First inbound hit: greet + gather ---
  if (!speechResult) {
    const greeting = greetingLine();
    // Seed session with agent greeting so history is coherent
    if (callSid !== "unknown") {
      appendCallTurn(callSid, { role: "agent", text: greeting });
    }
    return twimlResponse(buildSayThenGather(greeting, { action }));
  }

  // --- Gather result: decide next turn ---
  if (confidence) {
    console.info(
      `[twilio/voice] CallSid=${callSid} confidence=${confidence} speech=${speechResult.slice(0, 120)}`,
    );
  }

  const history = getCallHistory(callSid);

  try {
    const decision = await decideTurn({
      transcript: speechResult,
      history,
      sessionId: callSid,
    });

    appendCallTurn(callSid, { role: "user", text: speechResult });

    const intent = decision.intent;
    const scriptId = decision.scriptId;
    const isGoodbye =
      intent === "goodbye" ||
      scriptId === "goodbye" ||
      looksLikeGoodbye(speechResult);

    if (isGoodbye) {
      const line = stripForTts(decision.reply || goodbyeLine());
      appendCallTurn(callSid, { role: "agent", text: line });
      clearCallSession(callSid);
      return twimlResponse(buildSayAndHangup(line));
    }

    if (decision.escalate || intent === "escalate" || scriptId === "escalate_apology") {
      // Prefer decideTurn reply when present; fall back to escalate script
      const line = stripForTts(decision.reply || escalateLine());
      appendCallTurn(callSid, { role: "agent", text: line });
      clearCallSession(callSid);
      // Trial demo: notify + hang up (no real transfer)
      return twimlResponse(
        buildSayAndHangup(
          `${line} A specialist has been notified. Thank you for calling Cyberfield Support. Goodbye.`,
        ),
      );
    }

    const reply = stripForTts(decision.reply);
    appendCallTurn(callSid, { role: "agent", text: reply });
    return twimlResponse(buildSayThenGather(reply, { action }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "decideTurn failed";
    console.error("[twilio/voice] decideTurn error:", message);
    return twimlResponse(
      buildSayAndHangup(
        "I'm sorry — I'm having trouble completing that request. Please try again in a moment. Goodbye.",
      ),
      500,
    );
  }
}

/** Health / misconfigured webhook probe */
export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      endpoint: VOICE_PATH,
      method: "POST",
      hint: "Configure Twilio Voice webhook to this path with method POST",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
