import type { Timestamp } from "firebase/firestore";

export type PresenceDocument = {
  uid: string;
  isConnected: boolean;
  lastSeenAt: Timestamp;
  gameId?: string | null;
  matchId?: string | null;
};

export const PRESENCE_COLLECTION = "presence";
export const PRESENCE_HEARTBEAT_MS = 10_000;
export const DISCONNECT_SKIP_MS = 30_000;
export const CAPTAIN_HANDOVER_MS = 60_000;
