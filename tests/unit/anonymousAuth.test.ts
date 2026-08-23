import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";

const { onAuthStateChanged, signInAnonymously } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged,
  signInAnonymously,
}));

import { subscribeToAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";

describe("subscribeToAnonymousAuth (AUTH-1.3)", () => {
  beforeEach(() => {
    onAuthStateChanged.mockReset();
    signInAnonymously.mockReset();
  });

  it("populates uid when a user is already signed in", () => {
    const user = { uid: "existing-uid" } as User;
    const auth = { currentUser: user } as Auth;
    const onChange = vi.fn();

    onAuthStateChanged.mockImplementation((_auth, next) => {
      next(user);
      return vi.fn();
    });

    subscribeToAnonymousAuth(auth, onChange);

    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({
      status: "connected",
      uid: "existing-uid",
    });
  });

  it("signs in anonymously and reports the new uid", async () => {
    const user = { uid: "anon-123" } as User;
    const auth = { currentUser: null } as Auth;
    const onChange = vi.fn();
    let emitUser: ((next: User | null) => void) | undefined;

    onAuthStateChanged.mockImplementation((_auth, next) => {
      emitUser = next;
      next(null);
      return vi.fn();
    });
    signInAnonymously.mockResolvedValue({ user });

    subscribeToAnonymousAuth(auth, onChange);

    expect(signInAnonymously).toHaveBeenCalledWith(auth);
    expect(onChange).toHaveBeenCalledWith({ status: "checking" });

    emitUser?.(user);

    expect(onChange).toHaveBeenCalledWith({
      status: "connected",
      uid: "anon-123",
    });
  });

  it("reports an error when anonymous sign-in fails", async () => {
    const auth = { currentUser: null } as Auth;
    const onChange = vi.fn();

    onAuthStateChanged.mockImplementation(() => vi.fn());
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
