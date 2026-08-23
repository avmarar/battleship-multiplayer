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
import { joinQuickPlay } from "@/lib/games/matchmaking";

const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");

describe("Quick Play pairing (MM-1.3)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "battleship-qa-matchmaking",
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

  it("pairs two concurrent clients into a single game", async () => {
    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    const bob = testEnv.authenticatedContext("bob-uid").firestore();

    const [aliceResult, bobResult] = await Promise.all([
      joinQuickPlay(alice, "alice-uid"),
      joinQuickPlay(bob, "bob-uid"),
    ]);

    const statuses = [aliceResult.status, bobResult.status].sort();
    expect(statuses).toEqual(["matched", "waiting"]);

    const matched =
      aliceResult.status === "matched"
        ? aliceResult
        : bobResult.status === "matched"
          ? bobResult
          : null;
    expect(matched?.gameId).toMatch(/\S+/);

    const games = await listGames(testEnv);
    expect(games).toHaveLength(1);
    expect(games[0]?.memberIds.sort()).toEqual(["alice-uid", "bob-uid"]);
    expect(games[0]?.id).toBe(matched?.gameId);
    expect(await teamExists(testEnv, games[0]!.id, "ALPHA")).toBe(true);
    expect(await teamExists(testEnv, games[0]!.id, "BETA")).toBe(true);
  });

  it("lets a second player join the waiting slot instead of opening another game", async () => {
    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    const bob = testEnv.authenticatedContext("bob-uid").firestore();

    const waiting = await joinQuickPlay(alice, "alice-uid");
    expect(waiting.status).toBe("waiting");

    const matched = await joinQuickPlay(bob, "bob-uid");
    expect(matched.status).toBe("matched");

    const games = await listGames(testEnv);
    expect(games).toHaveLength(1);
    expect(games[0]?.memberIds.sort()).toEqual(["alice-uid", "bob-uid"]);
    expect(await teamExists(testEnv, games[0]!.id, "ALPHA")).toBe(true);
    expect(await teamExists(testEnv, games[0]!.id, "BETA")).toBe(true);
  });
});

async function listGames(testEnv: RulesTestEnvironment) {
  let games: { id: string; memberIds: string[] }[] = [];
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context.firestore().collection("games").get();
    games = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      memberIds: (docSnapshot.data().memberIds as string[]) ?? [],
    }));
  });
  return games;
}

async function teamExists(
  testEnv: RulesTestEnvironment,
  gameId: string,
  teamId: "ALPHA" | "BETA"
) {
  let exists = false;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await context
      .firestore()
      .doc(`games/${gameId}/teams/${teamId}`)
      .get();
    exists = snapshot.exists;
  });
  return exists;
}
