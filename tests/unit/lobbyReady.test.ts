import { describe, expect, it } from "vitest";
import {
  allMembersReady,
  countReadyMembers,
  isMemberReady,
} from "@/lib/lobbies/ready";
import type { LobbyMember } from "@/lib/lobbies/types";

function member(overrides: Partial<LobbyMember> = {}): LobbyMember {
  return {
    userId: "uid",
    nickname: "Crew",
    role: "CREW",
    isReady: false,
    ...overrides,
  };
}

describe("lobby ready helpers", () => {
  it("treats missing isReady as not ready", () => {
    expect(isMemberReady(member({ isReady: undefined }))).toBe(false);
  });

  it("counts ready members and requires everyone before advancing", () => {
    const roster = [
      member({ userId: "a", isReady: true }),
      member({ userId: "b", isReady: false }),
    ];

    expect(countReadyMembers(roster)).toEqual({ ready: 1, total: 2 });
    expect(allMembersReady(roster)).toBe(false);
    expect(
      allMembersReady([
        member({ userId: "a", isReady: true }),
        member({ userId: "b", role: "CAPTAIN", isReady: true }),
      ])
    ).toBe(true);
    expect(allMembersReady([])).toBe(false);
  });
});
