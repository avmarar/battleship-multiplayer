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
    inviteCodeBeta: "BETA99",
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
    inviteCode: "ABC123",
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
    await shouldAllowMembersToToggleOwnReady(testEnv);
    await shouldBindJoinRequestsToTeamInviteCodes(testEnv);
    await shouldEnforceDualTeamCaptainApprovals(testEnv);
    await shouldProtectMatchmakingAndPlacement(testEnv);
    await shouldEnforceMatchLobbyRules(testEnv);
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

  await assertSucceeds(
    requester
      .firestore()
      .collectionGroup("joinRequests")
      .where("userId", "==", "requester-uid")
      .get()
  );

  await assertFails(
    otherUser
      .firestore()
      .collectionGroup("joinRequests")
      .where("userId", "==", "requester-uid")
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

async function shouldBindJoinRequestsToTeamInviteCodes(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture());

  const captain = testEnv.authenticatedContext("captain-uid");
  const alphaJoiner = testEnv.authenticatedContext("alpha-joiner");
  const betaJoiner = testEnv.authenticatedContext("beta-joiner");

  const missingBetaCode = lobbyFixture({
    inviteCode: "NEW111",
    captainId: "captain-uid",
  });
  delete missingBetaCode.inviteCodeBeta;

  await assertFails(captain.firestore().collection("lobbies").add(missingBetaCode));

  await assertSucceeds(
    captain.firestore().collection("lobbies").add(
      lobbyFixture({
        inviteCode: "NEW111",
        inviteCodeBeta: "NEW222",
        captainId: "captain-uid",
      })
    )
  );

  await assertFails(
    captain.firestore().doc("lobbies/lobby-alpha").update({
      inviteCodeBeta: "XXXXXX",
    })
  );

  await assertFails(
    alphaJoiner
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/alpha-joiner")
      .set(
        joinRequestFixture({
          userId: "alpha-joiner",
          requestedTeam: "BETA",
          inviteCode: "ABC123",
        })
      )
  );

  await assertSucceeds(
    alphaJoiner
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/alpha-joiner")
      .set(
        joinRequestFixture({
          userId: "alpha-joiner",
          requestedTeam: "ALPHA",
          inviteCode: "ABC123",
        })
      )
  );

  await assertSucceeds(
    betaJoiner
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/beta-joiner")
      .set(
        joinRequestFixture({
          userId: "beta-joiner",
          requestedTeam: "BETA",
          inviteCode: "BETA99",
        })
      )
  );
}

async function shouldEnforceDualTeamCaptainApprovals(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(testEnv, "lobby-alpha", lobbyFixture());

  const alphaCaptain = testEnv.authenticatedContext("captain-uid");
  const betaCaptain = testEnv.authenticatedContext("beta-cap");
  const outsider = testEnv.authenticatedContext("outsider-uid");

  await assertSucceeds(
    betaCaptain
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/beta-cap")
      .set(
        joinRequestFixture({
          userId: "beta-cap",
          requestedTeam: "BETA",
          inviteCode: "BETA99",
          nickname: "Beta Cap",
        })
      )
  );

  // Alpha may seat the first Beta captain while captainIdBeta is still unset.
  await assertSucceeds(
    alphaCaptain
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/beta-cap")
      .update({ status: "APPROVED" })
  );
  await assertSucceeds(
    alphaCaptain.firestore().doc("lobbies/lobby-alpha").update({
      memberIds: ["captain-uid", "beta-cap"],
      captainIdBeta: "beta-cap",
      "members.beta-cap": {
        userId: "beta-cap",
        nickname: "Beta Cap",
        role: "CAPTAIN",
        team: "BETA",
        isReady: false,
      },
    })
  );

  await assertSucceeds(
    outsider
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/outsider-uid")
      .set(
        joinRequestFixture({
          userId: "outsider-uid",
          requestedTeam: "BETA",
          inviteCode: "BETA99",
          nickname: "Beta Crew",
        })
      )
  );

  // After Beta captain exists, Alpha cannot decide Beta join requests.
  await assertFails(
    alphaCaptain
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/outsider-uid")
      .update({ status: "APPROVED" })
  );

  await assertSucceeds(
    betaCaptain
      .firestore()
      .doc("lobbies/lobby-alpha/joinRequests/outsider-uid")
      .update({ status: "APPROVED" })
  );

  await assertSucceeds(
    betaCaptain.firestore().doc("lobbies/lobby-alpha").update({
      memberIds: ["captain-uid", "beta-cap", "outsider-uid"],
      "members.outsider-uid": {
        userId: "outsider-uid",
        nickname: "Beta Crew",
        role: "CREW",
        team: "BETA",
        isReady: false,
      },
    })
  );

  // Beta captain cannot change lobby lock/status.
  await assertFails(
    betaCaptain.firestore().doc("lobbies/lobby-alpha").update({
      isLocked: true,
    })
  );
}

