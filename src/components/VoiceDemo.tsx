"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HistoryItem = { role: "user" | "agent"; text: string };

type TurnDecision = {
  intent: string;
  escalate: boolean;
  path: "script" | "rag";
  scriptId?: string;
  reply: string;
  confidence: number;
  actions?: Array<{
    type: "ticket" | "crm" | "booking";
    label: string;
    payload?: Record<string, unknown>;
  }>;
  raw: unknown;
};

type Notice = {
  id: string;
  text: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SHOW_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SHOW_DEBUG === "1";

export default function VoiceDemo() {
  const [inCall, setInCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugTurns, setDebugTurns] = useState<
    Array<{ id: string; userText: string; decision: TurnDecision }>
  >([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<HistoryItem[]>([]);
  const busyRef = useRef(false);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, notices]);

  const pushCustomerNotices = useCallback((decision: TurnDecision) => {
    const next: Notice[] = [];
    if (decision.escalate) {
      next.push({
        id: uid(),
        text: "A specialist has been notified. Someone from our team will follow up with you shortly.",
      });
    } else if (decision.actions?.some((a) => a.type === "booking")) {
      next.push({
        id: uid(),
        text: "We've noted your booking request. You'll get a confirmation shortly.",
      });
    }
    if (next.length) {
      setNotices((prev) => [...next, ...prev].slice(0, 4));
    }
  }, []);

  const runTurn = useCallback(
    async (userText: string, historyOverride?: HistoryItem[]) => {
      const text = userText.trim();
      if (!text || busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      setError(null);
      const history = historyOverride ?? transcriptRef.current;
      const nextUser: HistoryItem = { role: "user", text };
      setTranscript([...history, nextUser]);
      transcriptRef.current = [...history, nextUser];

      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, history }),
        });
        const data = (await res.json()) as TurnDecision & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const withAgent: HistoryItem[] = [
          ...transcriptRef.current,
          { role: "agent", text: data.reply },
        ];
        transcriptRef.current = withAgent;
        setTranscript(withAgent);
        pushCustomerNotices(data);

        if (SHOW_DEBUG) {
          setDebugTurns((prev) => [
            { id: uid(), userText: text, decision: data },
            ...prev,
          ]);
        }

        if (typeof window !== "undefined" && window.speechSynthesis && data.reply) {
          try {
            const utter = new SpeechSynthesisUtterance(data.reply);
            utter.rate = 1.02;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
          } catch {
            /* ignore TTS failures */
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        const withErr: HistoryItem[] = [
          ...transcriptRef.current,
          {
            role: "agent",
            text: "Sorry — I'm having trouble right now. Please try again in a moment.",
          },
        ];
        transcriptRef.current = withErr;
        setTranscript(withErr);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [pushCustomerNotices],
  );

  const startCall = async () => {
    setInCall(true);
    transcriptRef.current = [];
    setTranscript([]);
    setNotices([]);
    setDebugTurns([]);
    setError(null);
    setInput("");
    await runTurn("Hello", []);
  };

  const endCall = () => {
    stopListening();
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setInCall(false);
    setListening(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !inCall) return;
    const text = input;
    setInput("");
    void runTurn(text);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const toggleListen = () => {
    if (!speechSupported || !inCall) return;
    if (listening) {
      stopListening();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += piece;
        else setInput(piece);
      }
      if (finalText.trim()) {
        setInput("");
        void runTurn(finalText.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <section className="flex min-h-[72vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-xl shadow-black/40">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500/90">
              Cyberfield Support
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">
              {inCall ? "You're connected" : "Ready when you are"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                inCall
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "bg-zinc-600"
              }`}
              aria-hidden
            />
            <span className="text-sm text-zinc-400">
              {inCall ? "In conversation" : "Offline"}
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {!inCall && (
            <div className="m-auto max-w-sm text-center text-zinc-400">
              <p className="mb-3 text-base text-zinc-200">
                How can we help today?
              </p>
              <p className="text-sm leading-relaxed">
                Start a conversation, then ask about hours, shipping, refunds,
                or request a specialist. You can type or use the microphone.
              </p>
            </div>
          )}

          {transcript.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-amber-500/15 text-amber-50 ring-1 ring-amber-500/30"
                  : "mr-auto bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800"
              }`}
            >
              <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                {m.role === "user" ? "You" : "Support"}
              </p>
              {m.text}
            </div>
          ))}

          {notices.map((n) => (
            <div
              key={n.id}
              className="mr-auto max-w-[92%] rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-sm leading-relaxed text-sky-100"
              role="status"
            >
              {n.text}
            </div>
          ))}

          {busy && (
            <p className="animate-pulse text-xs text-zinc-500">
              Connecting you…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="border-t border-red-900/50 bg-red-950/40 px-5 py-2 text-sm text-red-300">
            We couldn&apos;t send that just now. Please try again.
          </p>
        )}

        <div className="border-t border-zinc-800 px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {!inCall ? (
              <button
                type="button"
                onClick={() => void startCall()}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-md shadow-amber-500/15 transition hover:bg-amber-400"
              >
                Start conversation
              </button>
            ) : (
              <button
                type="button"
                onClick={endCall}
                className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-700 transition hover:bg-zinc-700"
              >
                End conversation
              </button>
            )}
            <button
              type="button"
              disabled={!inCall || !speechSupported}
              onClick={toggleListen}
              title={
                speechSupported
                  ? "Speak your message"
                  : "Microphone not available in this browser"
              }
              className={`rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-red-500/20 text-red-200 ring-red-500/40"
                  : "bg-zinc-900 text-zinc-300 ring-zinc-700 hover:bg-zinc-800"
              }`}
            >
              {listening ? "Listening…" : "Microphone"}
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!inCall || busy}
              placeholder={
                inCall ? "Type your message…" : "Start a conversation to chat"
              }
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50 disabled:opacity-50"
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={!inCall || busy || !input.trim()}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40"
            >
              Send
            </button>
          </form>

          <p className="mt-3 text-center text-[11px] text-zinc-600">
            Mon–Fri · 9am–6pm IST · Outside hours, leave a message and we&apos;ll
            follow up
          </p>
        </div>
      </section>

      {SHOW_DEBUG && (
        <details
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500"
          open={debugOpen}
          onToggle={(e) => setDebugOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer select-none font-medium text-zinc-400">
            Dev details
          </summary>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {debugTurns.length === 0 && (
              <li>No turns yet.</li>
            )}
            {debugTurns.map((d) => (
              <li
                key={d.id}
                className="rounded-lg bg-zinc-900/80 p-2 font-mono text-[11px] text-zinc-400 ring-1 ring-zinc-800"
              >
                <div>
                  intent={d.decision.intent} path={d.decision.path} conf=
                  {(d.decision.confidence * 100).toFixed(0)}% escalate=
                  {String(d.decision.escalate)}
                  {d.decision.scriptId ? ` script=${d.decision.scriptId}` : ""}
                </div>
                {d.decision.actions?.length ? (
                  <div className="mt-1 text-zinc-500">
                    actions:{" "}
                    {d.decision.actions.map((a) => a.type).join(", ")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
