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
import { skipDisconnectedTurn } from "@/lib/games/skipTurn";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");
const GAME_ID = "game-skip";

describe("skip disconnected shooter (TURN-6)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-skip",
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
    await seedBattle(testEnv);
  });

  it("advances the turn when the shooter has been silent for 30s", async () => {
    await seedPresence(testEnv, "alpha-uid", Date.now() - 45_000);
    const beta = testEnv.authenticatedContext("beta-uid").firestore();
    const result = await skipDisconnectedTurn(beta, GAME_ID, "beta-uid");
    expect(result.skipped).toBe("alpha-uid");
    expect(result.currentTurnIndex).toBe(1);

    const game = await readGame(testEnv);
    expect(game.currentTurnIndex).toBe(1);
    expect(game.status).toBe("BATTLE");
  });

  it("rejects a skip while the shooter is still fresh", async () => {
    await seedPresence(testEnv, "alpha-uid", Date.now());
    const beta = testEnv.authenticatedContext("beta-uid").firestore();
    await expect(
      skipDisconnectedTurn(beta, GAME_ID, "beta-uid")
    ).rejects.toThrow(/still connected/i);
  });
});

async function seedBattle(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`games/${GAME_ID}`).set({
      status: "BATTLE",
      memberIds: ["alpha-uid", "beta-uid"],
      teams: {
        ALPHA: { captainId: "alpha-uid", memberIds: ["alpha-uid"] },
        BETA: { captainId: "beta-uid", memberIds: ["beta-uid"] },
      },
      placement: {
        ALPHA: { isLocked: true },
        BETA: { isLocked: true },
      },
      createdAt: Timestamp.now(),
      turnOrder: ["alpha-uid", "beta-uid"],
      currentTurnIndex: 0,
    });
    await firestore.doc(`games/${GAME_ID}/teams/ALPHA`).set({
      teamId: "ALPHA",
      memberIds: ["alpha-uid"],
      ships: [],
      isLocked: true,
      shotsFired: [],
    });
    await firestore.doc(`games/${GAME_ID}/teams/BETA`).set({
      teamId: "BETA",
      memberIds: ["beta-uid"],
      ships: [],
      isLocked: true,
      shotsFired: [],
    });
  });
}

async function seedPresence(
  testEnv: RulesTestEnvironment,
  uid: string,
  lastSeenMs: number
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`presence/${uid}`).set({
      uid,
      isConnected: false,
      lastSeenAt: Timestamp.fromMillis(lastSeenMs),
      gameId: GAME_ID,
      matchId: null,
    });
  });
}

async function readGame(testEnv: RulesTestEnvironment) {
  let data: { status: string; currentTurnIndex: number } | undefined;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context.firestore().doc(`games/${GAME_ID}`).get();
    data = snapshot.data() as typeof data;
  });
  if (!data) {
    throw new Error("Game missing");
  }
  return data;
}
