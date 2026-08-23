import type { LobbyMember } from "@/lib/lobbies/types";
import type { JoinRequestWithPath, LobbySnapshot } from "../types";

type ActiveLobbyPanelProps = {
  activeLobby: LobbySnapshot | null;
  connectedUid: string | null;
  lobbyMembers: LobbyMember[];
  isLobbyCaptain: boolean;
  captainJoinRequests: JoinRequestWithPath[];
  lobbyActionMessage: string | null;
  lobbyActionError: string | null;
  onCopyInviteCode: () => void;
  onApproveJoinRequest: (request: JoinRequestWithPath) => void;
  onRejectJoinRequest: (request: JoinRequestWithPath) => void;
  onToggleLobbyLock: () => void;
  onDisbandLobby: () => void;
};

export function ActiveLobbyPanel({
  activeLobby,
  connectedUid,
  lobbyMembers,
  isLobbyCaptain,
  captainJoinRequests,
  lobbyActionError,
  lobbyActionMessage,
  onCopyInviteCode,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onToggleLobbyLock,
  onDisbandLobby,
}: ActiveLobbyPanelProps) {
  return (
    <div className="space-y-5 rounded-3xl border border-white/5 bg-[#050b1a]/80 p-6 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Active Lobby
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {activeLobby ? "Share your invite code" : "No lobby joined"}
          </h2>
        </div>
        {activeLobby && (
          <button
            type="button"
            onClick={onCopyInviteCode}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Copy Code
          </button>
        )}
      </div>
      {activeLobby ? (
        <>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/10 px-3 py-1">
              Invite:{" "}
              <span
                className="font-semibold text-white"
                data-testid="invite-code"
              >
                {activeLobby.inviteCode}
              </span>
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="lobby-member-count"
            >
              Members {activeLobby.memberIds.length}/{activeLobby.maxMembers}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {activeLobby.isLocked ? "Locked" : "Open"}
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
              Members
            </p>
            <div className="mt-3 space-y-2">
              {lobbyMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/80"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {member.nickname || "Crew Member"}
                    </p>
                    <p className="text-xs text-white/60">
                      {member.role === "CAPTAIN" ? "Captain" : "Crew"}
                      {member.userId === connectedUid ? " · You" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {isLobbyCaptain ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                  Join Requests
                </p>
                <span className="text-xs text-white/60">
                  {captainJoinRequests.length} open
                </span>
              </div>
              {captainJoinRequests.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/70">
                  No pending requests yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {captainJoinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {request.nickname}
                          </p>
                          <p className="text-xs text-white/60">
                            Team {request.requestedTeam} · {request.status}
                          </p>
                        </div>
                        {request.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              data-testid="approve-join"
                              onClick={() => onApproveJoinRequest(request)}
                              className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-[#041218] hover:bg-emerald-300/90"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectJoinRequest(request)}
                              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/40"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
                            {request.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onToggleLobbyLock}
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
                >
                  {activeLobby.isLocked ? "Unlock Lobby" : "Lock Lobby"}
                </button>
                <button
                  type="button"
                  onClick={onDisbandLobby}
                  className="rounded-full bg-red-500/80 px-5 py-2 text-sm font-semibold text-white hover:bg-red-400/90"
                >
                  Disband Lobby
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/80">
              Waiting for the captain to advance the lobby. Share the code with
              your squad.
            </p>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-4 text-sm text-white/70">
          Create a lobby or join one by invite code to see real-time roster
          updates here.
        </div>
      )}
      {lobbyActionMessage && (
        <p className="text-sm text-emerald-300">{lobbyActionMessage}</p>
      )}
      {lobbyActionError && (
        <p className="text-sm text-red-300">{lobbyActionError}</p>
      )}
    </div>
  );
}
