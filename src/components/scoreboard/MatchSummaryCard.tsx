import Link from "next/link";
import type { MatchSummary } from "@/lib/leaderboard/summary";

type MatchSummaryCardProps = {
  summary: MatchSummary;
  showLeaderboardLink?: boolean;
};

export function MatchSummaryCard({
  summary,
  showLeaderboardLink = true,
}: MatchSummaryCardProps) {
  return (
    <section
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
      data-testid="match-summary"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
        Post-match
      </p>
      <h2 className="text-2xl font-semibold text-white">
        {summary.didWin ? "Victory" : "Defeat"} — Team {summary.winnerTeam}
      </h2>
      <p className="text-sm text-white/70">
        You fought on Team {summary.myTeam}.
      </p>
      {summary.ranked === true && (
        <p className="text-sm text-emerald-200" data-testid="summary-ranked">
          Ranked match — W/L recorded for registered commanders.
        </p>
      )}
      {summary.ranked === false && (
        <p className="text-sm text-amber-200" data-testid="summary-unranked">
          Unranked — a guest played, so this session is not on the leaderboard.
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <dt className="text-xs uppercase tracking-[0.2em] text-white/50">
            Shots
          </dt>
          <dd className="text-xl font-semibold text-white" data-testid="summary-shots">
            {summary.shotsFired}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <dt className="text-xs uppercase tracking-[0.2em] text-white/50">
            Sunk
          </dt>
          <dd className="text-xl font-semibold text-white" data-testid="summary-sunk">
            {summary.shipsSunk}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <dt className="text-xs uppercase tracking-[0.2em] text-white/50">
            Lost
          </dt>
          <dd className="text-xl font-semibold text-white" data-testid="summary-lost">
            {summary.shipsLost}
          </dd>
        </div>
      </dl>
      {showLeaderboardLink && (
        <Link
          href="/scoreboard"
          className="inline-flex text-sm font-semibold text-cyan-100"
          data-testid="open-leaderboard"
        >
          Open leaderboard →
        </Link>
      )}
    </section>
  );
}
