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
