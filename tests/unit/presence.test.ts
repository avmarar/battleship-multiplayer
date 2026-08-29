import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { electLongestTenured } from "@/lib/matches/handover";
import {
  canHandoverCaptain,
  canSkipDisconnected,
  skipCountdownMs,
} from "@/lib/presence/stale";
import type { MatchMember } from "@/lib/matches/types";

describe("presence staleness (RES-1 / TURN-6 / CAP-5)", () => {
  it("skips a shooter only after 30s of silence", () => {
    const now = 1_000_000;
    const fresh = { lastSeenAt: Timestamp.fromMillis(now - 5_000) };
    const stale = { lastSeenAt: Timestamp.fromMillis(now - 31_000) };
    expect(canSkipDisconnected(fresh, now)).toBe(false);
    expect(canSkipDisconnected(stale, now)).toBe(true);
    expect(canSkipDisconnected(null, now)).toBe(false);
    expect(skipCountdownMs(stale.lastSeenAt, now)).toBe(0);
  });

  it("hands over a captain after 60s", () => {
    const now = 2_000_000;
    expect(
      canHandoverCaptain(
        { lastSeenAt: Timestamp.fromMillis(now - 59_000) },
        now
      )
    ).toBe(false);
    expect(
      canHandoverCaptain(
        { lastSeenAt: Timestamp.fromMillis(now - 61_000) },
        now
      )
    ).toBe(true);
  });

  it("elects the longest-tenured remaining member", () => {
    const members: Record<string, MatchMember> = {
      late: {
        userId: "late",
        nickname: "Late",
        role: "CREW",
        joinedAt: Timestamp.fromMillis(200),
      },
      early: {
        userId: "early",
        nickname: "Early",
        role: "CREW",
        joinedAt: Timestamp.fromMillis(50),
      },
      captain: {
        userId: "captain",
        nickname: "Cap",
        role: "CAPTAIN",
        joinedAt: Timestamp.fromMillis(1),
      },
    };
    expect(electLongestTenured(members, "captain")).toBe("early");
  });
});
