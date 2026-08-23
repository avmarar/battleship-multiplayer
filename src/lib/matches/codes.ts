import {
  collection,
  collectionGroup,
  type Firestore,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import {
  MATCH_CODE_LENGTH,
  MATCH_TEAMS_COLLECTION,
  MATCHES_COLLECTION,
} from "./types";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeMatchCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function generateMatchCode(length = MATCH_CODE_LENGTH) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}

async function isCodeTaken(db: Firestore, code: string) {
  const [matchHits, teamHits] = await Promise.all([
    getDocs(
      query(
        collection(db, MATCHES_COLLECTION),
        where("matchCode", "==", code),
        limit(1)
      )
    ),
    getDocs(
      query(
        collectionGroup(db, MATCH_TEAMS_COLLECTION),
        where("inviteCode", "==", code),
        limit(1)
      )
    ),
  ]);
  return !matchHits.empty || !teamHits.empty;
}

export async function generateUniqueMatchCode(
  db: Firestore,
  maxAttempts = 8
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateMatchCode();
    if (!(await isCodeTaken(db, code))) {
      return code;
    }
  }
  throw new Error("Unable to generate a unique code. Try again.");
}

export async function generateUniqueInviteCodes(db: Firestore) {
  const matchCode = await generateUniqueMatchCode(db);
  let alpha = await generateUniqueMatchCode(db);
  while (alpha === matchCode) {
    alpha = await generateUniqueMatchCode(db);
  }
  let beta = await generateUniqueMatchCode(db);
  while (beta === matchCode || beta === alpha) {
    beta = await generateUniqueMatchCode(db);
  }
  return { matchCode, alpha, beta };
}
