import { describe, expect, it } from "vitest";
import {
  buildPlacedShip,
  canPlace,
  isFleetComplete,
  projectShip,
  rotateShip,
} from "@/lib/grid/placement";
import { completeHorizontalFleet } from "../helpers/fleet";

describe("placement validation (GP-3)", () => {
  it("projects a ship within bounds and rejects overflow", () => {
    expect(projectShip("A1", "HORIZONTAL", 5)).toEqual([
      "A1",
      "B1",
      "C1",
      "D1",
      "E1",
    ]);
    expect(projectShip("H1", "HORIZONTAL", 5)).toBeNull();
    expect(projectShip("A9", "VERTICAL", 3)).toBeNull();
  });

  it("rejects overlapping ships", () => {
    const carrier = buildPlacedShip("CARRIER", "A1", "HORIZONTAL", []);
    expect(carrier).not.toBeNull();
    expect(canPlace([carrier!], ["C1", "C2", "C3"])).toBe(false);
    expect(buildPlacedShip("CRUISER", "C1", "VERTICAL", [carrier!])).toBeNull();
  });

  it("rotates a ship when the new footprint is free", () => {
    const destroyer = buildPlacedShip("DESTROYER", "A1", "HORIZONTAL", []);
    expect(destroyer).not.toBeNull();
    const rotated = rotateShip(destroyer!, [destroyer!]);
    expect(rotated?.orientation).toBe("VERTICAL");
    expect(rotated?.coordinates).toEqual(["A1", "A2"]);
  });

  it("requires the full five-ship fleet before lock", () => {
    expect(isFleetComplete([])).toBe(false);
    expect(isFleetComplete(completeHorizontalFleet().slice(0, 4))).toBe(false);
    expect(isFleetComplete(completeHorizontalFleet())).toBe(true);
  });
});
