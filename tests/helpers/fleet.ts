import type { GridCoordinate } from "@/lib/grid/coordinates";
import { FLEET } from "@/lib/grid/fleet";
import { buildPlacedShip, type PlacedShip } from "@/lib/grid/placement";

const ORIGINS = ["A1", "A2", "A3", "A4", "A5"] as const;

export function completeHorizontalFleet(): PlacedShip[] {
  const ships: PlacedShip[] = [];

  for (const [index, entry] of FLEET.entries()) {
    const placed = buildPlacedShip(
      entry.type,
      ORIGINS[index] as GridCoordinate,
      "HORIZONTAL",
      ships
    );
    if (!placed) {
      throw new Error(`Unable to place ${entry.type}`);
    }
    ships.push(placed);
  }

  return ships;
}
