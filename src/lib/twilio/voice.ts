/**
 * Twilio Voice helpers: TTS-friendly text, Gather/Say/Hangup builders.
 */

import twilio from "twilio";
import { scriptText } from "@/lib/scripts";

const VoiceResponse = twilio.twiml.VoiceResponse;

/** Clear professional Polly voice for en-US. */
export const SAY_VOICE = "Polly.Joanna";
export const SAY_LANGUAGE = "en-US";

/** Max spoken characters for Twilio <Say> (keep turns scannable). */
const TTS_MAX_CHARS = 420;

/** Strip markdown / markdown-ish markup for Twilio <Say>. */
export function stripForTts(text: string): string {
  const out = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (out.length <= TTS_MAX_CHARS) return out;

  const sliced = out.slice(0, TTS_MAX_CHARS);
  const sentenceEnd = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf("? "), sliced.lastIndexOf("! "));
  if (sentenceEnd > TTS_MAX_CHARS * 0.5) {
    return sliced.slice(0, sentenceEnd + 1).trim();
  }
  const sp = sliced.lastIndexOf(" ");
  return (sp > 0 ? sliced.slice(0, sp) : sliced).trim() + "…";
}

export function greetingLine(): string {
  return scriptText("greeting");
}

export function goodbyeLine(): string {
  return scriptText("goodbye");
}

export function escalateLine(): string {
  return scriptText("escalate_apology");
}

/** Detect casual goodbye in raw speech when intent mapping is soft. */
export function looksLikeGoodbye(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  return /\b(goodbye|good bye|bye[\s-]?bye|bye|hang up|that'?s all|nothing else|end (the )?call|have a (good|nice) day)\b/.test(
    t,
  );
}

export type GatherOptions = {
  /** Absolute or relative action URL for the Gather callback. */
  action: string;
};

/** Nested Say inside Gather so speech after the prompt is captured. */
export function buildGatherPrompt(vr: InstanceType<typeof VoiceResponse>, prompt: string, opts: GatherOptions) {
  const gather = vr.gather({
    input: ["speech"],
    action: opts.action,
    method: "POST",
    speechTimeout: "auto",
    language: SAY_LANGUAGE,
    enhanced: true,
    hints: "hours, booking, refund, warranty, shipping, technician, goodbye",
  });
  gather.say({ voice: SAY_VOICE, language: SAY_LANGUAGE }, stripForTts(prompt));
}

export function buildSayThenGather(prompt: string, opts: GatherOptions): string {
  const vr = new VoiceResponse();
  buildGatherPrompt(vr, prompt, opts);
  // If gather times out with no speech, re-prompt gently
  vr.say(
    { voice: SAY_VOICE, language: SAY_LANGUAGE },
    "I didn't catch that. Please call back if you still need help. Goodbye.",
  );
  vr.hangup();
  return vr.toString();
}

export function buildSayAndHangup(text: string): string {
  const vr = new VoiceResponse();
  vr.say({ voice: SAY_VOICE, language: SAY_LANGUAGE }, stripForTts(text));
  vr.hangup();
  return vr.toString();
}

export function twimlResponse(xml: string, status = 200): Response {
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Validate Twilio request signature when auth token + public base URL are set.
 * Returns { ok: true } or { ok: false, reason }.
 * If PUBLIC_BASE_URL is missing, skips validation (dev/ngrok-ready) with a warning.
 */
export function validateTwilioSignature(args: {
  authToken: string | undefined;
  publicBaseUrl: string | undefined;
  signature: string | null;
  path: string;
  params: Record<string, string>;
}): { ok: boolean; skipped?: boolean; reason?: string } {
  const { authToken, publicBaseUrl, signature, path, params } = args;

  if (!authToken) {
    return { ok: true, skipped: true, reason: "TWILIO_AUTH_TOKEN missing — skipping signature check" };
  }

  if (!publicBaseUrl) {
    console.warn(
      "[twilio/voice] PUBLIC_BASE_URL not set — skipping signature validation (ok for local/ngrok until URL is configured)",
    );
    return { ok: true, skipped: true, reason: "PUBLIC_BASE_URL missing" };
  }

  if (!signature) {
    return { ok: false, reason: "Missing X-Twilio-Signature header" };
  }

  const base = publicBaseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    return { ok: false, reason: "Invalid Twilio signature" };
  }
  return { ok: true };
}

export { VoiceResponse };
