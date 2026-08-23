import { doc, type Firestore, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { isEmailAccount } from "@/lib/firebase/account";
import { profileDocSegments } from "./paths";

export type AccountType = "guest" | "registered";

export function accountTypeForUser(user: User | null): AccountType {
  return isEmailAccount(user) ? "registered" : "guest";
}

export async function stampAccountType(
  db: Firestore,
  uid: string,
  accountType: AccountType
) {
  await setDoc(
    doc(db, ...profileDocSegments(uid)),
    { accountType },
    { merge: true }
  );
}
