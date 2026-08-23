import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";

const { onIdTokenChanged, signInAnonymously } = vi.hoisted(() => ({
  onIdTokenChanged: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onIdTokenChanged,
  signInAnonymously,
}));

import { subscribeToAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";

describe("subscribeToAnonymousAuth (AUTH-1.3)", () => {
  beforeEach(() => {
    onIdTokenChanged.mockReset();
    signInAnonymously.mockReset();
  });

  it("populates uid when a user is already signed in", () => {
    const user = { uid: "existing-uid" } as User;
    const auth = {
      currentUser: user,
      authStateReady: () => Promise.resolve(),
    } as Auth;
    const onChange = vi.fn();

    onIdTokenChanged.mockImplementation((_auth, next) => {
      next(user);
      return vi.fn();
    });

    subscribeToAnonymousAuth(auth, onChange);

    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({
      status: "connected",
      uid: "existing-uid",
      email: null,
      isAnonymous: true,
    });
  });

  it("reports a linked email account as persistent", () => {
    const user = {
      uid: "linked-uid",
      email: "captain@example.test",
      isAnonymous: false,
    } as User;
    const auth = {
      currentUser: user,
      authStateReady: () => Promise.resolve(),
    } as Auth;
    const onChange = vi.fn();

    onIdTokenChanged.mockImplementation((_auth, next) => {
      next(user);
      return vi.fn();
    });

    subscribeToAnonymousAuth(auth, onChange);

    expect(onChange).toHaveBeenCalledWith({
      status: "connected",
      uid: "linked-uid",
      email: "captain@example.test",
      isAnonymous: false,
    });
  });

  it("signs in anonymously and reports the new uid", async () => {
    const user = { uid: "anon-123" } as User;
    const auth = {
      currentUser: null,
      authStateReady: () => Promise.resolve(),
    } as Auth;
    const onChange = vi.fn();
    let emitUser: ((next: User | null) => void) | undefined;

    onIdTokenChanged.mockImplementation((_auth, next) => {
      emitUser = next;
      next(null);
      return vi.fn();
    });
    signInAnonymously.mockResolvedValue({ user });

    subscribeToAnonymousAuth(auth, onChange);

    await vi.waitFor(() => {
      expect(signInAnonymously).toHaveBeenCalledWith(auth);
    });
    expect(onChange).toHaveBeenCalledWith({ status: "checking" });

    emitUser?.(user);

    expect(onChange).toHaveBeenCalledWith({
      status: "connected",
      uid: "anon-123",
      email: null,
      isAnonymous: true,
    });
  });

  it("reports an error when anonymous sign-in fails", async () => {
    const auth = {
      currentUser: null,
      authStateReady: () => Promise.resolve(),
    } as Auth;
    const onChange = vi.fn();

    onIdTokenChanged.mockImplementation((_auth, next) => {
      next(null);
      return vi.fn();
    });
    signInAnonymously.mockRejectedValue(new Error("auth/network-request-failed"));

    subscribeToAnonymousAuth(auth, onChange);
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        status: "error",
        message: "auth/network-request-failed",
      });
    });
  });
});
