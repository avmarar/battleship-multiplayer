import {
  bothCaptainsSeated,
  canStartMatch,
  isMemberReady,
} from "@/lib/matches/ready";
import type { MatchMember, MatchTeamId } from "@/lib/matches/types";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
import { CaptainMark } from "@/components/visual/ShipMark";
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
  canTakeCommand?: boolean;
  onTakeCommand?: () => void;
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
  canTakeCommand = false,
  onTakeCommand,
}: ActiveLobbyPanelProps) {
  const myTeam =
    myTeamId === "ALPHA" ? alphaTeam : myTeamId === "BETA" ? betaTeam : null;
  const allMembers = [...teamMembers(alphaTeam), ...teamMembers(betaTeam)];
  const readyCount = allMembers.filter(isMemberReady).length;
  const canAdvance =
    !!activeMatch &&
    isAlphaCaptain &&
    canStartMatch(activeMatch, alphaTeam, betaTeam);
  const canToggleReady =
    activeMatch?.status === "LOBBY" && !!myTeam && !!connectedUid;
  const selfIsReady = allMembers.some(
    (member) => member.userId === connectedUid && isMemberReady(member)
  );
  const awaitingBetaCaptain =
    !!activeMatch && !bothCaptainsSeated(activeMatch);
  const showCrewInvite =
    activeMatch?.mode === "MULTIPLAYER" && isTeamCaptain && !!myTeam?.inviteCode;

  return (
    <HudPanel corners tone={activeMatch ? "accent" : "default"} className="space-y-6 p-6 sm:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
            SQUADRON STAGING ARENA
          </p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            {activeMatch ? "Active Match Lobby" : "No match joined"}
          </h2>
        </div>
        {activeMatch && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1 text-xs font-mono font-bold text-emerald-300 shadow-[0_0_10px_rgba(0,245,160,0.2)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            SYNCHRONIZED
          </span>
        )}
      </div>

      {activeMatch ? (
        <>
          {/* Match & Crew Codes Cards */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-hud)] border border-cyan-400/40 bg-gradient-to-r from-cyan-950/50 via-[#0a1526]/80 to-cyan-950/30 px-5 py-4 shadow-[0_0_20px_rgba(0,242,254,0.15)]">
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-[0.2em] font-mono text-cyan-300">
                  TACTICAL MATCH CODE
                </p>
                <p
                  className="font-mono text-2xl font-black tracking-[0.25em] text-white drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]"
                  data-testid="match-code"
                >
                  {activeMatch.matchCode}
                </p>
                <p className="text-xs text-white/60">
                  Share this 6-character code with the opposing captain
                </p>
              </div>
              <HudButton variant="primary" onClick={onCopyMatchCode} className="px-5">
                📋 Copy Code
              </HudButton>
            </div>

            {showCrewInvite && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-hud)] border border-white/15 bg-black/35 px-5 py-3.5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-mono text-cyan-200">
                    YOUR CREW INVITE ({myTeamId})
                  </p>
                  <p
                    className="font-mono text-xl font-bold tracking-widest text-white"
                    data-testid="crew-invite-code"
                  >
                    {myTeam?.inviteCode}
                  </p>
                </div>
                <HudButton variant="ghost" onClick={onCopyCrewInvite}>
                  Copy Crew Link
                </HudButton>
              </div>
            )}
          </div>

          {/* Lobby Meta Telemetry */}
          <div className="flex flex-wrap gap-2 text-xs font-mono text-white/80">
            <span
              className="rounded-[var(--radius-hud)] border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 uppercase font-bold text-cyan-200"
              data-testid="match-mode"
            >
              MODE: {activeMatch.mode}
            </span>
            <span
              className="rounded-[var(--radius-hud)] border border-white/15 bg-black/30 px-3 py-1.5 uppercase"
              data-testid="lobby-member-count"
            >
              CREW: {activeMatch.memberIds.length}
            </span>
            <span
              className="rounded-[var(--radius-hud)] border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 uppercase font-bold text-emerald-300"
              data-testid="ready-count"
            >
              READY: {readyCount}/{allMembers.length}
            </span>
            <span
              className="rounded-[var(--radius-hud)] border border-white/15 bg-black/30 px-3 py-1.5 uppercase"
              data-testid="lobby-status"
            >
              STATUS: {activeMatch.status}
            </span>
            <span
              className="rounded-[var(--radius-hud)] border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 uppercase font-bold text-amber-200"
              data-testid="captain-status"
            >
              {awaitingBetaCaptain
                ? "⏳ Awaiting Beta Captain"
                : "✓ Alpha & Beta Seated"}
            </span>
          </div>

          {/* Team Rosters (ALPHA & BETA) */}
          {(["ALPHA", "BETA"] as const).map((teamId) => {
            const team = teamId === "ALPHA" ? alphaTeam : betaTeam;
            const members = teamMembers(team);
            const isAlpha = teamId === "ALPHA";

            return (
              <div key={teamId} className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        isAlpha ? "bg-cyan-400 shadow-[0_0_8px_#00f2fe]" : "bg-rose-500 shadow-[0_0_8px_#ff2e63]",
                      ].join(" ")}
                    />
                    <p className="text-xs uppercase tracking-[0.3em] font-mono font-bold text-white">
                      {isAlpha ? "ALPHA SQUADRON (BLUE FLEET)" : "BETA SQUADRON (CRIMSON FLEET)"}
                      {team?.isLocked ? " · LOCKED" : ""}
                      {!team?.captainId ? " · OPEN CAPTAIN SEAT" : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-white/50">
                    {members.length} {members.length === 1 ? "Commander" : "Commanders"}
                  </span>
                </div>

                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="rounded-[var(--radius-hud)] border border-dashed border-white/15 bg-black/20 px-4 py-3.5 text-center text-sm font-mono text-white/50">
                      Waiting for commanders to join via code…
                    </div>
                  ) : (
                    members.map((member) => {
                      const ready = isMemberReady(member);
                      const isCaptain = member.role === "CAPTAIN";
                      const isMe = member.userId === connectedUid;

                      return (
                        <div
                          key={member.userId}
                          className={[
                            "flex items-center justify-between gap-3 rounded-[var(--radius-hud)] border p-3.5 text-sm transition-all duration-200",
                            isMe
                              ? "border-cyan-400/50 bg-gradient-to-r from-cyan-950/40 to-[#0d1c32]/80 shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                              : "border-white/10 bg-[#091220]/80",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className={[
                                "flex h-10 w-10 items-center justify-center rounded-lg border font-mono font-bold shadow-md",
                                isCaptain
                                  ? "border-amber-400/60 bg-gradient-to-br from-amber-950 to-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                                  : "border-cyan-500/40 bg-gradient-to-br from-[#101e35] to-black text-cyan-200",
                              ].join(" ")}
                            >
                              {(member.nickname || "C").slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="flex items-center gap-1.5 font-bold text-white">
                                {member.nickname || "Crew Member"}
                                {isCaptain ? <CaptainMark /> : null}
                                {isMe && (
                                  <span className="rounded bg-cyan-950 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300 border border-cyan-400/30">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-white/60">
                                {isCaptain ? "Fleet Captain" : "Squadron Crew"}
                                {` · Team ${teamId}`}
                              </p>
                            </div>
                          </div>

                          <span
                            className={[
                              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider",
                              ready
                                ? "border-emerald-400/50 bg-emerald-950/50 text-emerald-200 shadow-[0_0_10px_rgba(0,245,160,0.3)]"
                                : "border-white/15 bg-black/40 text-white/60",
                            ].join(" ")}
                            data-testid={`member-ready-${member.userId}`}
                          >
                            <span
                              aria-hidden
                              className={[
                                "h-2 w-2 rounded-full",
                                ready
                                  ? "bg-emerald-400 shadow-[0_0_8px_#00f5a0]"
                                  : "bg-white/30",
                              ].join(" ")}
                            />
                            <span>{ready ? "Ready" : "Not Ready"}</span>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Captain Join Requests Approval Drawer */}
          {isTeamCaptain && activeMatch.mode === "MULTIPLAYER" ? (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                  CREW JOIN REQUESTS
                </p>
                <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-400/30">
                  {captainJoinRequests.length} pending
                </span>
              </div>
              {captainJoinRequests.length === 0 ? (
                <p className="rounded-[var(--radius-hud)] border border-white/10 bg-black/20 px-4 py-3 text-xs font-mono text-white/60">
                  No pending crew requests yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {captainJoinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-[var(--radius-hud)] border border-cyan-500/30 bg-black/40 px-4 py-3 text-sm text-white/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">
                            {request.nickname}
                          </p>
                          <p className="text-xs font-mono text-white/60">
                            Squadron {request.teamId} · {request.status}
                          </p>
                        </div>
                        {request.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <HudButton
                              data-testid="approve-join"
                              onClick={() => onApproveJoinRequest(request)}
                              className="px-4 text-xs"
                            >
                              ✓ Approve
                            </HudButton>
                            <HudButton
                              variant="ghost"
                              onClick={() => onRejectJoinRequest(request)}
                              className="px-4 text-xs"
                            >
                              ✕ Reject
                            </HudButton>
                          </div>
                        ) : (
                          <span className="rounded-[var(--radius-hud)] border border-white/20 px-3 py-1 text-xs uppercase font-mono tracking-wide text-white/70">
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

          {/* Action Command Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {canTakeCommand && onTakeCommand && (
              <HudButton
                data-testid="take-command"
                variant="gold"
                onClick={onTakeCommand}
              >
                ★ Assume Captain Command
              </HudButton>
            )}
            {canToggleReady && (
              <HudButton
                data-testid="toggle-ready"
                variant={selfIsReady ? "ghost" : "primary"}
                onClick={onToggleReady}
              >
                {selfIsReady ? "✕ Set Not Ready" : "✓ Mark Ready"}
              </HudButton>
            )}
            {isTeamCaptain && activeMatch.mode === "MULTIPLAYER" && (
              <HudButton variant="secondary" onClick={onToggleTeamLock}>
                {myTeam?.isLocked ? "🔓 Unlock Team" : "🔒 Lock Team Roster"}
              </HudButton>
            )}
            {isAlphaCaptain && (
              <>
                <HudButton
                  data-testid="start-placement"
                  onClick={onStartPlacement}
                  disabled={!canAdvance}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black"
                >
                  🚀 Launch Placement Phase
                </HudButton>
                <HudButton
                  data-testid="disband-match"
                  variant="danger"
                  onClick={onDisbandMatch}
                >
                  Disband Match
                </HudButton>
              </>
            )}
          </div>

          {!isAlphaCaptain && activeMatch.status === "LOBBY" && (
            <div className="rounded-[var(--radius-hud)] border border-cyan-400/20 bg-cyan-950/30 px-4 py-3 text-xs font-mono text-cyan-200">
              {awaitingBetaCaptain
                ? "Waiting for the opposing commander to seat via match code."
                : "Toggle ready when prepared. Only Alpha Fleet Captain can initiate deployment."}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-[var(--radius-hud)] border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-white/60">
          Create a match or join with a 6-character code to view the squadron roster.
        </div>
      )}

      {lobbyActionMessage && (
        <p className="text-sm font-mono text-emerald-300">{lobbyActionMessage}</p>
      )}
      {lobbyActionError && (
        <p className="text-sm font-mono text-rose-300">{lobbyActionError}</p>
      )}
    </HudPanel>
  );
}
