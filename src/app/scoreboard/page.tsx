import { ScoreboardWorkspace } from "@/components/scoreboard/ScoreboardWorkspace";

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto w-full max-w-5xl">
        <ScoreboardWorkspace gameId={params.gameId} />
      </main>
    </div>
  );
}
