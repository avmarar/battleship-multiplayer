import type { FormEvent } from "react";
import { LOBBY_TEAM_OPTIONS } from "@/lib/lobbies/types";
import type { JoinRequestWithPath } from "../types";

type JoinAndCreateColumnProps = {
  createLobbyState: "idle" | "creating";
  createLobbyError: string | null;
  canCreateLobby: boolean;
  onCreateLobby: () => void;
  joinCodeInput: string;
  onJoinCodeChange: (value: string) => void;
  joinTeam: (typeof LOBBY_TEAM_OPTIONS)[number];
  onJoinTeamChange: (team: (typeof LOBBY_TEAM_OPTIONS)[number]) => void;
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
  joinTeam,
  onJoinTeamChange,
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
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
          Captain Tools
        </p>
        <h3 className="text-2xl font-semibold text-white">Create a new lobby</h3>
        <p className="text-sm text-white/70">
          Auto-generates a secure invite code and assigns you as the captain.
        </p>
        <button
          type="button"
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
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
            Join by Code
          </p>
          <h3 className="text-2xl font-semibold text-white">Enter invite code</h3>
        </div>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Invite Code
          <input
            type="text"
            value={joinCodeInput}
            onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
            placeholder="e.g. Z3K9QJ"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            maxLength={6}
            disabled={joinFlowState === "submitting" || !canJoinLobby}
          />
        </label>
        <div>
          <p className="text-sm text-white/70">Preferred Team</p>
          <div className="mt-2 flex gap-3">
            {LOBBY_TEAM_OPTIONS.map((team) => (
              <label
                key={team}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                  joinTeam === team
                    ? "border-cyan-400 text-white"
                    : "border-white/20 text-white/60"
                }`}
              >
                <input
                  type="radio"
                  name="team"
                  value={team}
                  className="hidden"
                  checked={joinTeam === team}
                  onChange={() => onJoinTeamChange(team)}
                />
                {team}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
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
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
            Join Request Status
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
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
            Preferred Team: {pendingJoinRequest.requestedTeam}
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
