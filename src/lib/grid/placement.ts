import {
  coordinateFromIndices,
  GRID_SIZE,
  indicesFromCoordinate,
  type GridCoordinate,
} from "./coordinates";
import { FLEET, fleetEntry, type Orientation, type ShipType } from "./fleet";

export type PlacedShip = {
  id: ShipType;
  type: ShipType;
  size: number;
  origin: GridCoordinate;
  orientation: Orientation;
  coordinates: GridCoordinate[];
};

export type LockedShipPayload = {
  type: ShipType;
  size: number;
  hits: number;
  coordinates: GridCoordinate[];
};

export function toggleOrientation(orientation: Orientation): Orientation {
  return orientation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";
}

export function projectShip(
  origin: GridCoordinate,
  orientation: Orientation,
  size: number
): GridCoordinate[] | null {
  const start = indicesFromCoordinate(origin);
  if (!start) {
    return null;
  }

  const coordinates: GridCoordinate[] = [];
  for (let offset = 0; offset < size; offset += 1) {
    const col =
      orientation === "HORIZONTAL" ? start.col + offset : start.col;
    const row = orientation === "VERTICAL" ? start.row + offset : start.row;
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
      return null;
    }
    coordinates.push(coordinateFromIndices(col, row));
  }

  return coordinates;
}

export function occupancySet(
  ships: PlacedShip[],
  excludeId?: ShipType
): Set<GridCoordinate> {
  const occupied = new Set<GridCoordinate>();
  for (const ship of ships) {
    if (ship.id === excludeId) {
      continue;
    }
    for (const coordinate of ship.coordinates) {
      occupied.add(coordinate);
    }
  }
  return occupied;
}

export function canPlace(
  ships: PlacedShip[],
  coordinates: GridCoordinate[],
  excludeId?: ShipType
): boolean {
  const occupied = occupancySet(ships, excludeId);
  return coordinates.every((coordinate) => !occupied.has(coordinate));
}

export function buildPlacedShip(
  type: ShipType,
  origin: GridCoordinate,
  orientation: Orientation,
  ships: PlacedShip[],
  excludeId?: ShipType
): PlacedShip | null {
  const { size } = fleetEntry(type);
  const coordinates = projectShip(origin, orientation, size);
  if (!coordinates || !canPlace(ships, coordinates, excludeId)) {
    return null;
  }

  return {
    id: type,
    type,
    size,
    origin,
    orientation,
    coordinates,
  };
}

export function rotateShip(
  ship: PlacedShip,
  ships: PlacedShip[]
): PlacedShip | null {
  return buildPlacedShip(
    ship.type,
    ship.origin,
    toggleOrientation(ship.orientation),
    ships,
    ship.id
  );
}

export function shipAtCoordinate(
  ships: PlacedShip[],
  coordinate: GridCoordinate
): PlacedShip | undefined {
  return ships.find((ship) => ship.coordinates.includes(coordinate));
}

export function isFleetComplete(ships: PlacedShip[]): boolean {
  if (ships.length !== FLEET.length) {
    return false;
  }

  return FLEET.every((entry) => {
    const placed = ships.find((ship) => ship.type === entry.type);
    return !!placed && placed.coordinates.length === entry.size;
  });
}

export function toLockedPayload(ships: PlacedShip[]): LockedShipPayload[] {
  return ships.map((ship) => ({
    type: ship.type,
    size: ship.size,
    hits: 0,
    coordinates: ship.coordinates,
  }));
}

export function unplacedTypes(ships: PlacedShip[]): ShipType[] {
  const placed = new Set(ships.map((ship) => ship.type));
  return FLEET.filter((entry) => !placed.has(entry.type)).map(
    (entry) => entry.type
  );
}
