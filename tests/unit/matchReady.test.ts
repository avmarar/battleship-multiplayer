import { describe, expect, it } from "vitest";
import {
  bothCaptainsSeated,
  canStartMatch,
  isMemberReady,
} from "@/lib/matches/ready";
import type { MatchDocument, MatchTeamDocument } from "@/lib/matches/types";

function team(
  overrides: Partial<MatchTeamDocument> & {
    members: MatchTeamDocument["members"];
  }
): MatchTeamDocument {
  return {
    teamId: "ALPHA",
    captainId: "a",
    memberIds: Object.keys(overrides.members),
    isLocked: false,
    ...overrides,
  };
}

function match(overrides: Partial<MatchDocument> = {}): MatchDocument {
  return {
    mode: "1v1",
    matchCode: "ABC123",
    captainIdAlpha: "alpha",
    captainIdBeta: "beta",
    status: "LOBBY",
    memberIds: ["alpha", "beta"],
    maxMembersPerTeam: 1,
    createdAt: {} as MatchDocument["createdAt"],
    ...overrides,
  };
}

describe("match ready helpers", () => {
  it("detects ready members", () => {
    expect(isMemberReady({ userId: "a", nickname: "A", role: "CAPTAIN", isReady: true })).toBe(true);
    expect(isMemberReady({ userId: "a", nickname: "A", role: "CAPTAIN" })).toBe(false);
  });

  it("requires both captains before start", () => {
    const alpha = team({
      teamId: "ALPHA",
      captainId: "alpha",
      members: {
        alpha: { userId: "alpha", nickname: "A", role: "CAPTAIN", isReady: true },
      },
    });
    const beta = team({
      teamId: "BETA",
      captainId: "beta",
      members: {
        beta: { userId: "beta", nickname: "B", role: "CAPTAIN", isReady: true },
      },
    });

    expect(
      canStartMatch(match({ captainIdBeta: undefined }), alpha, beta)
    ).toBe(false);
    expect(bothCaptainsSeated(match())).toBe(true);
    expect(canStartMatch(match(), alpha, beta)).toBe(true);
  });

  it("blocks start when any member is not ready", () => {
    const alpha = team({
      members: {
        alpha: { userId: "alpha", nickname: "A", role: "CAPTAIN", isReady: true },
      },
    });
    const beta = team({
      teamId: "BETA",
      captainId: "beta",
      members: {
        beta: { userId: "beta", nickname: "B", role: "CAPTAIN", isReady: false },
      },
    });
    expect(canStartMatch(match(), alpha, beta)).toBe(false);
  });
});
