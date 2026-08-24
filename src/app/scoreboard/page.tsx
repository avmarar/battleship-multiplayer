import { CommandShell } from "@/components/layout/CommandShell";
import { ScoreboardWorkspace } from "@/components/scoreboard/ScoreboardWorkspace";

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>;
}) {
  const params = await searchParams;

  return (
    <CommandShell variant="scoreboard" showSonar={false}>
      <ScoreboardWorkspace gameId={params.gameId} />
    </CommandShell>
  );
}
