import {
  collection,
  doc,
  type Firestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { generateUniqueInviteCodes, generateUniqueMatchCode } from "./codes";
import {
  DEFAULT_MAX_MEMBERS_PER_TEAM_1V1,
  DEFAULT_MAX_MEMBERS_PER_TEAM_MULTIPLAYER,
  MATCH_TEAMS_COLLECTION,
  MATCHES_COLLECTION,
  type MatchDocument,
  type MatchMode,
  type MatchTeamDocument,
} from "./types";

export async function createMatch(
  db: Firestore,
  input: {
    uid: string;
    nickname: string;
    mode: MatchMode;
  }
): Promise<{ matchId: string; matchCode: string }> {
  const maxMembersPerTeam =
    input.mode === "1v1"
      ? DEFAULT_MAX_MEMBERS_PER_TEAM_1V1
      : DEFAULT_MAX_MEMBERS_PER_TEAM_MULTIPLAYER;

  const codes =
    input.mode === "MULTIPLAYER"
      ? await generateUniqueInviteCodes(db)
      : {
          matchCode: await generateUniqueMatchCode(db),
          alpha: undefined as string | undefined,
          beta: undefined as string | undefined,
        };

  const matchRef = doc(collection(db, MATCHES_COLLECTION));
  const match: Omit<MatchDocument, "createdAt"> & { createdAt: Timestamp } = {
    mode: input.mode,
    matchCode: codes.matchCode,
    captainIdAlpha: input.uid,
    status: "LOBBY",
    memberIds: [input.uid],
    maxMembersPerTeam,
    createdAt: Timestamp.now(),
  };

  const alphaTeam: MatchTeamDocument = {
    teamId: "ALPHA",
    captainId: input.uid,
    memberIds: [input.uid],
    members: {
      [input.uid]: {
        userId: input.uid,
        nickname: input.nickname,
        role: "CAPTAIN",
        isReady: false,
        joinedAt: Timestamp.now(),
      },
    },
    isLocked: false,
    ...(codes.alpha ? { inviteCode: codes.alpha } : {}),
  };

  // Beta team shell — captain filled when peer joins via matchCode.
  const betaTeam: MatchTeamDocument = {
    teamId: "BETA",
    captainId: "",
    memberIds: [],
    members: {},
    isLocked: false,
    ...(codes.beta ? { inviteCode: codes.beta } : {}),
  };

  await setDoc(matchRef, match);
  await setDoc(doc(matchRef, MATCH_TEAMS_COLLECTION, "ALPHA"), alphaTeam);
  await setDoc(doc(matchRef, MATCH_TEAMS_COLLECTION, "BETA"), betaTeam);

  return { matchId: matchRef.id, matchCode: codes.matchCode };
}

export async function seatBetaCaptain(
  db: Firestore,
  matchId: string,
  match: MatchDocument,
  input: { uid: string; nickname: string }
) {
  if (match.captainIdBeta) {
    throw new Error("This match already has a Beta captain.");
  }
  if (match.memberIds.includes(input.uid)) {
    throw new Error("You are already in this match.");
  }
  if (match.status !== "LOBBY") {
    throw new Error("This match is no longer open.");
  }

  const matchRef = doc(db, MATCHES_COLLECTION, matchId);
  const betaRef = doc(matchRef, MATCH_TEAMS_COLLECTION, "BETA");

  await updateDoc(matchRef, {
    captainIdBeta: input.uid,
    memberIds: [...match.memberIds, input.uid],
  });

  await updateDoc(betaRef, {
    captainId: input.uid,
    memberIds: [input.uid],
    members: {
      [input.uid]: {
        userId: input.uid,
        nickname: input.nickname,
        role: "CAPTAIN",
        isReady: false,
        joinedAt: Timestamp.now(),
      },
    },
  });
}

/** Keep serverTimestamp helper available for UI writes. */
export { serverTimestamp };
