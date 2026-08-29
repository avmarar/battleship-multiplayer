import type { Timestamp } from "firebase/firestore";
import {
  CAPTAIN_HANDOVER_MS,
  DISCONNECT_SKIP_MS,
  type PresenceDocument,
} from "./types";

export function timestampMillis(
  value: Timestamp | { toMillis: () => number } | Date | number | undefined
) {
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

export function isStale(
  lastSeenAt: PresenceDocument["lastSeenAt"] | Date | number | undefined,
  nowMs: number,
  thresholdMs: number
) {
  const seen = timestampMillis(lastSeenAt);
  if (seen === 0) {
    return false;
  }
  return nowMs - seen >= thresholdMs;
}

export function canSkipDisconnected(
  presence: Pick<PresenceDocument, "lastSeenAt"> | null | undefined,
  nowMs: number,
  thresholdMs = DISCONNECT_SKIP_MS
) {
  if (!presence) {
    return false;
  }
  return isStale(presence.lastSeenAt, nowMs, thresholdMs);
}

export function canHandoverCaptain(
  presence: Pick<PresenceDocument, "lastSeenAt"> | null | undefined,
  nowMs: number,
  thresholdMs = CAPTAIN_HANDOVER_MS
) {
  return canSkipDisconnected(presence, nowMs, thresholdMs);
}

export function skipCountdownMs(
  lastSeenAt: PresenceDocument["lastSeenAt"] | Date | number | undefined,
  nowMs: number,
  thresholdMs = DISCONNECT_SKIP_MS
) {
  const seen = timestampMillis(lastSeenAt);
  if (seen === 0) {
    return thresholdMs;
  }
  return Math.max(0, thresholdMs - (nowMs - seen));
}
