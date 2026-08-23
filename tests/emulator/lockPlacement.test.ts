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
import { lockPlacement } from "@/lib/games/lockPlacement";
import { completeHorizontalFleet } from "../helpers/fleet";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");
const GAME_ID = "game-lock-race";

describe("placement lock transactions (QA-3.2)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-lock",
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
    await seedUnlockedGame(testEnv);
  });

  it("lets both teams lock at the same time without losing either write", async () => {
    const fleet = completeHorizontalFleet();
    const alpha = testEnv.authenticatedContext("alpha-uid").firestore();
    const beta = testEnv.authenticatedContext("beta-uid").firestore();

    await Promise.all([
      lockPlacement(alpha, GAME_ID, "ALPHA", fleet),
      lockPlacement(beta, GAME_ID, "BETA", fleet),
    ]);

    const game = await readGame(testEnv);
    expect(game.placement.ALPHA.isLocked).toBe(true);
    expect(game.placement.BETA.isLocked).toBe(true);

    const alphaTeam = await readTeam(testEnv, "ALPHA");
    const betaTeam = await readTeam(testEnv, "BETA");
    expect(alphaTeam.isLocked).toBe(true);
    expect(betaTeam.isLocked).toBe(true);
    expect(alphaTeam.ships).toHaveLength(5);
    expect(betaTeam.ships).toHaveLength(5);
  });

  it("rejects a second lock on the same team", async () => {
    const fleet = completeHorizontalFleet();
    const alpha = testEnv.authenticatedContext("alpha-uid").firestore();

    await lockPlacement(alpha, GAME_ID, "ALPHA", fleet);
    await expect(
      lockPlacement(alpha, GAME_ID, "ALPHA", fleet)
    ).rejects.toThrow(/already locked/i);
  });
});

async function seedUnlockedGame(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`games/${GAME_ID}`).set({
      status: "PLACEMENT",
      memberIds: ["alpha-uid", "beta-uid"],
      teams: {
        ALPHA: { captainId: "alpha-uid", memberIds: ["alpha-uid"] },
        BETA: { captainId: "beta-uid", memberIds: ["beta-uid"] },
      },
      placement: {
        ALPHA: { isLocked: false },
        BETA: { isLocked: false },
      },
      createdAt: Timestamp.now(),
    });
    await firestore.doc(`games/${GAME_ID}/teams/ALPHA`).set({
      teamId: "ALPHA",
      memberIds: ["alpha-uid"],
      ships: [],
      isLocked: false,
      shotsFired: [],
    });
    await firestore.doc(`games/${GAME_ID}/teams/BETA`).set({
      teamId: "BETA",
      memberIds: ["beta-uid"],
      ships: [],
      isLocked: false,
      shotsFired: [],
    });
  });
}

async function readGame(testEnv: RulesTestEnvironment) {
  let data:
    | {
        placement: { ALPHA: { isLocked: boolean }; BETA: { isLocked: boolean } };
      }
    | undefined;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context.firestore().doc(`games/${GAME_ID}`).get();
    data = snapshot.data() as typeof data;
  });
  if (!data) {
    throw new Error("Game document was not found.");
  }
  return data;
}

async function readTeam(testEnv: RulesTestEnvironment, teamId: "ALPHA" | "BETA") {
  let data: { isLocked: boolean; ships: unknown[] } | undefined;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context
      .firestore()
      .doc(`games/${GAME_ID}/teams/${teamId}`)
      .get();
    data = snapshot.data() as typeof data;
  });
  if (!data) {
    throw new Error(`Team ${teamId} was not found.`);
  }
  return data;
}
