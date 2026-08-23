import { PlacementWorkspace } from "@/components/placement/PlacementWorkspace";

export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string; quickPlay?: string }>;
}) {
  const params = await searchParams;

  return (
    <PlacementWorkspace
      autoQuickPlay={params.quickPlay === "1"}
      initialGameId={params.gameId ?? null}
    />
  );
}
