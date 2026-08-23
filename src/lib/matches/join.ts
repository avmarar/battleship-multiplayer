import {
  collection,
  collectionGroup,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { normalizeMatchCode } from "./codes";
import { seatBetaCaptain } from "./createMatch";
import {
  MATCH_JOIN_REQUESTS_COLLECTION,
  MATCH_TEAMS_COLLECTION,
  MATCHES_COLLECTION,
  type MatchDocument,
  type MatchJoinRequest,
  type MatchTeamDocument,
  type MatchTeamId,
} from "./types";

export async function findMatchByMatchCode(db: Firestore, code: string) {
  const normalized = normalizeMatchCode(code);
  const snapshot = await getDocs(
    query(
      collection(db, MATCHES_COLLECTION),
      where("matchCode", "==", normalized),
      limit(1)
    )
  );
  if (snapshot.empty) {
    return null;
  }
  const docSnapshot = snapshot.docs[0];
  return {
    id: docSnapshot.id,
    data: docSnapshot.data() as MatchDocument,
  };
}

export async function findTeamByCrewInvite(db: Firestore, code: string) {
  const normalized = normalizeMatchCode(code);
  const snapshot = await getDocs(
    query(
      collectionGroup(db, MATCH_TEAMS_COLLECTION),
      where("inviteCode", "==", normalized),
      limit(1)
    )
  );
  if (snapshot.empty) {
    return null;
  }
  const teamDoc = snapshot.docs[0];
  const matchRef = teamDoc.ref.parent.parent;
  if (!matchRef) {
    return null;
  }
  return {
    matchId: matchRef.id,
    teamId: teamDoc.id as MatchTeamId,
    team: teamDoc.data() as MatchTeamDocument,
    inviteCode: normalized,
  };
}

export async function joinAsBetaCaptain(
  db: Firestore,
  input: { code: string; uid: string; nickname: string }
) {
  const match = await findMatchByMatchCode(db, input.code);
  if (!match) {
    throw new Error("Match not found. Check the lobby code.");
  }
  await seatBetaCaptain(db, match.id, match.data, {
    uid: input.uid,
    nickname: input.nickname,
  });
  return match.id;
}

export async function submitCrewJoinRequest(
  db: Firestore,
  input: { code: string; uid: string; nickname: string }
) {
  const found = await findTeamByCrewInvite(db, input.code);
  if (!found) {
    throw new Error("Invite not found. Check the player invite code.");
  }

  const matchDoc = await getDoc(doc(db, MATCHES_COLLECTION, found.matchId));
  if (!matchDoc.exists()) {
    throw new Error("Match no longer exists.");
  }
  const match = matchDoc.data() as MatchDocument;
  if (match.mode !== "MULTIPLAYER") {
    throw new Error("This match does not accept crew joins.");
  }
  if (match.status !== "LOBBY") {
    throw new Error("This match is no longer accepting players.");
  }
  if (found.team.isLocked) {
    throw new Error("This team is locked.");
  }
  if (
    found.team.memberIds.includes(input.uid) ||
    match.memberIds.includes(input.uid)
  ) {
    throw new Error("You are already in this match.");
  }
  if (found.team.memberIds.length >= match.maxMembersPerTeam) {
    throw new Error("This team is full.");
  }
  if (!found.team.captainId) {
    throw new Error("That team has no captain yet.");
  }

  await setDoc(
    doc(
      db,
      MATCHES_COLLECTION,
      found.matchId,
      MATCH_TEAMS_COLLECTION,
      found.teamId,
      MATCH_JOIN_REQUESTS_COLLECTION,
      input.uid
    ),
    {
      matchId: found.matchId,
      teamId: found.teamId,
      userId: input.uid,
      nickname: input.nickname,
      inviteCode: found.inviteCode,
      status: "PENDING",
      createdAt: serverTimestamp(),
    } satisfies Omit<MatchJoinRequest, "createdAt"> & {
      createdAt: ReturnType<typeof serverTimestamp>;
    }
  );

  return { matchId: found.matchId, teamId: found.teamId };
}

export async function approveCrewJoin(
  db: Firestore,
  input: {
    matchId: string;
    teamId: MatchTeamId;
    request: MatchJoinRequest;
    decisionBy: string;
    match: MatchDocument;
    team: MatchTeamDocument;
  }
) {
  if (input.team.captainId !== input.decisionBy) {
    throw new Error("Only the team captain can approve.");
  }
  if (input.team.memberIds.length >= input.match.maxMembersPerTeam) {
    throw new Error("Team is full.");
  }

  const matchRef = doc(db, MATCHES_COLLECTION, input.matchId);
  const teamRef = doc(matchRef, MATCH_TEAMS_COLLECTION, input.teamId);
  const requestRef = doc(
    teamRef,
    MATCH_JOIN_REQUESTS_COLLECTION,
    input.request.userId
  );

  await updateDoc(teamRef, {
    memberIds: [...input.team.memberIds, input.request.userId],
    [`members.${input.request.userId}`]: {
      userId: input.request.userId,
      nickname: input.request.nickname,
      role: "CREW",
      isReady: false,
      joinedAt: serverTimestamp(),
    },
  });
  await updateDoc(matchRef, {
    memberIds: [...input.match.memberIds, input.request.userId],
  });
  await updateDoc(requestRef, {
    status: "APPROVED",
    decisionAt: serverTimestamp(),
    decisionBy: input.decisionBy,
  });
}

export async function rejectCrewJoin(
  db: Firestore,
  input: {
    matchId: string;
    teamId: MatchTeamId;
    userId: string;
    decisionBy: string;
  }
) {
  await updateDoc(
    doc(
      db,
      MATCHES_COLLECTION,
      input.matchId,
      MATCH_TEAMS_COLLECTION,
      input.teamId,
      MATCH_JOIN_REQUESTS_COLLECTION,
      input.userId
    ),
    {
      status: "REJECTED",
      decisionAt: serverTimestamp(),
      decisionBy: input.decisionBy,
    }
  );
}
