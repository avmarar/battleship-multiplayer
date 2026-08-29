import { describe, expect, it } from "vitest";
import { buildMatchGamePayload } from "@/lib/games/startMatchGame";
import type { MatchDocument, MatchTeamDocument } from "@/lib/matches/types";

function team(
  teamId: "ALPHA" | "BETA",
  captainId: string,
  memberIds: string[]
): MatchTeamDocument {
  return {
    teamId,
    captainId,
    memberIds,
    members: Object.fromEntries(
      memberIds.map((id) => [
        id,
        {
          userId: id,
          nickname: id,
          role: id === captainId ? "CAPTAIN" : "CREW",
          isReady: true,
        },
      ])
    ),
    isLocked: false,
  };
}

describe("buildMatchGamePayload", () => {
  it("maps match teams into game roster and stamps lobbyId", () => {
    const match: MatchDocument = {
      mode: "MULTIPLAYER",
      matchCode: "MATCH1",
      captainIdAlpha: "alpha-cap",
      captainIdBeta: "beta-cap",
      status: "LOBBY",
      memberIds: ["alpha-cap", "beta-cap", "alpha-crew"],
      maxMembersPerTeam: 4,
      createdAt: {} as MatchDocument["createdAt"],
    };
    const payload = buildMatchGamePayload(
      "match-1",
      match,
      team("ALPHA", "alpha-cap", ["alpha-cap", "alpha-crew"]),
      team("BETA", "beta-cap", ["beta-cap"])
    );

    expect(payload.status).toBe("PLACEMENT");
    expect(payload.lobbyId).toBe("match-1");
    expect(payload.teams.ALPHA).toEqual({
      captainId: "alpha-cap",
      memberIds: ["alpha-cap", "alpha-crew"],
    });
    expect(payload.teams.BETA).toEqual({
      captainId: "beta-cap",
      memberIds: ["beta-cap"],
    });
  });

  it("rejects matches without a Beta captain", () => {
    expect(() =>
      buildMatchGamePayload(
        "match-1",
        {
          mode: "1v1",
          matchCode: "MATCH1",
          captainIdAlpha: "alpha-cap",
          status: "LOBBY",
          memberIds: ["alpha-cap"],
          maxMembersPerTeam: 1,
          createdAt: {} as MatchDocument["createdAt"],
        },
        team("ALPHA", "alpha-cap", ["alpha-cap"]),
        team("BETA", "", [])
      )
    ).toThrow(/Beta captain/i);
  });
});
