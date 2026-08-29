import { describe, expect, it } from "vitest";
import { guestNickname } from "@/lib/profile/nickname";

describe("guest nicknames (FR 1.3)", () => {
  it("builds a Guest-XXXX call sign from the UID", () => {
    expect(guestNickname("abcd1234xyz")).toBe("Guest-ABCD");
  });
});
