import { describe, expect, it } from "vitest";
import {
  bothCaptainsPresent,
  bothCaptainsReady,
  buildApprovalMember,
  canManageJoinTeam,
  canStartPlacement,
  filterJoinRequestsForCaptain,
  lobbyPatchForApproval,
  roleForApprovedJoin,
} from "@/lib/lobbies/captains";
import type { LobbyDocument, LobbyJoinRequest, LobbyMember } from "@/lib/lobbies/types";

function lobby(
  overrides: Partial<LobbyDocument> = {}
): Pick<
  LobbyDocument,
  | "captainId"
  | "captainIdBeta"
  | "memberIds"
  | "members"
  | "status"
  | "inviteCode"
  | "inviteCodeBeta"
  | "isLocked"
  | "maxMembers"
  | "createdAt"
> {
  return {
    inviteCode: "ALPHA1",
    inviteCodeBeta: "BETA99",
    captainId: "alpha-cap",
    memberIds: ["alpha-cap"],
    members: {
      "alpha-cap": {
        userId: "alpha-cap",
        nickname: "Alpha",
        role: "CAPTAIN",
        team: "ALPHA",
        isReady: false,
      },
    },
    status: "LOBBY",
    isLocked: false,
    maxMembers: 8,
    createdAt: {} as LobbyDocument["createdAt"],
    ...overrides,
  };
}

describe("dual team captains", () => {
  it("lets Alpha approve Alpha joins and the first Beta seat", () => {
    const emptyBeta = lobby();
    expect(canManageJoinTeam(emptyBeta, "alpha-cap", "ALPHA")).toBe(true);
    expect(canManageJoinTeam(emptyBeta, "alpha-cap", "BETA")).toBe(true);
    expect(canManageJoinTeam(emptyBeta, "other", "BETA")).toBe(false);

    const withBeta = lobby({ captainIdBeta: "beta-cap" });
    expect(canManageJoinTeam(withBeta, "alpha-cap", "BETA")).toBe(false);
    expect(canManageJoinTeam(withBeta, "beta-cap", "BETA")).toBe(true);
    expect(canManageJoinTeam(withBeta, "beta-cap", "ALPHA")).toBe(false);
  });

  it("promotes the first Beta joiner to captain", () => {
    expect(roleForApprovedJoin(lobby(), "BETA")).toBe("CAPTAIN");
    expect(roleForApprovedJoin(lobby({ captainIdBeta: "beta-cap" }), "BETA")).toBe(
      "CREW"
    );
    expect(roleForApprovedJoin(lobby(), "ALPHA")).toBe("CREW");
  });

  it("builds an approval patch that stamps captainIdBeta once", () => {
    const request = {
      userId: "beta-1",
      nickname: "Beta One",
      requestedTeam: "BETA" as const,
    };
    expect(buildApprovalMember(lobby(), request).role).toBe("CAPTAIN");
    expect(lobbyPatchForApproval(lobby(), request)).toMatchObject({
      captainIdBeta: "beta-1",
      memberIds: ["alpha-cap", "beta-1"],
    });

    const after = lobby({
      captainIdBeta: "beta-1",
      memberIds: ["alpha-cap", "beta-1"],
    });
    expect(lobbyPatchForApproval(after, {
      userId: "beta-2",
      nickname: "Crew",
      requestedTeam: "BETA",
    }).captainIdBeta).toBeUndefined();
  });

  it("gates start placement on both captains ready and all members", () => {
    const members: LobbyMember[] = [
      {
        userId: "alpha-cap",
        nickname: "A",
        role: "CAPTAIN",
        team: "ALPHA",
        isReady: true,
      },
      {
        userId: "beta-cap",
        nickname: "B",
        role: "CAPTAIN",
        team: "BETA",
        isReady: true,
      },
    ];
    const readyLobby = lobby({
      captainIdBeta: "beta-cap",
      memberIds: ["alpha-cap", "beta-cap"],
      members: {
        "alpha-cap": members[0],
        "beta-cap": members[1],
      },
    });

    expect(bothCaptainsPresent(readyLobby)).toBe(true);
    expect(bothCaptainsReady(readyLobby)).toBe(true);
    expect(canStartPlacement(readyLobby, members)).toBe(true);

    expect(
      canStartPlacement(
        lobby({
          captainIdBeta: "beta-cap",
          memberIds: ["alpha-cap", "beta-cap"],
          members: {
            "alpha-cap": { ...members[0], isReady: true },
            "beta-cap": { ...members[1], isReady: false },
          },
        }),
        [{ ...members[0] }, { ...members[1], isReady: false }]
      )
    ).toBe(false);
  });

  it("filters the join queue to teams the viewer can manage", () => {
    const requests = [
      { requestedTeam: "ALPHA", userId: "a1" },
      { requestedTeam: "BETA", userId: "b1" },
    ] as LobbyJoinRequest[];

    expect(
      filterJoinRequestsForCaptain(lobby(), "alpha-cap", requests).map(
        (r) => r.userId
      )
    ).toEqual(["a1", "b1"]);

    expect(
      filterJoinRequestsForCaptain(
        lobby({ captainIdBeta: "beta-cap" }),
        "beta-cap",
        requests
      ).map((r) => r.userId)
    ).toEqual(["b1"]);
  });
});
