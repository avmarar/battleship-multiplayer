import { describe, expect, it } from "vitest";
import {
  activeShooterId,
  assertLegalBattleShot,
  buildTurnOrder,
  resolveShot,
} from "@/lib/games/combat";
import type { GameDocument } from "@/lib/games/types";
import type { LockedShipPayload } from "@/lib/grid/placement";

const baseGame = {
  status: "BATTLE",
  memberIds: ["a", "b"],
  teams: {
    ALPHA: { captainId: "a", memberIds: ["a"] },
    BETA: { captainId: "b", memberIds: ["b"] },
  },
  placement: {
    ALPHA: { isLocked: true },
    BETA: { isLocked: true },
  },
  createdAt: {} as GameDocument["createdAt"],
  turnOrder: ["a", "b"],
  currentTurnIndex: 0,
} satisfies GameDocument;

describe("combat helpers", () => {
  it("builds alternating turn order", () => {
    expect(
      buildTurnOrder({
        ...baseGame,
        teams: {
          ALPHA: { captainId: "a1", memberIds: ["a1", "a2"] },
          BETA: { captainId: "b1", memberIds: ["b1"] },
        },
      })
    ).toEqual(["a1", "b1", "a2"]);
  });

  it("resolves hit sunk and fleet destruction", () => {
    const ships: LockedShipPayload[] = [
      {
        type: "DESTROYER",
        size: 2,
        hits: 1,
        coordinates: ["A1", "A2"],
      },
    ];
    const sunk = resolveShot(ships, "A2");
    expect(sunk.outcome).toBe("SUNK");
    expect(sunk.fleetSunk).toBe(true);
    expect(resolveShot(ships, "B1").outcome).toBe("MISS");
  });

  it("enforces turn and duplicate shots", () => {
    expect(activeShooterId(baseGame)).toBe("a");
    expect(() =>
      assertLegalBattleShot(baseGame, "b", "BETA", "A1", [])
    ).toThrow(/not your turn/i);
    expect(() =>
      assertLegalBattleShot(baseGame, "a", "ALPHA", "A1", ["A1"])
    ).toThrow(/already fired/i);
    expect(assertLegalBattleShot(baseGame, "a", "ALPHA", "B2", [])).toBe("B2");
  });
});
