import Link from "next/link";

export default function GamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-white/5 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Game · Stub</p>
        <h1 className="text-3xl font-semibold">Battle Loop Workspace</h1>
        <p className="text-white/70">
          Future iterations will bring turn sequencing, firing validation, and synchronized battle
          UI to this page. Keep an eye on Sprint 3 to see the placement handoff flow land here.
        </p>
        <Link href="/" className="text-sm font-semibold text-cyan-200">← Back to Hub</Link>
      </main>
    </div>
  );
}
