import type { FormEvent } from "react";

type ProfileFormCardProps = {
  uid: string | null;
  nickname: string;
  statusMessage: string;
  onNicknameChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
  saveState: "idle" | "saving" | "success" | "error";
  lastSavedAt: Date | null;
  errorMessage: string | null;
};

export function ProfileFormCard({
  uid,
  nickname,
  statusMessage,
  onNicknameChange,
  onStatusChange,
  onSubmit,
  canSubmit,
  saveState,
  lastSavedAt,
  errorMessage,
}: ProfileFormCardProps) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#040a1c]/80 p-6 shadow-xl shadow-black/40">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">
            Call sign
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Configure your session identity
          </h2>
          {uid ? (
            <p className="font-mono text-xs text-white/60">
              UID{" "}
              <span data-testid="auth-uid">{uid}</span>
            </p>
          ) : (
            <p className="text-xs text-white/50" data-testid="auth-pending">
              Signing in anonymously…
            </p>
          )}
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/70">Nickname *</span>
          <input
            type="text"
            name="nickname"
            data-testid="profile-nickname"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="e.g. Captain Aurora"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/70">Status Message</span>
          <textarea
            value={statusMessage}
            onChange={(event) => onStatusChange(event.target.value)}
            rows={4}
            className="resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            data-testid="profile-save"
            disabled={!canSubmit || saveState === "saving"}
            className="inline-flex items-center rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-6 py-2 font-semibold text-[#04101b] outline-none transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "success"
                ? "Saved!"
                : "Update Profile"}
          </button>
          {lastSavedAt && (
            <span className="text-xs text-white/60" data-testid="profile-saved">
              Last saved {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        {errorMessage && (
          <p className="text-sm text-red-300">{errorMessage}</p>
        )}
      </form>
    </section>
  );
}
