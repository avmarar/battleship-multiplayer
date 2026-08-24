import { BattleWorkspace } from "@/components/battle/BattleWorkspace";
import { CommandShell } from "@/components/layout/CommandShell";
import { HudPanel } from "@/components/ui/HudPanel";
import Link from "next/link";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>;
}) {
  const params = await searchParams;
  const gameId = params.gameId;

  if (!gameId) {
    return (
      <CommandShell variant="battle">
        <HudPanel className="space-y-4 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Battle
          </p>
          <h1 className="text-3xl font-semibold uppercase tracking-[0.04em]">
            Fire Control
          </h1>
          <p className="max-w-xl text-white/70">
            Open a match from placement after both fleets lock, or pass{" "}
            <code className="text-cyan-100">?gameId=</code>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/placement?quickPlay=1"
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-hud)] bg-[#00CED1] px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#041218] transition hover:brightness-110 active:scale-90"
            >
              Quick Play
            </Link>
            <Link
              href="/lobby"
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-cyan-100"
            >
              Open lobby →
            </Link>
          </div>
        </HudPanel>
      </CommandShell>
    );
  }

  return (
    <CommandShell variant="battle">
      <BattleWorkspace gameId={gameId} />
    </CommandShell>
  );
}
