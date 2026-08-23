import type { Timestamp } from "firebase/firestore";
import type {
  MatchDocument,
  MatchJoinRequest,
  MatchTeamDocument,
  MatchTeamId,
} from "@/lib/matches/types";

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

export type MatchSnapshot = MatchDocument & { id: string };

export type MatchTeamSnapshot = MatchTeamDocument & { id: MatchTeamId };

export type JoinRequestWithPath = MatchJoinRequest & {
  id: string;
  path?: string;
};
