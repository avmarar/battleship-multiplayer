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
  type LobbyDocument,
  type LobbyTeamId,
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

async function isInviteCodeTaken(db: Firestore, code: string) {
  const [alphaHits, betaHits] = await Promise.all([
    getDocs(
      query(collection(db, "lobbies"), where("inviteCode", "==", code), limit(1))
    ),
    getDocs(
      query(
        collection(db, "lobbies"),
        where("inviteCodeBeta", "==", code),
        limit(1)
      )
    ),
  ]);
  return !alphaHits.empty || !betaHits.empty;
}

export async function generateUniqueInviteCode(
  db: Firestore,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateInviteCode();
    if (!(await isInviteCodeTaken(db, code))) {
      return code;
    }
  }

  throw new Error("Unable to generate unique invite code. Try again.");
}

export async function generateUniqueInviteCodes(db: Firestore) {
  const alpha = await generateUniqueInviteCode(db);
  let beta = await generateUniqueInviteCode(db);
  while (beta === alpha) {
    beta = await generateUniqueInviteCode(db);
  }
  return { alpha, beta };
}

export function teamForInviteCode(
  lobby: Pick<LobbyDocument, "inviteCode" | "inviteCodeBeta">,
  code: string
): LobbyTeamId | null {
  const normalized = normalizeInviteCode(code);
  if (lobby.inviteCodeBeta && lobby.inviteCodeBeta === normalized) {
    return "BETA";
  }
  if (lobby.inviteCode === normalized) {
    return "ALPHA";
  }
  return null;
}

export async function findLobbyByInviteCode(db: Firestore, code: string) {
  const normalized = normalizeInviteCode(code);
  const [alphaHits, betaHits] = await Promise.all([
    getDocs(
      query(
        collection(db, "lobbies"),
        where("inviteCode", "==", normalized),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "lobbies"),
        where("inviteCodeBeta", "==", normalized),
        limit(1)
      )
    ),
  ]);

  const docSnapshot = !alphaHits.empty
    ? alphaHits.docs[0]
    : !betaHits.empty
      ? betaHits.docs[0]
      : null;

  if (!docSnapshot) {
    return null;
  }

  const data = docSnapshot.data() as LobbyDocument;
  const team = teamForInviteCode(data, normalized);
  if (!team) {
    return null;
  }

  return { id: docSnapshot.id, data, team, inviteCode: normalized };
}

export function formatMaxMembers(value?: number) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_MAX_MEMBERS;
  }
  return Math.max(2, Math.min(12, value));
}
