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
import { PRESENCE_COLLECTION } from "@/lib/presence/types";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");
const SESSION_COUNT = 50;

describe("soft load smoke (NFR-LOAD)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-load",
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

  it("writes 50 presence documents quickly", async () => {
    const started = Date.now();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await Promise.all(
        Array.from({ length: SESSION_COUNT }, (_, index) =>
          db.doc(`${PRESENCE_COLLECTION}/load-${index}`).set({
            uid: `load-${index}`,
            isConnected: true,
            lastSeenAt: Timestamp.now(),
          })
        )
      );
    });

    expect(Date.now() - started).toBeLessThan(10_000);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await context
        .firestore()
        .collection(PRESENCE_COLLECTION)
        .get();
      expect(snapshot.size).toBe(SESSION_COUNT);
    });
  });
});
