import { describe, expect, it } from "vitest";
import { buildLobbyGamePayload } from "@/lib/games/startLobbyGame";

describe("buildLobbyGamePayload", () => {
  it("maps lobby roster into Alpha/Beta team lists and stamps lobbyId", () => {
    const payload = buildLobbyGamePayload({
      id: "lobby-1",
      captainId: "alpha-cap",
      captainIdBeta: "beta-cap",
      memberIds: ["alpha-cap", "beta-cap", "alpha-crew"],
      members: {
        "alpha-cap": {
          userId: "alpha-cap",
          nickname: "A",
          role: "CAPTAIN",
          team: "ALPHA",
        },
        "beta-cap": {
          userId: "beta-cap",
          nickname: "B",
          role: "CAPTAIN",
          team: "BETA",
        },
        "alpha-crew": {
          userId: "alpha-crew",
          nickname: "Crew",
          role: "CREW",
          team: "ALPHA",
        },
      },
      status: "LOBBY",
    });

    expect(payload.status).toBe("PLACEMENT");
    expect(payload.lobbyId).toBe("lobby-1");
    expect(payload.teams.ALPHA).toEqual({
      captainId: "alpha-cap",
      memberIds: ["alpha-cap", "alpha-crew"],
    });
    expect(payload.teams.BETA).toEqual({
      captainId: "beta-cap",
      memberIds: ["beta-cap"],
    });
    expect(payload.memberIds).toEqual(
      expect.arrayContaining(["alpha-cap", "beta-cap", "alpha-crew"])
    );
  });

  it("rejects lobbies without a Beta captain", () => {
    expect(() =>
      buildLobbyGamePayload({
        id: "lobby-1",
        captainId: "alpha-cap",
        memberIds: ["alpha-cap"],
        members: {
          "alpha-cap": {
            userId: "alpha-cap",
            nickname: "A",
            role: "CAPTAIN",
            team: "ALPHA",
          },
        },
        status: "LOBBY",
      })
    ).toThrow(/Beta captain/i);
  });
});
