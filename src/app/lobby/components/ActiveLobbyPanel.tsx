import {
  bothCaptainsPresent,
  canStartPlacement,
} from "@/lib/lobbies/captains";
import {
  countReadyMembers,
  isMemberReady,
} from "@/lib/lobbies/ready";
import type { LobbyMember, LobbyTeamId } from "@/lib/lobbies/types";
import type { JoinRequestWithPath, LobbySnapshot } from "../types";

type ActiveLobbyPanelProps = {
  activeLobby: LobbySnapshot | null;
  connectedUid: string | null;
  lobbyMembers: LobbyMember[];
  isAlphaCaptain: boolean;
  isTeamCaptain: boolean;
  captainJoinRequests: JoinRequestWithPath[];
  lobbyActionMessage: string | null;
  lobbyActionError: string | null;
  onCopyInviteCode: (team: LobbyTeamId) => void;
  onApproveJoinRequest: (request: JoinRequestWithPath) => void;
  onRejectJoinRequest: (request: JoinRequestWithPath) => void;
  onToggleReady: () => void;
  onStartPlacement: () => void;
  onToggleLobbyLock: () => void;
  onDisbandLobby: () => void;
};

export function ActiveLobbyPanel({
  activeLobby,
  connectedUid,
  lobbyMembers,
  isAlphaCaptain,
  isTeamCaptain,
  captainJoinRequests,
  lobbyActionError,
  lobbyActionMessage,
  onCopyInviteCode,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onToggleReady,
  onStartPlacement,
  onToggleLobbyLock,
  onDisbandLobby,
}: ActiveLobbyPanelProps) {
  const readyTotals = countReadyMembers(lobbyMembers);
  const canAdvanceToPlacement =
    !!activeLobby &&
    isAlphaCaptain &&
    canStartPlacement(activeLobby, lobbyMembers);
  const canToggleReady = activeLobby?.status === "LOBBY" && !!connectedUid;
  const selfIsReady = lobbyMembers.some(
    (member) => member.userId === connectedUid && isMemberReady(member)
  );
  const awaitingBetaCaptain =
    !!activeLobby && !bothCaptainsPresent(activeLobby);

  return (
    <div className="space-y-5 rounded-3xl border border-white/5 bg-[#050b1a]/80 p-6 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Active Lobby
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {activeLobby ? "Share a team invite" : "No lobby joined"}
          </h2>
        </div>
      </div>
      {activeLobby ? (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
              <div className="text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                  Alpha invite
                </p>
                <p
                  className="font-mono text-lg font-semibold text-white"
                  data-testid="invite-code"
                >
                  {activeLobby.inviteCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopyInviteCode("ALPHA")}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Copy Alpha
              </button>
            </div>
            {activeLobby.inviteCodeBeta && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                <div className="text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                    Beta invite
                  </p>
                  <p
                    className="font-mono text-lg font-semibold text-white"
                    data-testid="invite-code-beta"
                  >
                    {activeLobby.inviteCodeBeta}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyInviteCode("BETA")}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
                >
                  Copy Beta
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="lobby-member-count"
            >
              Members {activeLobby.memberIds.length}/{activeLobby.maxMembers}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {activeLobby.isLocked ? "Locked" : "Open"}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="ready-count"
            >
              Ready {readyTotals.ready}/{readyTotals.total}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="lobby-status"
            >
              {activeLobby.status}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="captain-status"
            >
              {awaitingBetaCaptain
                ? "Awaiting Beta captain"
                : "Alpha + Beta captains"}
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
                      {member.team ? ` · ${member.team}` : ""}
                      {member.userId === connectedUid ? " · You" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
                        isMemberReady(member)
                          ? "border border-emerald-400/50 text-emerald-200"
                          : "border border-white/20 text-white/70"
                      }`}
                      data-testid={`member-ready-${member.userId}`}
                    >
                      {isMemberReady(member) ? "Ready" : "Not Ready"}
                    </span>
                    {member.team && (
                      <span
                        className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs uppercase tracking-wide text-cyan-100"
                        data-testid={`member-team-${member.userId}`}
                      >
                        {member.team}
                      </span>
                    )}
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isTeamCaptain ? (
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
                  No pending requests for your team yet.
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
                {canToggleReady && (
                  <button
                    type="button"
                    data-testid="toggle-ready"
                    onClick={onToggleReady}
                    className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
                  >
                    {selfIsReady ? "Set Not Ready" : "Set Ready"}
                  </button>
                )}
                {isAlphaCaptain && (
                  <>
                    <button
                      type="button"
                      data-testid="start-placement"
                      onClick={onStartPlacement}
                      disabled={!canAdvanceToPlacement}
                      className="rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-[#04101b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Start Placement
                    </button>
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
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/80">
                {activeLobby.status === "PLACEMENT"
                  ? "Placement started. Ready states are locked."
                  : awaitingBetaCaptain
                    ? "Waiting for a Beta captain via the Beta invite. Mark ready when your squad is set."
                    : "Mark ready when your squad is set. The Alpha captain can start placement once both captains and everyone else are ready."}
              </p>
              {canToggleReady && (
                <button
                  type="button"
                  data-testid="toggle-ready"
                  onClick={onToggleReady}
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
                >
                  {selfIsReady ? "Set Not Ready" : "Set Ready"}
                </button>
              )}
            </div>
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
