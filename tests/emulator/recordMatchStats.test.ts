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
import { fireShot } from "@/lib/games/fireShot";
import { recordMatchStats } from "@/lib/leaderboard/recordMatchStats";
import { toLockedPayload } from "@/lib/grid/placement";
import { completeHorizontalFleet } from "../helpers/fleet";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");
const GAME_ID = "game-stats";

describe("match stats recording (LB-2)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-stats",
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

  it("increments W/L once when a match is already ended", async () => {
    await seedEndedGame(testEnv);
    const alpha = testEnv.authenticatedContext("alpha-uid").firestore();

    const first = await recordMatchStats(alpha, GAME_ID, "alpha-uid");
    expect(first).toEqual({ recorded: true });

    const second = await recordMatchStats(alpha, GAME_ID, "alpha-uid");
    expect(second).toEqual({ recorded: false, reason: "already-recorded" });

    const rows = await readLeaderboard(testEnv);
    expect(rows["alpha-uid"]).toMatchObject({ wins: 1, losses: 0 });
    expect(rows["beta-uid"]).toMatchObject({ wins: 0, losses: 1 });
  });

  it("records stats from the finishing shot", async () => {
    await seedAlmostOverBattle(testEnv);
    const alpha = testEnv.authenticatedContext("alpha-uid").firestore();
    const result = await fireShot(alpha, GAME_ID, "alpha-uid", "B5");
    expect(result.ended).toBe(true);

    const rows = await readLeaderboard(testEnv);
    expect(rows["alpha-uid"].wins).toBe(1);
    expect(rows["beta-uid"].losses).toBe(1);
  });
});

async function seedEndedGame(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`games/${GAME_ID}`).set({
      status: "ENDED",
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
      winnerTeam: "ALPHA",
    });
    await firestore.doc(`games/${GAME_ID}/teams/ALPHA`).set({
      teamId: "ALPHA",
      memberIds: ["alpha-uid"],
      ships: [],
      isLocked: true,
      shotsFired: ["A1"],
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

async function seedAlmostOverBattle(testEnv: RulesTestEnvironment) {
  const ships = toLockedPayload(completeHorizontalFleet()).map((ship) =>
    ship.type === "DESTROYER"
      ? { ...ship, hits: 1 }
      : { ...ship, hits: ship.size }
  );

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
      ships,
      isLocked: true,
      shotsFired: [],
    });
    await firestore.doc(`games/${GAME_ID}/teams/BETA`).set({
      teamId: "BETA",
      memberIds: ["beta-uid"],
      ships,
      isLocked: true,
      shotsFired: [],
    });
  });
}

async function readLeaderboard(testEnv: RulesTestEnvironment) {
  const rows: Record<string, { wins: number; losses: number }> = {};
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context.firestore().collection("leaderboard").get();
    for (const docSnap of snapshot.docs) {
      rows[docSnap.id] = docSnap.data() as { wins: number; losses: number };
    }
  });
  return rows;
}
