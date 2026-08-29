import {
  collection,
  doc,
  type Firestore,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import type { LobbyDocument, LobbyMember, LobbyTeamId } from "@/lib/lobbies/types";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameTeamId,
} from "./types";

export type LobbyGameSource = Pick<
  LobbyDocument,
  | "captainId"
  | "captainIdBeta"
  | "memberIds"
  | "members"
  | "status"
  | "gameId"
> & { id: string };

function membersOnTeam(
  members: Record<string, LobbyMember>,
  team: LobbyTeamId
): string[] {
  return Object.values(members)
    .filter((member) => member.team === team)
    .map((member) => member.userId);
}

export function buildLobbyGamePayload(lobby: LobbyGameSource) {
  if (!lobby.captainIdBeta) {
    throw new Error("Beta captain is required before starting placement.");
  }

  const alphaMembers = membersOnTeam(lobby.members, "ALPHA");
  const betaMembers = membersOnTeam(lobby.members, "BETA");

  if (!alphaMembers.includes(lobby.captainId)) {
    alphaMembers.unshift(lobby.captainId);
  }
  if (!betaMembers.includes(lobby.captainIdBeta)) {
    betaMembers.unshift(lobby.captainIdBeta);
  }

  if (alphaMembers.length === 0 || betaMembers.length === 0) {
    throw new Error("Each team needs at least one member.");
  }

  const memberIds = [...new Set([...lobby.memberIds])];
  for (const uid of [...alphaMembers, ...betaMembers]) {
    if (!memberIds.includes(uid)) {
      memberIds.push(uid);
    }
  }

  return {
    status: "PLACEMENT" as const,
    memberIds,
    lobbyId: lobby.id,
    teams: {
      ALPHA: { captainId: lobby.captainId, memberIds: alphaMembers },
      BETA: { captainId: lobby.captainIdBeta, memberIds: betaMembers },
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

async function writeTeamDocs(
  db: Firestore,
  gameId: string,
  alphaMemberIds: string[],
  betaMemberIds: string[]
) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  await Promise.all([
    setDoc(
      doc(gameRef, GAME_TEAMS_COLLECTION, "ALPHA"),
      teamDocPayload("ALPHA", alphaMemberIds)
    ),
    setDoc(
      doc(gameRef, GAME_TEAMS_COLLECTION, "BETA"),
      teamDocPayload("BETA", betaMemberIds)
    ),
  ]);
}

/**
 * Creates games/{id} from a lobby roster and stamps lobby.gameId + PLACEMENT.
 * Idempotent when lobby.gameId is already set.
 */
export async function startLobbyGame(
  db: Firestore,
  lobby: LobbyGameSource
): Promise<{ gameId: string; created: boolean }> {
  if (lobby.gameId) {
    return { gameId: lobby.gameId, created: false };
  }

  if (lobby.status !== "LOBBY") {
    throw new Error("Lobby is not open for placement start.");
  }

  const payload = buildLobbyGamePayload(lobby);
  const gameRef = doc(collection(db, GAMES_COLLECTION));
  await setDoc(gameRef, payload);
  await writeTeamDocs(
    db,
    gameRef.id,
    payload.teams.ALPHA.memberIds,
    payload.teams.BETA.memberIds
  );
  await updateDoc(doc(db, "lobbies", lobby.id), {
    status: "PLACEMENT",
    gameId: gameRef.id,
  });

  return { gameId: gameRef.id, created: true };
}
