import { describe, expect, it } from "vitest";
import { draftSignature, fromLockedPayload } from "@/lib/grid/draft";
import { toLockedPayload } from "@/lib/grid/placement";
import { completeHorizontalFleet } from "../helpers/fleet";

describe("shared fleet draft (PLACE-2)", () => {
  it("round-trips locked payloads back to placed ships", () => {
    const fleet = completeHorizontalFleet();
    const restored = fromLockedPayload(toLockedPayload(fleet));
    expect(draftSignature(restored)).toBe(draftSignature(fleet));
    expect(restored.map((ship) => ship.origin)).toEqual(
      fleet.map((ship) => ship.origin)
    );
  });
});
