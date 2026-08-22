import type { Timestamp } from "firebase/firestore";
import type {
  LobbyDocument,
  LobbyJoinRequest,
} from "@/lib/lobbies/types";

export type ProfileDocument = {
  nickname?: string;
  statusMessage?: string;
  environment?: string;
  lastClientUpdate?: string;
  updatedAt?: Timestamp;
};

export type AuthState =
  | { status: "checking" }
  | { status: "error"; message: string }
  | { status: "connected"; uid: string };

export type LobbySnapshot = LobbyDocument & { id: string };
export type JoinRequestWithPath = LobbyJoinRequest & {
  id: string;
  path?: string;
};
