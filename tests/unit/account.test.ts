import { describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";

const {
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
} = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  linkWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credential: (email: string, password: string) => ({ email, password }),
  },
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
}));

vi.mock("@/lib/firebase/client", () => ({
  ensureAnonymousSignIn: vi.fn(),
}));

import {
  isEmailAccount,
  registerWithEmail,
  signInWithEmail,
} from "@/lib/firebase/account";

describe("email account helpers (AUTH-2)", () => {
  it("treats linked email users as persistent accounts", () => {
    expect(
      isEmailAccount({
        uid: "u1",
        email: "a@b.c",
        isAnonymous: false,
        providerData: [],
      } as User)
    ).toBe(true);
    expect(
      isEmailAccount({
        uid: "u1",
        email: "a@b.c",
        isAnonymous: true,
        providerData: [],
      } as User)
    ).toBe(true);
    expect(
      isEmailAccount({
        uid: "u2",
        isAnonymous: true,
        email: null,
        providerData: [],
      } as User)
    ).toBe(false);
  });

  it("rejects short passwords", async () => {
    const auth = { currentUser: null } as Auth;
    await expect(registerWithEmail(auth, "a@b.c", "123")).rejects.toThrow(
      /at least 6/
    );
  });

  it("links an anonymous session instead of creating a new UID", async () => {
    const current = { uid: "anon-1", isAnonymous: true } as User;
    const auth = { currentUser: current } as Auth;
    const linked = { ...current, reload: vi.fn().mockResolvedValue(undefined) };
    linkWithCredential.mockResolvedValue({ user: linked });

    await registerWithEmail(auth, "a@b.c", "secret1");
    expect(linked.reload).toHaveBeenCalled();

    expect(linkWithCredential).toHaveBeenCalled();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("signs in with email and password", async () => {
    const auth = { currentUser: null } as Auth;
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "u", reload: vi.fn().mockResolvedValue(undefined) },
    });
    await signInWithEmail(auth, "a@b.c", "secret1");
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      "a@b.c",
      "secret1"
    );
  });
});
