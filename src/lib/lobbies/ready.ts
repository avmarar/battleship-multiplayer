import type { LobbyMember } from "./types";

export function isMemberReady(member: LobbyMember): boolean {
  return member.isReady === true;
}

export function countReadyMembers(members: LobbyMember[]): {
  ready: number;
  total: number;
} {
  return {
    ready: members.filter(isMemberReady).length,
    total: members.length,
  };
}

export function allMembersReady(members: LobbyMember[]): boolean {
  return members.length > 0 && members.every(isMemberReady);
}
