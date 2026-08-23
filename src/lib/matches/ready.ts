import type { MatchDocument, MatchMember, MatchTeamDocument } from "./types";

export function isMemberReady(member: MatchMember): boolean {
  return member.isReady === true;
}

export function allTeamMembersReady(team: MatchTeamDocument): boolean {
  const members = Object.values(team.members);
  return members.length > 0 && members.every(isMemberReady);
}

export function bothCaptainsSeated(match: MatchDocument): boolean {
  return !!match.captainIdAlpha && !!match.captainIdBeta;
}

export function canStartMatch(
  match: MatchDocument,
  alpha: MatchTeamDocument | null,
  beta: MatchTeamDocument | null
): boolean {
  if (match.status !== "LOBBY" || !bothCaptainsSeated(match) || !alpha || !beta) {
    return false;
  }
  if (!allTeamMembersReady(alpha) || !allTeamMembersReady(beta)) {
    return false;
  }
  return true;
}

export function myTeamId(
  match: MatchDocument,
  uid: string
): "ALPHA" | "BETA" | null {
  if (match.captainIdAlpha === uid) {
    return "ALPHA";
  }
  if (match.captainIdBeta === uid) {
    return "BETA";
  }
  return null;
}
