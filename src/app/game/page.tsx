import { BattleWorkspace } from "@/components/battle/BattleWorkspace";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>;
}) {
  const params = await searchParams;
  const gameId = params.gameId;

  if (!gameId) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
        <main className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-3xl font-semibold">Battle</h1>
          <p className="text-white/70">
            Open a match from placement after both fleets lock, or pass{" "}
            <code className="text-cyan-100">?gameId=</code>.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-10 text-white">
      <main className="mx-auto w-full max-w-5xl">
        <BattleWorkspace gameId={gameId} />
      </main>
    </div>
  );
}
