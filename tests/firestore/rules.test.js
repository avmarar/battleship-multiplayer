/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { Timestamp } = require("firebase/firestore");

const PROJECT_ID = "battleship-multiplayer";
const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");

function lobbyFixture(overrides = {}) {
  return {
    inviteCode: "ABC123",
    captainId: "captain-uid",
    status: "LOBBY",
    memberIds: ["captain-uid"],
    members: {
      "captain-uid": {
        userId: "captain-uid",
        nickname: "Captain",
        role: "CAPTAIN",
      },
    },
    createdAt: Timestamp.fromDate(new Date("2024-01-01T00:00:00Z")),
    isLocked: false,
    maxMembers: 4,
    ...overrides,
  };
}

function joinRequestFixture(overrides = {}) {
  return {
    lobbyId: "lobby-alpha",
    userId: "requester-uid",
    requestedTeam: "ALPHA",
    createdAt: Timestamp.fromDate(new Date("2024-01-01T00:01:00Z")),
    status: "PENDING",
    nickname: "New Player",
    inviteCode: "INVITE",
    ...overrides,
  };
}

async function seedLobby(testEnv, lobbyId, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`lobbies/${lobbyId}`).set(data);
  });
}

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
    },
  });

  try {
    await shouldBlockUnauthenticatedLobbyReads(testEnv);
    await shouldEnforceCaptainOnlyLobbyUpdates(testEnv);
    await shouldEnforceJoinRequestOwnershipRules(testEnv);
    await shouldBlockJoinRequestsWhenLocked(testEnv);
    console.log("Firestore security rules tests passed");
  } finally {
    await testEnv.cleanup();
  }
}

async function shouldBlockUnauthenticatedLobbyReads(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture());

  const unauthContext = testEnv.unauthenticatedContext();
  const authedContext = testEnv.authenticatedContext("member-uid");

  await assertFails(unauthContext.firestore().doc("lobbies/lobby-alpha").get());
  await assertSucceeds(
    authedContext.firestore().doc("lobbies/lobby-alpha").get()
  );
}

async function shouldEnforceCaptainOnlyLobbyUpdates(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture());

  const captain = testEnv.authenticatedContext("captain-uid");
  const member = testEnv.authenticatedContext("member-uid");
  const outsider = testEnv.authenticatedContext("random-uid");

  await assertSucceeds(
    captain.firestore()
      .doc("lobbies/lobby-alpha")
      .update({ status: "PLACEMENT" })
  );

  await assertFails(
    member
      .firestore()
      .doc("lobbies/lobby-alpha")
      .update({ status: "PLACEMENT" })
  );

  await assertFails(
    outsider
      .firestore()
      .doc("lobbies/lobby-alpha")
      .update({ status: "PLACEMENT" })
  );
}

async function shouldEnforceJoinRequestOwnershipRules(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture());

  const captain = testEnv.authenticatedContext("captain-uid");
  const requester = testEnv.authenticatedContext("requester-uid");
  const otherUser = testEnv.authenticatedContext("other-uid");
  const unauth = testEnv.unauthenticatedContext();

  await assertFails(
    unauth
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .set(joinRequestFixture())
  );

  await assertFails(
    requester
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/not-owner")
      .set(joinRequestFixture({ lobbyId: "lobby-alpha" }))
  );

  await assertSucceeds(
    requester
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .set(joinRequestFixture())
  );

  await assertFails(
    otherUser
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .update({ status: "APPROVED" })
  );

  await assertSucceeds(
    captain
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .update({ status: "APPROVED" })
  );

  await assertFails(
    otherUser
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .get()
  );

  await assertSucceeds(
    requester
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .get()
  );
}

async function shouldBlockJoinRequestsWhenLocked(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture({ isLocked: true }));

  const requester = testEnv.authenticatedContext("requester-uid");

  await assertFails(
    requester
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/requester-uid")
      .set(joinRequestFixture())
  );
}

run().catch((err) => {
  console.error("Firestore rules tests failed", err);
  process.exit(1);
});
