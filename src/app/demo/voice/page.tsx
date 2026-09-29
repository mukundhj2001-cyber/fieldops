import VoiceDemo from "@/components/VoiceDemo";
import Link from "next/link";

export const metadata = {
  title: "Voice Demo · Cyberfield Support",
  description: "FieldOps hybrid Jev + script + RAG voice agent demo",
};

export default function VoiceDemoPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_55%)]" />
      <header className="relative z-10 border-b border-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 font-bold text-black">
              CF
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-100 group-hover:text-amber-400">
                Cyberfield Support
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                FieldOps Voice Agent
              </p>
            </div>
          </Link>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Mock Jev · scripts · keyword RAG
          </p>
        </div>
      </header>
      <main className="relative z-10 px-4 py-8 sm:px-6">
        <VoiceDemo />
      </main>
    </div>
  );
}