async function shouldAllowMembersToToggleOwnReady(testEnv) {
  await testEnv.clearFirestore();
  await seedLobby(
    testEnv,
    "lobby-alpha",
    lobbyFixture({
      memberIds: ["captain-uid", "member-uid"],
      members: {
        "captain-uid": {
          userId: "captain-uid",
          nickname: "Captain",
          role: "CAPTAIN",
          isReady: false,
        },
        "member-uid": {
          userId: "member-uid",
          nickname: "Crew",
          role: "CREW",
          isReady: false,
        },
      },
    })
  );

  const member = testEnv.authenticatedContext("member-uid");
  const outsider = testEnv.authenticatedContext("outsider-uid");

  await assertSucceeds(
    member.firestore().doc("lobbies/lobby-alpha").update({
      "members.member-uid.isReady": true,
    })
  );

  await assertFails(
    member.firestore().doc("lobbies/lobby-alpha").update({
      "members.captain-uid.isReady": true,
    })
  );

  await assertFails(
    member.firestore().doc("lobbies/lobby-alpha").update({
      status: "PLACEMENT",
    })
  );

  await assertFails(
    outsider.firestore().doc("lobbies/lobby-alpha").update({
      "members.member-uid.isReady": false,
    })
  );
}

function gameFixture(overrides = {}) {
  return {
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
    createdAt: Timestamp.fromDate(new Date("2024-01-01T00:00:00Z")),
    ...overrides,
  };
}

function teamFixture(teamId, captainId, overrides = {}) {
  return {
    teamId,
    memberIds: [captainId],
    ships: [],
    isLocked: false,
    shotsFired: [],
    ...overrides,
  };
}

async function seedGame(testEnv, gameId, gameData, alpha, beta) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`games/${gameId}`).set(gameData);
    await firestore.doc(`games/${gameId}/teams/ALPHA`).set(alpha);
    await firestore.doc(`games/${gameId}/teams/BETA`).set(beta);
  });
}

async function shouldProtectMatchmakingAndPlacement(testEnv) {
  await testEnv.clearFirestore();
  await seedGame(
    testEnv,
    "game-1",
    gameFixture(),
    teamFixture("ALPHA", "alpha-uid"),
    teamFixture("BETA", "beta-uid")
  );

  const alpha = testEnv.authenticatedContext("alpha-uid");
  const outsider = testEnv.authenticatedContext("outsider-uid");
  const unauth = testEnv.unauthenticatedContext();

  await assertFails(unauth.firestore().doc("games/game-1").get());
  await assertFails(outsider.firestore().doc("games/game-1").get());
  await assertSucceeds(alpha.firestore().doc("games/game-1").get());
  await assertFails(alpha.firestore().doc("games/game-1/teams/BETA").get());
  await assertSucceeds(alpha.firestore().doc("games/game-1/teams/ALPHA").get());

  await assertSucceeds(
    alpha.firestore().doc("games/game-1/teams/ALPHA").update({
      ships: [
        {
          type: "DESTROYER",
          size: 2,
          hits: 0,
          coordinates: ["A1", "A2"],
        },
      ],
    })
  );

  await assertFails(
    alpha.firestore().doc("games/game-1").update({
      "placement.BETA.isLocked": true,
    })
  );

  await assertSucceeds(
    alpha.firestore().doc("games/game-1").update({
      "placement.ALPHA.isLocked": true,
    })
  );

  await assertSucceeds(
    alpha.firestore().doc("games/game-1/teams/ALPHA").update({
      isLocked: true,
    })
  );

  await assertFails(
    alpha.firestore().doc("games/game-1/teams/ALPHA").update({
      ships: [],
    })
  );

  const slotRef = outsider.firestore().doc("matchmakingSlots/open");
  await assertSucceeds(
    slotRef.set({
      uid: "outsider-uid",
      nickname: "Guest",
      updatedAt: Timestamp.now(),
    })
  );
  await assertSucceeds(
    alpha.firestore().doc("matchmakingSlots/open").update({
      uid: null,
      nickname: null,
      updatedAt: Timestamp.now(),
    })
  );
}

