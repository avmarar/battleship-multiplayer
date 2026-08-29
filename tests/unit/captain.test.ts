import { describe, expect, it } from "vitest";
import { assertTeamCaptain, isTeamCaptain } from "@/lib/games/captain";
import type { GameDocument } from "@/lib/games/types";

const game = {
  teams: {
    ALPHA: { captainId: "alpha-uid", memberIds: ["alpha-uid", "crew-uid"] },
    BETA: { captainId: "beta-uid", memberIds: ["beta-uid"] },
  },
} as GameDocument;

describe("team captain lock (PLACE-1)", () => {
  it("recognizes only the game team captain", () => {
    expect(isTeamCaptain(game, "ALPHA", "alpha-uid")).toBe(true);
    expect(isTeamCaptain(game, "ALPHA", "crew-uid")).toBe(false);
    expect(isTeamCaptain(game, "BETA", "alpha-uid")).toBe(false);
  });

  it("throws when crew tries to lock", () => {
    expect(() => assertTeamCaptain(game, "ALPHA", "crew-uid")).toThrow(
      /only the team captain/i
    );
  });
});
