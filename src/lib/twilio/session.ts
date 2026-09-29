/**
 * In-memory call session history keyed by Twilio CallSid.
 * Demo-only — resets on process restart; no Redis needed.
 */

export type CallTurn = { role: "user" | "agent"; text: string };

type CallSession = {
  history: CallTurn[];
  updatedAt: number;
};

const sessions = new Map<string, CallSession>();

/** Drop sessions idle longer than this (ms). */
const TTL_MS = 60 * 60 * 1000;

function prune(now = Date.now()) {
  for (const [sid, s] of sessions) {
    if (now - s.updatedAt > TTL_MS) sessions.delete(sid);
  }
}

export function getCallHistory(callSid: string): CallTurn[] {
  prune();
  return sessions.get(callSid)?.history ?? [];
}

export function appendCallTurn(callSid: string, turn: CallTurn): CallTurn[] {
  prune();
  const existing = sessions.get(callSid)?.history ?? [];
  const history = [...existing, turn];
  sessions.set(callSid, { history, updatedAt: Date.now() });
  return history;
}

export function clearCallSession(callSid: string): void {
  sessions.delete(callSid);
}
