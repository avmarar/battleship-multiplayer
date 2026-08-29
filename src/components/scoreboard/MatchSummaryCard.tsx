import Image from "next/image";
import Link from "next/link";
import type { MatchSummary } from "@/lib/leaderboard/summary";
import { HudPanel } from "@/components/ui/HudPanel";

type MatchSummaryCardProps = {
  summary: MatchSummary;
  showLeaderboardLink?: boolean;
  onClose?: () => void;
};

export function MatchSummaryCard({
  summary,
  showLeaderboardLink = true,
  onClose,
}: MatchSummaryCardProps) {
  const plate = summary.didWin ? "/visual/victory_3d.jpg" : "/visual/defeat_3d.jpg";

  return (
    <HudPanel
      corners
      className="relative overflow-hidden p-0"
      data-testid="match-summary"
      tone={summary.didWin ? "accent" : "danger"}
    >
      {/* 3D Background Artwork */}
      <div className="absolute inset-0">
        <Image
          src={plate}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060c18] via-[#060c18]/85 to-[#060c18]/45" />
      </div>

      <div className="relative space-y-5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-300 font-bold mb-1">
              ENGAGEMENT CONCLUDED · AFTER-ACTION REPORT
            </p>
            <h2
              className={[
                "text-3xl font-black uppercase tracking-[0.08em] sm:text-4xl",
                summary.didWin
                  ? "bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                  : "bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,46,99,0.4)]",
              ].join(" ")}
            >
              {summary.didWin ? "🏆 VICTORY" : "💥 DEFEAT"} — TEAM {summary.myTeam}
            </h2>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close match summary"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/50 text-white/70 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <span className="text-sm font-mono leading-none">✕</span>
            </button>
          )}
        </div>

        {summary.ranked === true && (
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-mono font-bold text-emerald-200 shadow-[0_0_12px_rgba(0,245,160,0.2)]" data-testid="summary-ranked">
            <span>★</span>
            <span>RANKED MATCH — W/L stand recorded for registered commanders.</span>
          </div>
        )}
        {summary.ranked === false && (
          <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/40 px-3.5 py-1.5 text-xs font-mono font-bold text-amber-200" data-testid="summary-unranked">
            <span>ℹ</span>
            <span>UNRANKED — guest session participated; standings not submitted to global leaderboard.</span>
          </div>
        )}

        {/* Tactical Stat Cards */}
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-hud)] border border-cyan-500/20 bg-black/50 p-4 shadow-md backdrop-blur-md">
            <dt className="text-[11px] uppercase tracking-[0.2em] font-mono text-cyan-300">
              SHOTS FIRED
            </dt>
            <dd
              className="mt-1 font-mono text-3xl font-black text-white drop-shadow-md"
              data-testid="summary-shots"
            >
              {summary.shotsFired}
            </dd>
          </div>

          <div className="rounded-[var(--radius-hud)] border border-emerald-500/20 bg-black/50 p-4 shadow-md backdrop-blur-md">
            <dt className="text-[11px] uppercase tracking-[0.2em] font-mono text-emerald-300">
              VESSELS SUNK
            </dt>
            <dd
              className="mt-1 font-mono text-3xl font-black text-emerald-300 drop-shadow-[0_0_10px_rgba(0,245,160,0.4)]"
              data-testid="summary-sunk"
            >
              {summary.shipsSunk}
            </dd>
          </div>

          <div className="rounded-[var(--radius-hud)] border border-rose-500/20 bg-black/50 p-4 shadow-md backdrop-blur-md">
            <dt className="text-[11px] uppercase tracking-[0.2em] font-mono text-rose-300">
              VESSELS LOST
            </dt>
            <dd
              className="mt-1 font-mono text-3xl font-black text-rose-300 drop-shadow-[0_0_10px_rgba(255,46,99,0.4)]"
              data-testid="summary-lost"
            >
              {summary.shipsLost}
            </dd>
          </div>
        </dl>

        {showLeaderboardLink && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/placement?quickPlay=1"
                data-testid="summary-quick-play"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-hud)] bg-gradient-to-r from-[#00CED1] to-[#00F2FE] px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-[0.12em] text-[#041218] shadow-[0_0_20px_rgba(0,242,254,0.4)] transition duration-150 hover:brightness-110 active:scale-95"
              >
                <span>⚡ Instant Quick Play</span>
              </Link>

              <Link
                href="/scoreboard"
                className="inline-flex min-h-[44px] items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300 transition hover:text-white"
                data-testid="open-leaderboard"
              >
                <span>View Global Scoreboard Standings</span>
                <span>→</span>
              </Link>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-mono font-semibold text-white/80 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white transition"
              >
                <span>🔍 Inspect Battlefield</span>
              </button>
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
