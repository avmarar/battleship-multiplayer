export const FLEET = [
  { type: "CARRIER", name: "Carrier", size: 5 },
  { type: "BATTLESHIP", name: "Battleship", size: 4 },
  { type: "CRUISER", name: "Cruiser", size: 3 },
  { type: "SUBMARINE", name: "Submarine", size: 3 },
  { type: "DESTROYER", name: "Destroyer", size: 2 },
] as const;

export type ShipType = (typeof FLEET)[number]["type"];
export type Orientation = "HORIZONTAL" | "VERTICAL";

export function fleetEntry(type: ShipType) {
  const entry = FLEET.find((ship) => ship.type === type);
  if (!entry) {
    throw new Error(`Unknown ship type: ${type}`);
  }
  return entry;
}
