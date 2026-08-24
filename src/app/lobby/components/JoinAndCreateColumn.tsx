import type { FormEvent } from "react";
import type { MatchMode } from "@/lib/matches/types";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
import type { JoinRequestWithPath } from "../types";

type JoinAndCreateColumnProps = {
  mode: MatchMode;
  onModeChange: (mode: MatchMode) => void;
  createMatchState: "idle" | "creating";
  createMatchError: string | null;
  canCreateMatch: boolean;
  onCreateMatch: () => void;
  joinCodeInput: string;
  onJoinCodeChange: (value: string) => void;
  joinFlowState: "idle" | "submitting";
  joinFlowMessage: string | null;
  joinFlowError: string | null;
  canJoinMatch: boolean;
  onJoinMatch: (event: FormEvent<HTMLFormElement>) => void;
  pendingJoinRequest: JoinRequestWithPath | null;
  onCancelJoinRequest: () => void;
};

export function JoinAndCreateColumn({
  mode,
  onModeChange,
  createMatchState,
  createMatchError,
  canCreateMatch,
  onCreateMatch,
  joinCodeInput,
  onJoinCodeChange,
  joinFlowState,
  joinFlowMessage,
  joinFlowError,
  canJoinMatch,
  onJoinMatch,
  pendingJoinRequest,
  onCancelJoinRequest,
}: JoinAndCreateColumnProps) {
  return (
    <div className="space-y-6">
      {/* Create Match Card */}
      <HudPanel corners tone="accent" className="p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
            HOST MATCH COMMAND
          </p>
        </div>
        <h3 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-white">
          Create Lobby
        </h3>
        <p className="mt-2 text-xs text-white/70 leading-relaxed">
          You become Alpha fleet captain and generate a 6-character match code for the opposing commander.
        </p>

        {/* Mode Selector */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            data-testid="mode-1v1"
            onClick={() => onModeChange("1v1")}
            className={[
              "flex-1 rounded-[var(--radius-hud)] border py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150",
              mode === "1v1"
                ? "border-cyan-300 bg-cyan-950/60 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                : "border-white/15 bg-black/30 text-white/60 hover:border-cyan-500/40 hover:text-white",
            ].join(" ")}
          >
            ⚡ 1v1 Duel
          </button>
          <button
            type="button"
            data-testid="mode-multiplayer"
            onClick={() => onModeChange("MULTIPLAYER")}
            className={[
              "flex-1 rounded-[var(--radius-hud)] border py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150",
              mode === "MULTIPLAYER"
                ? "border-cyan-300 bg-cyan-950/60 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                : "border-white/15 bg-black/30 text-white/60 hover:border-cyan-500/40 hover:text-white",
            ].join(" ")}
          >
            👥 Multiplayer
          </button>
        </div>

        <div className="mt-4">
          <HudButton
            data-testid="create-lobby"
            fullWidth
            onClick={onCreateMatch}
            disabled={createMatchState === "creating" || !canCreateMatch}
          >
            {createMatchState === "creating" ? "Initializing Hub…" : "🚀 Initialize Match Lobby"}
          </HudButton>
        </div>
        {createMatchError && (
          <p className="mt-3 text-xs font-mono text-rose-300">{createMatchError}</p>
        )}
      </HudPanel>

      {/* Join Match Form Card */}
      <HudPanel corners className="p-6">
        <form onSubmit={onJoinMatch} className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                JOIN VIA CODE
              </p>
            </div>
            <h3 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-white">
              Enter Code
            </h3>
            <p className="mt-1 text-xs text-white/70">
              Enter a match code to seat as Beta captain, or a crew invite code to join an existing squadron.
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-200">
              6-CHARACTER TACTICAL CODE
            </span>
            <input
              type="text"
              name="inviteCode"
              data-testid="join-code-input"
              value={joinCodeInput}
              onChange={(event) =>
                onJoinCodeChange(event.target.value.toUpperCase())
              }
              placeholder="e.g. Z3K9QJ"
              className="min-h-[48px] rounded-[var(--radius-hud)] border border-cyan-500/30 bg-black/40 px-4 py-3 font-mono text-xl font-bold uppercase tracking-[0.25em] text-white outline-none transition-all focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,242,254,0.3)] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-white/30"
              maxLength={6}
              disabled={joinFlowState === "submitting" || !canJoinMatch}
            />
          </label>

          <HudButton
            type="submit"
            data-testid="join-lobby"
            fullWidth
            disabled={joinFlowState === "submitting" || !canJoinMatch}
          >
            {joinFlowState === "submitting" ? "Connecting to Sector…" : "📡 Connect & Join"}
          </HudButton>

          {joinFlowMessage && (
            <p className="text-xs font-mono text-emerald-300">{joinFlowMessage}</p>
          )}
          {joinFlowError && (
            <p className="text-xs font-mono text-rose-300">{joinFlowError}</p>
          )}
        </form>
      </HudPanel>

      {/* Pending Join Request Status */}
      {pendingJoinRequest && (
        <HudPanel corners className="p-6 text-sm text-white/80 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
            PENDING CREW AUTHORIZATION
          </p>
          <div className="flex items-baseline justify-between">
            <p
              className="text-2xl font-black font-mono uppercase tracking-wider text-white"
              data-testid="join-request-status"
            >
              {pendingJoinRequest.status}
            </p>
            <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-400/30">
              Team {pendingJoinRequest.teamId}
            </span>
          </div>
          <p className="text-xs font-mono text-white/60">
            Invite Code:{" "}
            <span className="font-mono font-bold text-white">
              {pendingJoinRequest.inviteCode ?? "—"}
            </span>
          </p>
          {pendingJoinRequest.status === "PENDING" && (
            <HudButton
              variant="ghost"
              onClick={onCancelJoinRequest}
              className="w-full text-xs"
            >
              ✕ Cancel Join Request
            </HudButton>
          )}
        </HudPanel>
      )}
    </div>
  );
}