function matchFixture(overrides = {}) {
  return {
    mode: "1v1",
    matchCode: "MATCH1",
    captainIdAlpha: "alpha-uid",
    status: "LOBBY",
    memberIds: ["alpha-uid"],
    maxMembersPerTeam: 1,
    createdAt: Timestamp.fromDate(new Date("2024-01-01T00:00:00Z")),
    ...overrides,
  };
}

function matchTeamFixture(teamId, overrides = {}) {
  const captainId = overrides.captainId ?? (teamId === "ALPHA" ? "alpha-uid" : "");
  const memberIds =
    overrides.memberIds ?? (captainId ? [captainId] : []);
  return {
    teamId,
    captainId,
    memberIds,
    members:
      overrides.members ??
      (captainId
        ? {
            [captainId]: {
              userId: captainId,
              nickname: teamId,
              role: "CAPTAIN",
              isReady: false,
            },
          }
        : {}),
    isLocked: false,
    ...overrides,
  };
}

async function seedMatch(testEnv, matchId, matchData, alpha, beta) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`matches/${matchId}`).set(matchData);
    await firestore.doc(`matches/${matchId}/matchTeams/ALPHA`).set(alpha);
    await firestore.doc(`matches/${matchId}/matchTeams/BETA`).set(beta);
  });
}

async function shouldEnforceMatchLobbyRules(testEnv) {
  await testEnv.clearFirestore();
  await seedMatch(
    testEnv,
    "match-1",
    matchFixture(),
    matchTeamFixture("ALPHA"),
    matchTeamFixture("BETA")
  );

  const alpha = testEnv.authenticatedContext("alpha-uid");
  const beta = testEnv.authenticatedContext("beta-uid");
  const outsider = testEnv.authenticatedContext("outsider-uid");
  const unauth = testEnv.unauthenticatedContext();

  await assertFails(unauth.firestore().doc("matches/match-1").get());
  await assertSucceeds(alpha.firestore().doc("matches/match-1").get());

  await assertSucceeds(
    beta.firestore().doc("matches/match-1").update({
      captainIdBeta: "beta-uid",
      memberIds: ["alpha-uid", "beta-uid"],
    })
  );

  await assertSucceeds(
    beta.firestore().doc("matches/match-1/matchTeams/BETA").set(
      {
        teamId: "BETA",
        captainId: "beta-uid",
        memberIds: ["beta-uid"],
        members: {
          "beta-uid": {
            userId: "beta-uid",
            nickname: "Beta",
            role: "CAPTAIN",
            isReady: false,
          },
        },
        isLocked: false,
      },
      { merge: true }
    )
  );

  await assertFails(
    outsider.firestore().doc("matches/match-1").update({
      captainIdBeta: "outsider-uid",
      memberIds: ["alpha-uid", "outsider-uid"],
    })
  );

  await assertSucceeds(
    beta.firestore().doc("matches/match-1/matchTeams/BETA").update({
      "members.beta-uid.isReady": true,
    })
  );

  await assertFails(
    outsider.firestore().doc("matches/match-1/matchTeams/BETA").update({
      "members.beta-uid.isReady": false,
    })
  );

  await assertSucceeds(
    alpha.firestore().doc("matches/match-1").update({
      status: "PLACEMENT",
      gameId: "game-from-match",
    })
  );
}

run().catch((err) => {
  console.error("Firestore rules tests failed", err);
  process.exit(1);
});
