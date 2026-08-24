import type { FormEvent } from "react";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";

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
    <HudPanel corners className="p-6 sm:p-7">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
              COMMANDER PROFILE · CALL SIGN
            </p>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            Session Identity
          </h2>
          {uid ? (
            <p className="font-mono text-xs text-white/50">
              AUTHENTICATED UID: <span data-testid="auth-uid" className="text-cyan-300 font-bold">{uid}</span>
            </p>
          ) : (
            <p className="text-xs text-white/50 font-mono" data-testid="auth-pending">
              Signing in anonymously…
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-200">
            COMMANDER CALL SIGN *
          </span>
          <input
            type="text"
            name="nickname"
            data-testid="profile-nickname"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="Guest name is assigned automatically"
            className="min-h-[46px] rounded-[var(--radius-hud)] border border-cyan-500/30 bg-black/40 px-4 py-3 text-white outline-none transition-all focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] placeholder:text-sm placeholder:text-white/30 font-semibold"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-200">
            TACTICAL BROADCAST / STATUS MESSAGE
          </span>
          <textarea
            value={statusMessage}
            onChange={(event) => onStatusChange(event.target.value)}
            rows={3}
            className="resize-none rounded-[var(--radius-hud)] border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.2)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <HudButton
            type="submit"
            data-testid="profile-save"
            disabled={!canSubmit || saveState === "saving"}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "success"
                ? "✓ Profile Updated!"
                : "💾 Update Profile"}
          </HudButton>
          {lastSavedAt && (
            <span className="text-xs font-mono text-white/60" data-testid="profile-saved">
              Last saved {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        {errorMessage && (
          <p className="text-xs font-mono text-rose-300">{errorMessage}</p>
        )}
      </form>
    </HudPanel>
  );
}
