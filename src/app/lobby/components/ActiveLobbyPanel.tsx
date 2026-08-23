import {
  bothCaptainsSeated,
  canStartMatch,
  isMemberReady,
} from "@/lib/matches/ready";
import type { MatchMember, MatchTeamId } from "@/lib/matches/types";
import type {
  JoinRequestWithPath,
  MatchSnapshot,
  MatchTeamSnapshot,
} from "../types";

type ActiveLobbyPanelProps = {
  activeMatch: MatchSnapshot | null;
  alphaTeam: MatchTeamSnapshot | null;
  betaTeam: MatchTeamSnapshot | null;
  connectedUid: string | null;
  myTeamId: MatchTeamId | null;
  isAlphaCaptain: boolean;
  isTeamCaptain: boolean;
  captainJoinRequests: JoinRequestWithPath[];
  lobbyActionMessage: string | null;
  lobbyActionError: string | null;
  onCopyMatchCode: () => void;
  onCopyCrewInvite: () => void;
  onApproveJoinRequest: (request: JoinRequestWithPath) => void;
  onRejectJoinRequest: (request: JoinRequestWithPath) => void;
  onToggleReady: () => void;
  onStartPlacement: () => void;
  onToggleTeamLock: () => void;
  onDisbandMatch: () => void;
};

function teamMembers(team: MatchTeamSnapshot | null): MatchMember[] {
  if (!team?.members) {
    return [];
  }
  return Object.values(team.members);
}

export function ActiveLobbyPanel({
  activeMatch,
  alphaTeam,
  betaTeam,
  connectedUid,
  myTeamId,
  isAlphaCaptain,
  isTeamCaptain,
  captainJoinRequests,
  lobbyActionError,
  lobbyActionMessage,
  onCopyMatchCode,
  onCopyCrewInvite,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onToggleReady,
  onStartPlacement,
  onToggleTeamLock,
  onDisbandMatch,
}: ActiveLobbyPanelProps) {
  const myTeam =
    myTeamId === "ALPHA" ? alphaTeam : myTeamId === "BETA" ? betaTeam : null;
  const allMembers = [...teamMembers(alphaTeam), ...teamMembers(betaTeam)];
  const readyCount = allMembers.filter(isMemberReady).length;
  const canAdvance =
    !!activeMatch &&
    isAlphaCaptain &&
    canStartMatch(activeMatch, alphaTeam, betaTeam);
  const canToggleReady = activeMatch?.status === "LOBBY" && !!myTeam && !!connectedUid;
  const selfIsReady = allMembers.some(
    (member) => member.userId === connectedUid && isMemberReady(member)
  );
  const awaitingBetaCaptain =
    !!activeMatch && !bothCaptainsSeated(activeMatch);
  const showCrewInvite =
    activeMatch?.mode === "MULTIPLAYER" && isTeamCaptain && !!myTeam?.inviteCode;

  return (
    <div className="space-y-5 rounded-3xl border border-white/5 bg-[#050b1a]/80 p-6 shadow-xl shadow-black/30">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
          Active Match
        </p>
        <h2 className="text-2xl font-semibold text-white">
          {activeMatch ? "Lobby ready" : "No match joined"}
        </h2>
      </div>
      {activeMatch ? (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
              <div className="text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                  Match code
                </p>
                <p
                  className="font-mono text-lg font-semibold text-white"
                  data-testid="match-code"
                >
                  {activeMatch.matchCode}
                </p>
                <p className="text-xs text-white/50">
                  Share with the opposing captain
                </p>
              </div>
              <button
                type="button"
                onClick={onCopyMatchCode}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Copy
              </button>
            </div>
            {showCrewInvite && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                <div className="text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                    Your crew invite ({myTeamId})
                  </p>
                  <p
                    className="font-mono text-lg font-semibold text-white"
                    data-testid="crew-invite-code"
                  >
                    {myTeam?.inviteCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCopyCrewInvite}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="match-mode"
            >
              {activeMatch.mode}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="lobby-member-count"
            >
              Members {activeMatch.memberIds.length}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="ready-count"
            >
              Ready {readyCount}/{allMembers.length}
            </span>
            <span
              className="rounded-full border border-white/10 px-3 py-1"
              data-testid="lobby-status"
            >
              {activeMatch.status}
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
          {(["ALPHA", "BETA"] as const).map((teamId) => {
            const team = teamId === "ALPHA" ? alphaTeam : betaTeam;
            const members = teamMembers(team);
            return (
              <div key={teamId}>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                  {teamId}
                  {team?.isLocked ? " · Locked" : ""}
                  {!team?.captainId ? " · Open seat" : ""}
                </p>
                <div className="mt-3 space-y-2">
                  {members.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-4 py-3 text-sm text-white/60">
                      Waiting for players…
                    </p>
                  ) : (
                    members.map((member) => (
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
                            {` · ${teamId}`}
                            {member.userId === connectedUid ? " · You" : ""}
                          </p>
                        </div>
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
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          {isTeamCaptain && activeMatch.mode === "MULTIPLAYER" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                  Crew Join Requests
                </p>
                <span className="text-xs text-white/60">
                  {captainJoinRequests.length} open
                </span>
              </div>
              {captainJoinRequests.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/70">
                  No pending crew requests yet.
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
                            Team {request.teamId} · {request.status}
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
            </div>
          ) : null}
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
            {isTeamCaptain && activeMatch.mode === "MULTIPLAYER" && (
              <button
                type="button"
                onClick={onToggleTeamLock}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                {myTeam?.isLocked ? "Unlock Team" : "Lock Team"}
              </button>
            )}
            {isAlphaCaptain && (
              <>
                <button
                  type="button"
                  data-testid="start-placement"
                  onClick={onStartPlacement}
                  disabled={!canAdvance}
                  className="rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-[#04101b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Placement
                </button>
                <button
                  type="button"
                  onClick={onDisbandMatch}
                  className="rounded-full bg-red-500/80 px-5 py-2 text-sm font-semibold text-white hover:bg-red-400/90"
                >
                  Disband Match
                </button>
              </>
            )}
          </div>
          {!isAlphaCaptain && activeMatch.status === "LOBBY" && (
            <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/80">
              {awaitingBetaCaptain
                ? "Waiting for the opposing captain via the match code."
                : "Mark ready when set. Only the Alpha host can start placement."}
            </p>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-4 text-sm text-white/70">
          Create a match or join with a code to see the roster here.
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
