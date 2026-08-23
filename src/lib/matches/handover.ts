import type { Timestamp } from "firebase/firestore";
import {
  doc,
  type Firestore,
  runTransaction,
} from "firebase/firestore";
import { PRESENCE_COLLECTION } from "@/lib/presence/types";
import { canHandoverCaptain } from "@/lib/presence/stale";
import { CAPTAIN_HANDOVER_MS } from "@/lib/presence/types";
import type { PresenceDocument } from "@/lib/presence/types";
import {
  MATCH_TEAMS_COLLECTION,
  MATCHES_COLLECTION,
  type MatchDocument,
  type MatchMember,
  type MatchTeamDocument,
  type MatchTeamId,
} from "./types";

function joinedMillis(member: MatchMember) {
  const value = member.joinedAt as Timestamp | undefined;
  return value && typeof value.toMillis === "function" ? value.toMillis() : 0;
}

export function electLongestTenured(
  members: Record<string, MatchMember>,
  excludeUid: string
): string | null {
  const candidates = Object.values(members).filter(
    (member) => member.userId !== excludeUid
  );
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => {
    const byJoined = joinedMillis(a) - joinedMillis(b);
    if (byJoined !== 0) {
      return byJoined;
    }
    return a.userId.localeCompare(b.userId);
  });
  return candidates[0]?.userId ?? null;
}

export async function handoverMatchCaptain(
  db: Firestore,
  matchId: string,
  teamId: MatchTeamId,
  actorUid: string
) {
  const matchRef = doc(db, MATCHES_COLLECTION, matchId);
  const teamRef = doc(matchRef, MATCH_TEAMS_COLLECTION, teamId);

  return runTransaction(db, async (transaction) => {
    const matchSnapshot = await transaction.get(matchRef);
    const teamSnapshot = await transaction.get(teamRef);
    if (!matchSnapshot.exists() || !teamSnapshot.exists()) {
      throw new Error("Match no longer exists.");
    }

    const match = matchSnapshot.data() as MatchDocument;
    const team = teamSnapshot.data() as MatchTeamDocument;
    if (!match.memberIds.includes(actorUid) || !team.memberIds.includes(actorUid)) {
      throw new Error("You are not on this team.");
    }

    const currentCaptain =
      teamId === "ALPHA" ? match.captainIdAlpha : match.captainIdBeta;
    if (!currentCaptain) {
      throw new Error("No captain to replace.");
    }
    if (currentCaptain === actorUid) {
      throw new Error("You are already the captain.");
    }

    const presenceSnapshot = await transaction.get(
      doc(db, PRESENCE_COLLECTION, currentCaptain)
    );
    const presence = presenceSnapshot.exists()
      ? (presenceSnapshot.data() as PresenceDocument)
      : null;
    if (!canHandoverCaptain(presence, Date.now(), CAPTAIN_HANDOVER_MS)) {
      throw new Error("The captain is still connected.");
    }

    const elected = electLongestTenured(team.members, currentCaptain);
    if (elected !== actorUid) {
      throw new Error("Another teammate has tenure for captain.");
    }

    const members = { ...team.members };
    if (members[currentCaptain]) {
      members[currentCaptain] = { ...members[currentCaptain], role: "CREW" };
    }
    if (members[elected]) {
      members[elected] = { ...members[elected], role: "CAPTAIN" };
    }

    if (teamId === "ALPHA") {
      transaction.update(matchRef, { captainIdAlpha: elected });
    } else {
      transaction.update(matchRef, { captainIdBeta: elected });
    }
    transaction.update(teamRef, {
      captainId: elected,
      members,
    });

    return { teamId, captainId: elected };
  });
}
