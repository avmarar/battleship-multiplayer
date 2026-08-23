import { readFileSync } from "node:fs";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";
import { sweepStaleGuestSessions } from "@/lib/cleanup/anonymousSessions";
import { PRESENCE_COLLECTION } from "@/lib/presence/types";
import { profileDocPath } from "@/lib/profile/paths";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");

describe("anonymous session cleanup (RES-2)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-cleanup",
      firestore: {
        rules: readFileSync(RULES_PATH, "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("deletes stale guest profile and presence and leaves registered + leaderboard", async () => {
    const stale = Timestamp.fromDate(new Date("2020-01-01T00:00:00Z"));
    const fresh = Timestamp.now();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(profileDocPath("guest-old")).set({
        nickname: "Ghost",
        accountType: "guest",
      });
      await db.doc(`${PRESENCE_COLLECTION}/guest-old`).set({
        uid: "guest-old",
        isConnected: false,
        lastSeenAt: stale,
      });
      await db.doc(profileDocPath("guest-fresh")).set({
        nickname: "Active",
        accountType: "guest",
      });
      await db.doc(`${PRESENCE_COLLECTION}/guest-fresh`).set({
        uid: "guest-fresh",
        isConnected: true,
        lastSeenAt: fresh,
      });
      await db.doc(profileDocPath("registered-old")).set({
        nickname: "Veteran",
        accountType: "registered",
      });
      await db.doc(`${PRESENCE_COLLECTION}/registered-old`).set({
        uid: "registered-old",
        isConnected: false,
        lastSeenAt: stale,
      });
      await db.doc("leaderboard/guest-old").set({
        uid: "guest-old",
        nickname: "Ghost",
        wins: 3,
        losses: 1,
      });
    });

    let result: Awaited<ReturnType<typeof sweepStaleGuestSessions>> | undefined;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      result = await sweepStaleGuestSessions(context.firestore(), {
        maxAgeMs: 60_000,
        now: new Date("2026-08-23T00:00:00Z"),
      });
    });

    expect(result).toEqual({
      deletedProfiles: 1,
      deletedPresence: 1,
      skippedRegistered: 1,
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      expect((await db.doc(profileDocPath("guest-old")).get()).exists).toBe(
        false
      );
      expect(
        (await db.doc(`${PRESENCE_COLLECTION}/guest-old`).get()).exists
      ).toBe(false);
      expect((await db.doc(profileDocPath("guest-fresh")).get()).exists).toBe(
        true
      );
      expect(
        (await db.doc(profileDocPath("registered-old")).get()).exists
      ).toBe(true);
      expect((await db.doc("leaderboard/guest-old").get()).exists).toBe(true);
    });
  });
});
