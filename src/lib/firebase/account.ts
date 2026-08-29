import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { ensureAnonymousSignIn } from "./client";

export function isEmailAccount(user: User | null) {
  return (
    !!user &&
    (!!user.email ||
      (user.providerData ?? []).some(
        (provider) => provider.providerId === "password"
      ))
  );
}

export async function registerWithEmail(
  auth: Auth,
  email: string,
  password: string
) {
  const trimmed = email.trim();
  if (!trimmed || password.length < 6) {
    throw new Error("Enter an email and a password of at least 6 characters.");
  }

  const current = auth.currentUser;
  const result = current?.isAnonymous
    ? await linkWithCredential(
        current,
        EmailAuthProvider.credential(trimmed, password)
      )
    : await createUserWithEmailAndPassword(auth, trimmed, password);
  await result.user.reload();
  return result;
}

export async function signInWithEmail(
  auth: Auth,
  email: string,
  password: string
) {
  const trimmed = email.trim();
  if (!trimmed || !password) {
    throw new Error("Enter your email and password.");
  }
  const result = await signInWithEmailAndPassword(auth, trimmed, password);
  await result.user.reload();
  return result;
}

export async function signOutToGuest(auth: Auth) {
  await signOut(auth);
  return ensureAnonymousSignIn(auth);
}
