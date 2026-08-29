import type { Timestamp } from "firebase/firestore";
import type { AccountType } from "@/lib/profile/accountType";

export type PresenceDocument = {
  uid: string;
  isConnected: boolean;
  lastSeenAt: Timestamp;
  gameId?: string | null;
  matchId?: string | null;
  accountType?: AccountType;
};

export const PRESENCE_COLLECTION = "presence";
export const PRESENCE_HEARTBEAT_MS = 10_000;
export const DISCONNECT_SKIP_MS = 30_000;
export const CAPTAIN_HANDOVER_MS = 60_000;
