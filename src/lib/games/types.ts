import type { Timestamp } from "firebase/firestore";
import type { LockedShipPayload } from "@/lib/grid/placement";

export type GameStatus = "PLACEMENT" | "BATTLE" | "ENDED";
export type GameTeamId = "ALPHA" | "BETA";

export type GameTeamSummary = {
  captainId: string;
  memberIds: string[];
};

export type GamePlacementLock = {
  isLocked: boolean;
};

export type GameDocument = {
  status: GameStatus;
  memberIds: string[];
  teams: Record<GameTeamId, GameTeamSummary>;
  placement: Record<GameTeamId, GamePlacementLock>;
  createdAt: Timestamp;
  lobbyId?: string;
  turnOrder?: string[];
  currentTurnIndex?: number;
  winnerTeam?: GameTeamId;
  /** Set once when W/L recording has been attempted. */
  statsRecorded?: boolean;
  /** True only when every participant was a registered account (FR 4.2 / 4.3). */
  statsRanked?: boolean;
};

export type GameTeamDocument = {
  teamId: GameTeamId;
  memberIds: string[];
  ships: LockedShipPayload[];
  isLocked: boolean;
  shotsFired: string[];
};

export type MatchmakingSlot = {
  uid: string | null;
  nickname: string | null;
  updatedAt: Timestamp;
};

export const MATCHMAKING_SLOT_PATH = ["matchmakingSlots", "open"] as const;
export const GAMES_COLLECTION = "games";
export const GAME_TEAMS_COLLECTION = "teams";
