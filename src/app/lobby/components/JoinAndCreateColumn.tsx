import type { FormEvent } from "react";
import type { JoinRequestWithPath } from "../types";

type JoinAndCreateColumnProps = {
  createLobbyState: "idle" | "creating";
  createLobbyError: string | null;
  canCreateLobby: boolean;
  onCreateLobby: () => void;
  joinCodeInput: string;
  onJoinCodeChange: (value: string) => void;
  joinFlowState: "idle" | "submitting";
  joinFlowMessage: string | null;
  joinFlowError: string | null;
  canJoinLobby: boolean;
  onJoinLobby: (event: FormEvent<HTMLFormElement>) => void;
  pendingJoinRequest: JoinRequestWithPath | null;
  onCancelJoinRequest: () => void;
};

export function JoinAndCreateColumn({
  createLobbyState,
  createLobbyError,
  canCreateLobby,
  onCreateLobby,
  joinCodeInput,
  onJoinCodeChange,
  joinFlowState,
  joinFlowMessage,
  joinFlowError,
  canJoinLobby,
  onJoinLobby,
  pendingJoinRequest,
  onCancelJoinRequest,
}: JoinAndCreateColumnProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/5 bg-white/3 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
          Captain Tools
        </p>
        <h3 className="text-2xl font-semibold text-white">Create a new lobby</h3>
        <p className="text-sm text-white/70">
          Generates an Alpha invite and a Beta invite. Share the code for the
          team you want them on.
        </p>
        <button
          type="button"
          data-testid="create-lobby"
          onClick={onCreateLobby}
          disabled={createLobbyState === "creating" || !canCreateLobby}
          className="mt-4 inline-flex items-center rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-[#04101b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createLobbyState === "creating" ? "Generating…" : "Start Lobby"}
        </button>
        {createLobbyError && (
          <p className="mt-3 text-sm text-red-300">{createLobbyError}</p>
        )}
      </div>

      <form
        onSubmit={onJoinLobby}
        className="space-y-4 rounded-3xl border border-white/5 bg-white/3 p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Join by Code
          </p>
          <h3 className="text-2xl font-semibold text-white">Enter invite code</h3>
          <p className="mt-1 text-sm text-white/70">
            The captain assigned this code to a team. You do not pick a side.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Invite Code
          <input
            type="text"
            name="inviteCode"
            data-testid="join-code-input"
            value={joinCodeInput}
            onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
            placeholder="e.g. Z3K9QJ"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            maxLength={6}
            disabled={joinFlowState === "submitting" || !canJoinLobby}
          />
        </label>
        <button
          type="submit"
          data-testid="join-lobby"
          disabled={joinFlowState === "submitting" || !canJoinLobby}
          className="inline-flex items-center rounded-full bg-linear-to-r from-emerald-400 to-blue-500 px-5 py-2 text-sm font-semibold text-[#06121c] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joinFlowState === "submitting" ? "Submitting…" : "Join Lobby"}
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
            Lobby ID:{" "}
            <span className="font-mono text-white">
              {pendingJoinRequest.lobbyId}
            </span>
          </p>
          <p className="text-white/60">
            Assigned Team: {pendingJoinRequest.requestedTeam}
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
