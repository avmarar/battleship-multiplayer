import Link from "next/link";

export default function ScoreboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-white/5 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Scoreboard · Stub</p>
        <h1 className="text-3xl font-semibold">Match Insights & Leaderboards</h1>
        <p className="text-white/70">
          Leaderboard persistence is scheduled for later sprints. This workspace will eventually show
          per-match summaries, W/L deltas, and telemetry. For now it is a simple placeholder.
        </p>
        <Link href="/" className="text-sm font-semibold text-cyan-100">← Back to Hub</Link>
      </main>
    </div>
  );
}
