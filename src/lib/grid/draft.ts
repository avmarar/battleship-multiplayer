import { indicesFromCoordinate, type GridCoordinate } from "./coordinates";
import type { LockedShipPayload, PlacedShip } from "./placement";

export function fromLockedPayload(ships: LockedShipPayload[]): PlacedShip[] {
  return ships.map((ship) => {
    const origin = ship.coordinates[0] as GridCoordinate;
    const next = ship.coordinates[1];
    const start = indicesFromCoordinate(origin);
    const follow = next ? indicesFromCoordinate(next) : null;
    const orientation =
      follow && start && follow.col !== start.col ? "HORIZONTAL" : "VERTICAL";
    return {
      id: ship.type,
      type: ship.type,
      size: ship.size,
      origin,
      orientation,
      coordinates: [...ship.coordinates] as GridCoordinate[],
    };
  });
}

export function draftSignature(ships: PlacedShip[]) {
  return ships
    .map((ship) => `${ship.type}:${ship.coordinates.join(",")}`)
    .sort()
    .join("|");
}
