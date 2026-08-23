import type { FormEvent } from "react";
import type { MatchMode } from "@/lib/matches/types";
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
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/5 bg-white/3 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
          Host a match
        </p>
        <h3 className="text-2xl font-semibold text-white">Create lobby</h3>
        <p className="text-sm text-white/70">
          You become Alpha captain and get a match code for the opposing
          captain. Multiplayer also gives each captain a crew invite.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="mode-1v1"
            onClick={() => onModeChange("1v1")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "1v1"
                ? "bg-cyan-400 text-[#04101b]"
                : "border border-white/20 text-white hover:border-white/40"
            }`}
          >
            1v1
          </button>
          <button
            type="button"
            data-testid="mode-multiplayer"
            onClick={() => onModeChange("MULTIPLAYER")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "MULTIPLAYER"
                ? "bg-cyan-400 text-[#04101b]"
                : "border border-white/20 text-white hover:border-white/40"
            }`}
          >
            Multiplayer
          </button>
        </div>
        <button
          type="button"
          data-testid="create-lobby"
          onClick={onCreateMatch}
          disabled={createMatchState === "creating" || !canCreateMatch}
          className="mt-4 inline-flex items-center rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-[#04101b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMatchState === "creating" ? "Generating…" : "Create Match"}
        </button>
        {createMatchError && (
          <p className="mt-3 text-sm text-red-300">{createMatchError}</p>
        )}
      </div>

      <form
        onSubmit={onJoinMatch}
        className="space-y-4 rounded-3xl border border-white/5 bg-white/3 p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Join
          </p>
          <h3 className="text-2xl font-semibold text-white">Enter a code</h3>
          <p className="mt-1 text-sm text-white/70">
            Match code seats you as Beta captain (no approval). Crew invite
            codes go to that team&apos;s captain for approval.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Code
          <input
            type="text"
            name="inviteCode"
            data-testid="join-code-input"
            value={joinCodeInput}
            onChange={(event) =>
              onJoinCodeChange(event.target.value.toUpperCase())
            }
            placeholder="e.g. Z3K9QJ"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            maxLength={6}
            disabled={joinFlowState === "submitting" || !canJoinMatch}
          />
        </label>
        <button
          type="submit"
          data-testid="join-lobby"
          disabled={joinFlowState === "submitting" || !canJoinMatch}
          className="inline-flex items-center rounded-full bg-linear-to-r from-emerald-400 to-blue-500 px-5 py-2 text-sm font-semibold text-[#06121c] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joinFlowState === "submitting" ? "Submitting…" : "Join"}
        </button>
        {joinFlowMessage && (
          <p className="text-sm text-emerald-300">{joinFlowMessage}</p>
        )}
        {joinFlowError && (
          <p className="text-sm text-red-300">{joinFlowError}</p>
        )}
      </form>

      {pendingJoinRequest && (
        <div className="rounded-3xl border border-white/5 bg-white/3 p-6 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Join Request Status
          </p>
          <p
            className="mt-2 text-2xl font-semibold text-white"
            data-testid="join-request-status"
          >
            {pendingJoinRequest.status}
          </p>
          <p className="text-white/60">
            Invite Code:{" "}
            <span className="font-mono text-white">
              {pendingJoinRequest.inviteCode ?? "—"}
            </span>
          </p>
          <p className="text-white/60">
            Team: {pendingJoinRequest.teamId}
          </p>
          {pendingJoinRequest.status === "PENDING" && (
            <button
              type="button"
              onClick={onCancelJoinRequest}
              className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/40"
            >
              Cancel Request
            </button>
          )}
        </div>
      )}
    </div>
  );
}
