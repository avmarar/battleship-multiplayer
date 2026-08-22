import {
  collection,
  Firestore,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import {
  DEFAULT_MAX_MEMBERS,
  INVITE_CODE_LENGTH,
} from "./types";

const INVITE_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeInviteCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function generateInviteCode() {
  let result = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * INVITE_CODE_CHARSET.length);
    result += INVITE_CODE_CHARSET[index];
  }
  return result;
}

export async function generateUniqueInviteCode(
  db: Firestore,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateInviteCode();
    const snapshot = await getDocs(
      query(
        collection(db, "lobbies"),
        where("inviteCode", "==", code),
        limit(1)
      )
    );
    if (snapshot.empty) {
      return code;
    }
  }

  throw new Error("Unable to generate unique invite code. Try again.");
}

export function formatMaxMembers(value?: number) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_MAX_MEMBERS;
  }
  return Math.max(2, Math.min(12, value));
}
