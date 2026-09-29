import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_50%)]" />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
          Cyberfield AI · Portfolio prep
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          FieldOps Voice Agent
        </h1>
        <p className="mb-6 text-lg leading-relaxed text-zinc-400">
          A demo phone/voice support agent for{" "}
          <span className="text-zinc-200">Cyberfield Support</span> — sample client
          for the Cyberfield AI agency. Hybrid stack:{" "}
          <span className="text-amber-400/90">Jev</span> (mock TypeSafe-style
          decisions) + scripted FAQs + naive keyword RAG. Typed turns now; optional
          Web Speech when the browser allows.
        </p>

        <ul className="mb-10 space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <span className="text-amber-500">▸</span>
            Intent routing via swappable <code className="text-zinc-300">mockJev</code>{" "}
            (same interface as real TypeSafe later)
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">▸</span>
            Script path for hours, booking, greetings; RAG for policy-heavy asks
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">▸</span>
            Live Decision log + ticket/CRM Action stubs on escalate / booking
          </li>
        </ul>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo/voice"
            className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Open voice demo
          </Link>
          <a
            href="https://github.com"
            className="pointer-events-none rounded-full px-6 py-3 text-sm font-medium text-zinc-500 ring-1 ring-zinc-800"
            aria-disabled
            title="Local repo only — not pushed"
          >
            Local git · not pushed
          </a>
        </div>

        <p className="mt-12 text-xs text-zinc-600">
          No TypeSafe key required. Set <code className="text-zinc-500">TYPESAFE_API_KEY</code>{" "}
          later and flip <code className="text-zinc-500">JEV_PROVIDER=typesafe</code> — see README.
        </p>
      </main>
    </div>
  );
}
