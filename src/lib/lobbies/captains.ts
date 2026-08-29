import type {
  LobbyDocument,
  LobbyJoinRequest,
  LobbyMember,
  LobbyMemberRole,
  LobbyTeamId,
} from "./types";
import { allMembersReady, isMemberReady } from "./ready";

export function isAlphaCaptain(
  lobby: Pick<LobbyDocument, "captainId">,
  uid: string | null | undefined
): boolean {
  return !!uid && lobby.captainId === uid;
}

export function isBetaCaptain(
  lobby: Pick<LobbyDocument, "captainIdBeta">,
  uid: string | null | undefined
): boolean {
  return !!uid && !!lobby.captainIdBeta && lobby.captainIdBeta === uid;
}

export function isAnyTeamCaptain(
  lobby: Pick<LobbyDocument, "captainId" | "captainIdBeta">,
  uid: string | null | undefined
): boolean {
  return isAlphaCaptain(lobby, uid) || isBetaCaptain(lobby, uid);
}

/** Who may approve/reject a pending join for the given team. */
export function canManageJoinTeam(
  lobby: Pick<LobbyDocument, "captainId" | "captainIdBeta">,
  uid: string | null | undefined,
  team: LobbyTeamId
): boolean {
  if (!uid) {
    return false;
  }
  if (team === "ALPHA") {
    return isAlphaCaptain(lobby, uid);
  }
  // First Beta joiner is seated by Alpha until a Beta captain exists.
  if (!lobby.captainIdBeta) {
    return isAlphaCaptain(lobby, uid);
  }
  return isBetaCaptain(lobby, uid);
}

export function roleForApprovedJoin(
  lobby: Pick<LobbyDocument, "captainIdBeta">,
  requestedTeam: LobbyTeamId
): LobbyMemberRole {
  if (requestedTeam === "BETA" && !lobby.captainIdBeta) {
    return "CAPTAIN";
  }
  return "CREW";
}

export function bothCaptainsPresent(
  lobby: Pick<LobbyDocument, "captainId" | "captainIdBeta" | "memberIds">
): boolean {
  return (
    !!lobby.captainId &&
    !!lobby.captainIdBeta &&
    lobby.memberIds.includes(lobby.captainId) &&
    lobby.memberIds.includes(lobby.captainIdBeta)
  );
}

export function bothCaptainsReady(
  lobby: Pick<LobbyDocument, "captainId" | "captainIdBeta" | "members">
): boolean {
  if (!lobby.captainIdBeta) {
    return false;
  }
  const alpha = lobby.members[lobby.captainId];
  const beta = lobby.members[lobby.captainIdBeta];
  return !!alpha && !!beta && isMemberReady(alpha) && isMemberReady(beta);
}

export function canStartPlacement(
  lobby: Pick<
    LobbyDocument,
    "captainId" | "captainIdBeta" | "memberIds" | "members" | "status"
  >,
  members: LobbyMember[]
): boolean {
  return (
    lobby.status === "LOBBY" &&
    bothCaptainsPresent(lobby) &&
    bothCaptainsReady(lobby) &&
    allMembersReady(members)
  );
}

export function filterJoinRequestsForCaptain<T extends LobbyJoinRequest>(
  lobby: Pick<LobbyDocument, "captainId" | "captainIdBeta">,
  uid: string | null | undefined,
  requests: T[]
): T[] {
  return requests.filter((request) =>
    canManageJoinTeam(lobby, uid, request.requestedTeam)
  );
}

export type ApprovalMemberWrite = {
  userId: string;
  nickname: string;
  role: LobbyMemberRole;
  team: LobbyTeamId;
  isReady: boolean;
};

export function buildApprovalMember(
  lobby: Pick<LobbyDocument, "captainIdBeta">,
  request: Pick<LobbyJoinRequest, "userId" | "nickname" | "requestedTeam">
): ApprovalMemberWrite {
  return {
    userId: request.userId,
    nickname: request.nickname,
    role: roleForApprovedJoin(lobby, request.requestedTeam),
    team: request.requestedTeam,
    isReady: false,
  };
}

export function lobbyPatchForApproval(
  lobby: Pick<LobbyDocument, "captainIdBeta" | "memberIds">,
  request: Pick<LobbyJoinRequest, "userId" | "nickname" | "requestedTeam">
): Record<string, unknown> {
  const member = buildApprovalMember(lobby, request);
  const patch: Record<string, unknown> = {
    memberIds: [...(lobby.memberIds || []), request.userId],
    [`members.${request.userId}`]: member,
  };
  if (member.role === "CAPTAIN" && member.team === "BETA") {
    patch.captainIdBeta = request.userId;
  }
  return patch;
}
