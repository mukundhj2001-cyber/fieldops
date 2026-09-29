import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.10),_transparent_55%)]" />

      <header className="relative z-10 border-b border-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-black">
              CF
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-100">
                Cyberfield Support
              </p>
              <p className="text-[11px] text-zinc-500">Voice help, anytime</p>
            </div>
          </div>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Mon–Fri · 9am–6pm IST
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col px-6 pb-20 pt-16 sm:pt-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
            How can we help?
          </p>
          <h1 className="mb-5 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Talk to Cyberfield Support
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-zinc-400">
            Get quick answers about hours, orders, refunds, and more — or ask to
            reach a specialist. Start a conversation below; type or use your
            microphone when available.
          </p>

          <div className="mb-12">
            <Link
              href="/demo/voice"
              className="inline-block rounded-full bg-amber-500 px-7 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              Start conversation
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <p className="mb-2 text-sm font-semibold text-zinc-100">
              Instant answers
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">
              Ask about hours, shipping, warranties, and common account
              questions — we respond right away.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <p className="mb-2 text-sm font-semibold text-zinc-100">
              Voice or text
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">
              Type your question, or speak with the mic when your browser
              supports it. We reply in the chat and can read answers aloud.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <p className="mb-2 text-sm font-semibold text-zinc-100">
              Human when you need it
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">
              If something needs a specialist, we&apos;ll let you know a team
              member has been notified — calmly, without the runaround.
            </p>
          </div>
        </div>

        <section
          id="hours"
          className="mt-14 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 px-6 py-5"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-500/90">
            Hours
          </p>
          <p className="text-sm text-zinc-300">
            Monday–Friday, 9:00am–6:00pm IST. Outside those hours, leave a
            message in the conversation and a specialist will follow up.
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-900/80 py-6 text-center text-xs text-zinc-600">
        Cyberfield Support
      </footer>
    </div>
  );
}
