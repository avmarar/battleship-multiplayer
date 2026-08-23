import {
  collection,
  doc,
  type Firestore,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameTeamId,
} from "@/lib/games/types";
import {
  MATCHES_COLLECTION,
  type MatchDocument,
  type MatchTeamDocument,
} from "@/lib/matches/types";

export function buildMatchGamePayload(
  matchId: string,
  match: MatchDocument,
  alpha: MatchTeamDocument,
  beta: MatchTeamDocument
) {
  if (!match.captainIdBeta) {
    throw new Error("Beta captain is required before starting.");
  }

  const memberIds = [
    ...new Set([...alpha.memberIds, ...beta.memberIds, ...match.memberIds]),
  ];

  return {
    status: "PLACEMENT" as const,
    memberIds,
    lobbyId: matchId,
    teams: {
      ALPHA: {
        captainId: match.captainIdAlpha,
        memberIds: [...alpha.memberIds],
      },
      BETA: {
        captainId: match.captainIdBeta,
        memberIds: [...beta.memberIds],
      },
    },
    placement: {
      ALPHA: { isLocked: false },
      BETA: { isLocked: false },
    },
    createdAt: Timestamp.now(),
  };
}

function teamDocPayload(teamId: GameTeamId, memberIds: string[]) {
  return {
    teamId,
    memberIds,
    ships: [],
    isLocked: false,
    shotsFired: [],
  };
}

export async function startMatchGame(
  db: Firestore,
  matchId: string,
  match: MatchDocument,
  alpha: MatchTeamDocument,
  beta: MatchTeamDocument
): Promise<{ gameId: string; created: boolean }> {
  if (match.gameId) {
    return { gameId: match.gameId, created: false };
  }
  if (match.status !== "LOBBY") {
    throw new Error("Match is not open for start.");
  }

  const payload = buildMatchGamePayload(matchId, match, alpha, beta);
  const gameRef = doc(collection(db, GAMES_COLLECTION));
  await setDoc(gameRef, payload);
  await Promise.all([
    setDoc(
      doc(gameRef, GAME_TEAMS_COLLECTION, "ALPHA"),
      teamDocPayload("ALPHA", payload.teams.ALPHA.memberIds)
    ),
    setDoc(
      doc(gameRef, GAME_TEAMS_COLLECTION, "BETA"),
      teamDocPayload("BETA", payload.teams.BETA.memberIds)
    ),
  ]);
  await updateDoc(doc(db, MATCHES_COLLECTION, matchId), {
    status: "PLACEMENT",
    gameId: gameRef.id,
  });

  return { gameId: gameRef.id, created: true };
}
