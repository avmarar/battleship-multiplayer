import type { Timestamp } from "firebase/firestore";

export type MatchMode = "1v1" | "MULTIPLAYER";

export type MatchStatus = "LOBBY" | "PLACEMENT" | "BATTLE" | "ENDED";

export type MatchTeamId = "ALPHA" | "BETA";

export type MatchMemberRole = "CAPTAIN" | "CREW";

export type MatchMember = {
  userId: string;
  nickname: string;
  role: MatchMemberRole;
  isReady?: boolean;
  joinedAt?: Timestamp;
};

export type MatchDocument = {
  mode: MatchMode;
  matchCode: string;
  captainIdAlpha: string;
  captainIdBeta?: string;
  status: MatchStatus;
  memberIds: string[];
  maxMembersPerTeam: number;
  createdAt: Timestamp;
  gameId?: string;
};

export type MatchTeamDocument = {
  teamId: MatchTeamId;
  captainId: string;
  /** Crew invite — only set for MULTIPLAYER. */
  inviteCode?: string;
  memberIds: string[];
  members: Record<string, MatchMember>;
  isLocked: boolean;
};

export type MatchJoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type MatchJoinRequest = {
  matchId: string;
  teamId: MatchTeamId;
  userId: string;
  nickname: string;
  inviteCode: string;
  status: MatchJoinRequestStatus;
  createdAt: Timestamp;
  decisionAt?: Timestamp;
  decisionBy?: string;
};

export const MATCHES_COLLECTION = "matches";
/** Distinct from games/{id}/teams so collectionGroup queries stay rule-safe. */
export const MATCH_TEAMS_COLLECTION = "matchTeams";
export const MATCH_JOIN_REQUESTS_COLLECTION = "joinRequests";

export const DEFAULT_MAX_MEMBERS_PER_TEAM_MULTIPLAYER = 4;
export const DEFAULT_MAX_MEMBERS_PER_TEAM_1V1 = 1;
export const MATCH_CODE_LENGTH = 6;
