import { describe, expect, it } from "vitest";
import { teamForInviteCode } from "@/lib/lobbies/utils";

describe("teamForInviteCode", () => {
  const lobby = { inviteCode: "ALPHA1", inviteCodeBeta: "BETA99" };

  it("maps the Alpha code to ALPHA and the Beta code to BETA", () => {
    expect(teamForInviteCode(lobby, "alpha1")).toBe("ALPHA");
    expect(teamForInviteCode(lobby, "BETA99")).toBe("BETA");
  });

  it("returns null for an unknown code", () => {
    expect(teamForInviteCode(lobby, "XXXXXX")).toBeNull();
  });

  it("treats a missing Beta code as Alpha-only", () => {
    expect(teamForInviteCode({ inviteCode: "ALPHA1" }, "ALPHA1")).toBe("ALPHA");
    expect(teamForInviteCode({ inviteCode: "ALPHA1" }, "BETA99")).toBeNull();
  });
});
