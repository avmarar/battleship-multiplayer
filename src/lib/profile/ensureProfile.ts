import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import type { AccountType } from "./accountType";
import { guestNickname } from "./nickname";
import { profileDocSegments } from "./paths";

type ProfileFields = {
  nickname?: string;
  accountType?: AccountType;
};

export async function ensurePlayerProfile(
  db: Firestore,
  uid: string,
  accountType: AccountType
) {
  const ref = doc(db, ...profileDocSegments(uid));
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as ProfileFields | undefined;
  const nickname = data?.nickname?.trim();
  const needsGuestName = accountType === "guest" && !nickname;
  const needsType = data?.accountType !== accountType;

  if (snapshot.exists() && !needsGuestName && !needsType) {
    return;
  }

  await setDoc(
    ref,
    {
      ...(needsGuestName ? { nickname: guestNickname(uid) } : {}),
      accountType,
    },
    { merge: true }
  );
}
