import type { Timestamp } from "firebase/firestore";

export type LobbyStatus = "LOBBY" | "PLACEMENT" | "BATTLE" | "ENDED";

export type LobbyMemberRole = "CAPTAIN" | "CREW";

export type LobbyMember = {
  userId: string;
  nickname: string;
  role: LobbyMemberRole;
  joinedAt?: Timestamp;
};

export type LobbyDocument = {
  inviteCode: string;
  captainId: string;
  status: LobbyStatus;
  isLocked: boolean;
  maxMembers: number;
  createdAt: Timestamp;
  memberIds: string[];
  members: Record<string, LobbyMember>;
};

export type LobbyJoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type LobbyJoinRequest = {
  lobbyId: string;
  userId: string;
  nickname: string;
  inviteCode?: string;
  requestedTeam: "ALPHA" | "BETA";
  status: LobbyJoinRequestStatus;
  createdAt: Timestamp;
  decisionAt?: Timestamp;
  decisionBy?: string;
};

export const LOBBY_TEAM_OPTIONS = ["ALPHA", "BETA"] as const;

export const DEFAULT_MAX_MEMBERS = 8;
export const INVITE_CODE_LENGTH = 6;
