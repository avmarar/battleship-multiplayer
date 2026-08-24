"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { CommandShell } from "@/components/layout/CommandShell";
import { ShipTray } from "@/components/placement/ShipTray";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
import { ShipMark } from "@/components/visual/ShipMark";
import { isTeamCaptain } from "@/lib/games/captain";
import { lockPlacement } from "@/lib/games/lockPlacement";
import { saveDraftFleet } from "@/lib/games/saveDraftFleet";
import {
  cancelQuickPlay,
  joinQuickPlay,
  opponentTeam,
  subscribeToMatchedGame,
  teamForPlayer,
} from "@/lib/games/matchmaking";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameDocument,
  type GameTeamDocument,
  type GameTeamId,
} from "@/lib/games/types";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import { findActiveGame } from "@/lib/presence/findActiveGame";
import { FLEET, fleetEntry, type Orientation, type ShipType } from "@/lib/grid/fleet";
import { draftSignature, fromLockedPayload } from "@/lib/grid/draft";
import {
  buildPlacedShip,
  isFleetComplete,
  projectShip,
  rotateShip,
  shipAtCoordinate,
  unplacedTypes,
  type PlacedShip,
} from "@/lib/grid/placement";
import { isGridCoordinate, type GridCoordinate } from "@/lib/grid/coordinates";
import { usePresence } from "@/lib/presence/usePresence";

type PlacementWorkspaceProps = {
  autoQuickPlay?: boolean;
  initialGameId?: string | null;
};

type DragState = {
  type: ShipType;
  orientation: Orientation;
  x: number;
  y: number;
};

type MatchState = "idle" | "searching" | "matched";
type LockUiState = "idle" | "locking" | "locked" | "error";

const ACTIVE_GAME_STORAGE_KEY = "battleship_active_game_id";

export function PlacementWorkspace({
  autoQuickPlay = false,
  initialGameId = null,
}: PlacementWorkspaceProps) {
  const router = useRouter();
  const auth = useAnonymousAuth();
  const [ships, setShips] = useState<PlacedShip[]>([]);
  const [selectedId, setSelectedId] = useState<ShipType | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("HORIZONTAL");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverOrigin, setHoverOrigin] = useState<GridCoordinate | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(
    initialGameId ? "matched" : "idle"
  );
  const [gameId, setGameId] = useState<string | null>(initialGameId);
  const [game, setGame] = useState<GameDocument | null>(null);
  const [myTeam, setMyTeam] = useState<GameTeamId | null>(null);
  const [lockState, setLockState] = useState<LockUiState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const skipClickRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const hoverRef = useRef<GridCoordinate | null>(null);
  const shipsRef = useRef<PlacedShip[]>([]);
  const lockedRef = useRef(false);
  const applyingRemoteRef = useRef(false);

  const uid = auth.uid;
  const db = auth.db;
  usePresence({
    db,
    uid,
    gameId,
    accountType: auth.isAnonymous ? "guest" : "registered",
  });
  const fleetReady = isFleetComplete(ships);
  const locked = lockState === "locked";
  const canLock = isTeamCaptain(game, myTeam, uid);
  const unplaced = unplacedTypes(ships);
  const selectedShip = ships.find((ship) => ship.id === selectedId) ?? null;

  dragRef.current = drag;
  hoverRef.current = hoverOrigin;
  shipsRef.current = ships;
  lockedRef.current = locked;

  // Persist matched game ID and update browser URL so page refreshes never drop into Sandbox mode
  useEffect(() => {
    if (!gameId || typeof window === "undefined") {
      return;
    }
    try {
      sessionStorage.setItem(ACTIVE_GAME_STORAGE_KEY, gameId);
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get("gameId") !== gameId) {
        currentUrl.searchParams.set("gameId", gameId);
        currentUrl.searchParams.delete("quickPlay");
        window.history.replaceState(null, "", currentUrl.toString());
      }
    } catch {
      // Storage unavailable or blocked
    }
  }, [gameId]);

  // Reconnect / recover active game on refresh or initial connect
  useEffect(() => {
    if (gameId || !db || !uid) {
      return;
    }

    let isMounted = true;

    // 1. Try session storage first
    try {
      const storedId = sessionStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
      if (storedId) {
        setGameId(storedId);
        setMatchState("matched");
        return;
      }
    } catch {
      // ignore
    }

    // 2. Query active match from Firestore
    void findActiveGame(db, uid)
      .then((active) => {
        if (!isMounted || !active) {
          return;
        }
        if (active.status === "BATTLE" || active.status === "ENDED") {
          router.replace(`/game?gameId=${active.id}`);
          return;
        }
        if (active.status === "PLACEMENT") {
          setGameId(active.id);
          setMatchState("matched");
          setStatusMessage("Active match restored. Place your fleet.");
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [db, uid, gameId, router]);

  const preview = useMemo(() => {
    if (!drag || !hoverOrigin) {
      return null;
    }
    const { size } = fleetEntry(drag.type);
    const coordinates = projectShip(hoverOrigin, drag.orientation, size);
    const valid = coordinates
      ? !!buildPlacedShip(
        drag.type,
        hoverOrigin,
        drag.orientation,
        ships,
        drag.type
      )
      : false;
    return { coordinates, valid };
  }, [drag, hoverOrigin, ships]);

  const marks = useMemo(() => {
    const next: Partial<Record<GridCoordinate, CellMark>> = {};
    for (const ship of ships) {
      if (drag && ship.id === drag.type) {
        continue;
      }
      const mark: CellMark = ship.id === selectedId ? "ship-selected" : "ship";
      for (const coordinate of ship.coordinates) {
        next[coordinate] = mark;
      }
    }
    if (preview?.coordinates) {
      const mark = preview.valid ? "preview-valid" : "preview-invalid";
      for (const coordinate of preview.coordinates) {
        next[coordinate] = mark;
      }
    }
    return next;
  }, [drag, preview, selectedId, ships]);

  const opponentLocked =
    !!game && !!myTeam && game.placement[opponentTeam(myTeam)].isLocked;
  const bothLocked =
    !!game &&
    game.placement.ALPHA.isLocked &&
    game.placement.BETA.isLocked;

  useEffect(() => {
    if (!autoQuickPlay || !uid || !db || gameId || matchState !== "idle") {
      return;
    }
    void startQuickPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuickPlay, uid, db]);

  useEffect(() => {
    if (matchState !== "searching" || !db || !uid) {
      return;
    }
    return subscribeToMatchedGame(db, uid, (matchedId) => {
      setGameId(matchedId);
      setMatchState("matched");
      setStatusMessage("Opponent found. Place your fleet.");
    });
  }, [db, matchState, uid]);

  useEffect(() => {
    if (!db || !gameId || !uid) {
      return;
    }
    return onSnapshot(
      doc(db, GAMES_COLLECTION, gameId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMessage("Match was closed.");
          try {
            sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
          } catch {
            // ignore
          }
          return;
        }
        const data = snapshot.data() as GameDocument;
        setGame(data);
        const team = teamForPlayer(data, uid);
        setMyTeam(team);
        if (team && data.placement[team].isLocked) {
          setLockState("locked");
        }
        if (data.status === "BATTLE" || data.status === "ENDED") {
          try {
            sessionStorage.setItem(ACTIVE_GAME_STORAGE_KEY, gameId);
          } catch {
            // ignore
          }
          router.replace(`/game?gameId=${gameId}`);
          window.setTimeout(() => {
            if (typeof window !== "undefined" && window.location.pathname !== "/game") {
              window.location.assign(`/game?gameId=${gameId}`);
            }
          }, 300);
        }
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, gameId, uid, router]);

  useEffect(() => {
    if (!db || !gameId || !myTeam || locked) {
      return;
    }
    return onSnapshot(
      doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, myTeam),
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }
        const team = snapshot.data() as GameTeamDocument;
        const remote = fromLockedPayload(team.ships ?? []);
        if (dragRef.current) {
          return;
        }
        if (draftSignature(remote) === draftSignature(shipsRef.current)) {
          return;
        }
        applyingRemoteRef.current = true;
        setShips(remote);
      }
    );
  }, [db, gameId, myTeam, locked]);

  useEffect(() => {
    if (!db || !gameId || !myTeam || locked || applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (ships.length === 0 || dragRef.current) {
      return;
    }
    const handle = window.setTimeout(() => {
      void saveDraftFleet(db, gameId, myTeam, ships).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [db, gameId, myTeam, ships, locked]);

  useEffect(() => {
    if (!drag) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      setDrag((current) =>
        current
          ? { ...current, x: event.clientX, y: event.clientY }
          : current
      );
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const coordinate = target
        ?.closest("[data-coordinate]")
        ?.getAttribute("data-coordinate");
      setHoverOrigin(
        coordinate && isGridCoordinate(coordinate) ? coordinate : null
      );
    };

    const handleUp = () => {
      skipClickRef.current = true;
      window.setTimeout(() => {
        skipClickRef.current = false;
      }, 0);
      dropDrag();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    // Listeners attach once per drag gesture; position updates must not rebind.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleRotate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, selectedShip, ships, locked]);

  const startDrag = (
    type: ShipType,
    event: ReactPointerEvent,
    nextOrientation = orientation
  ) => {
    if (locked) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(type);
    setDrag({
      type,
      orientation: nextOrientation,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const dropDrag = () => {
    const currentDrag = dragRef.current;
    const origin = hoverRef.current;
    const currentShips = shipsRef.current;
    setDrag(null);
    setHoverOrigin(null);

    if (!currentDrag || !origin || lockedRef.current) {
      return;
    }

    const placed = buildPlacedShip(
      currentDrag.type,
      origin,
      currentDrag.orientation,
      currentShips,
      currentDrag.type
    );
    if (!placed) {
      setErrorMessage(
        "Invalid placement. Ships cannot overlap or leave the grid."
      );
      return;
    }

    setShips((existing) => [
      ...existing.filter((ship) => ship.id !== placed.id),
      placed,
    ]);
    setSelectedId(placed.id);
    setOrientation(currentDrag.orientation);
    setErrorMessage(null);
  };

  const handleRotate = () => {
    if (locked) {
      return;
    }
    if (drag) {
      setDrag((current) =>
        current
          ? {
            ...current,
            orientation:
              current.orientation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL",
          }
          : current
      );
      setOrientation((current) =>
        current === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL"
      );
      return;
    }
    if (!selectedShip) {
      setOrientation((current) =>
        current === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL"
      );
      return;
    }
    const rotated = rotateShip(selectedShip, ships);
    if (!rotated) {
      setErrorMessage("Cannot rotate this ship in its current position.");
      return;
    }
    setShips((currentShips) =>
      currentShips.map((ship) => (ship.id === rotated.id ? rotated : ship))
    );
    setOrientation(rotated.orientation);
    setErrorMessage(null);
  };

  const handleSelectCell = (coordinate: GridCoordinate) => {
    if (skipClickRef.current || drag || locked) {
      return;
    }
    const occupant = shipAtCoordinate(ships, coordinate);
    if (occupant) {
      setSelectedId(occupant.id);
      setOrientation(occupant.orientation);
      return;
    }

    if (selectedId && unplaced.includes(selectedId)) {
      const placed = buildPlacedShip(
        selectedId,
        coordinate,
        orientation,
        ships
      );
      if (!placed) {
        setErrorMessage(
          "Invalid placement. Ships cannot overlap or leave the grid."
        );
        return;
      }
      setShips((existing) => [...existing, placed]);
      setSelectedId(placed.id);
      setErrorMessage(null);
      return;
    }

    setSelectedId(null);
  };

  const handleReturnToTray = () => {
    if (!selectedShip || locked) {
      return;
    }
    setShips((current) => current.filter((ship) => ship.id !== selectedShip.id));
    setSelectedId(null);
  };

  const handleGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (locked) {
      return;
    }
    const coordinate = (event.target as HTMLElement)
      .closest("[data-coordinate]")
      ?.getAttribute("data-coordinate");
    if (!coordinate || !isGridCoordinate(coordinate)) {
      return;
    }
    const occupant = shipAtCoordinate(ships, coordinate);
    if (!occupant) {
      return;
    }
    startDrag(occupant.type, event, occupant.orientation);
  };

  async function startQuickPlay() {
    if (!db || !uid) {
      setErrorMessage("Connect to Firebase before Quick Play.");
      return;
    }
    setErrorMessage(null);
    setMatchState("searching");
    setStatusMessage("Searching for an opponent…");
    try {
      const result = await joinQuickPlay(db, uid);
      if (result.status === "matched") {
        setGameId(result.gameId);
        setMatchState("matched");
        setStatusMessage("Opponent found. Place your fleet.");
      } else {
        setStatusMessage("Waiting in queue…");
      }
    } catch (error) {
      setMatchState("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Quick Play failed."
      );
    }
  }

  async function handleCancelSearch() {
    if (!db || !uid) {
      return;
    }
    await cancelQuickPlay(db, uid);
    setMatchState("idle");
    setStatusMessage(null);
  }

  async function handleLock() {
    if (!fleetReady || locked || (gameId && !canLock) || !uid) {
      return;
    }
    setLockState("locking");
    setErrorMessage(null);
    try {
      if (db && gameId && myTeam) {
        await lockPlacement(db, gameId, myTeam, ships, uid);
      }
      setLockState("locked");
      setStatusMessage(
        gameId
          ? "Fleet locked. Waiting for opponent."
          : "Sandbox lock complete. Use Quick Play to sync with an opponent."
      );
    } catch (error) {
      setLockState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to lock placement."
      );
    }
  }

  const draggingShip = drag ? fleetEntry(drag.type) : null;
  const overlayShips = ships.filter((ship) => !(drag && ship.id === drag.type));

  return (
    <CommandShell variant="placement">
      {/* Header Banner */}
      <HudPanel corners tone="accent" className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
              DEPLOYMENT PHASE · BLUEPRINT DRAFT
            </p>
          </div>
        </div>

        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
            Place your armada
          </h1>
          <p className="text-sm text-white/75 leading-relaxed">
            Drag vessels from the armory dock onto your home grid. Crew members can adjust placement collaboratively before the team captain locks the fleet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {matchState === "idle" && (
            <HudButton
              data-testid="quick-play"
              onClick={() => void startQuickPlay()}
            >
              ⚡ Quick Play
            </HudButton>
          )}
          {matchState === "searching" && (
            <HudButton variant="ghost" onClick={() => void handleCancelSearch()}>
              Cancel search
            </HudButton>
          )}
        </div>

        {auth.status === "checking" && (
          <p className="text-sm text-white/60" data-testid="auth-pending">
            Signing in anonymously…
          </p>
        )}
        {auth.status === "error" || auth.status === "unavailable" ? (
          <p className="text-sm text-red-300">{auth.message}</p>
        ) : null}
      </HudPanel>

      {/* Match Status Banner */}
      <div
        className="flex items-center justify-between rounded-[var(--radius-hud)] border border-cyan-400/30 bg-gradient-to-r from-cyan-950/40 via-[#071324]/90 to-cyan-950/30 px-5 py-3.5 text-sm font-medium text-cyan-100 shadow-[0_0_20px_rgba(0,242,254,0.1)]"
        data-testid="match-status"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
          <span>
            Placement Phase: Drag and Rotate Ships.
            {matchState === "searching" ? " Searching for opponent…" : null}
            {matchState === "matched" && myTeam ? ` You are Team ${myTeam}.` : null}
          </span>
        </div>
        {gameId ? (
          <span className="font-mono text-xs text-white/50">
            SESSION: {gameId.slice(0, 8)}…
          </span>
        ) : (
          <span className="font-mono text-xs text-amber-300/80">SANDBOX MODE</span>
        )}
      </div>

      {/* Full-Width Armada Dock */}
      <HudPanel corners className="p-5 sm:p-6 w-full">
        <ShipTray
          unplaced={unplaced}
          selectedType={
            selectedId && unplaced.includes(selectedId) ? selectedId : null
          }
          orientation={drag?.orientation ?? orientation}
          disabled={locked}
          draggingType={drag?.type ?? null}
          onSelect={setSelectedId}
          onDragStart={startDrag}
        />
      </HudPanel>

      {/* Main Placement Arena */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Left: Home Sector Grid */}
        <HudPanel
          corners
          className="p-5 sm:p-7"
          onPointerDown={handleGridPointerDown}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
              HOME SECTOR DEFENSE GRID (10x10)
            </p>
            <span className="text-[11px] font-mono text-white/50">
              CLICK CELL OR DRAG VESSEL
            </span>
          </div>

          <div className="relative overflow-hidden rounded-lg">
            <BattleGrid
              marks={marks}
              ships={overlayShips}
              selectedShipId={selectedId}
              onSelect={handleSelectCell}
              disabled={locked}
            />
          </div>
        </HudPanel>

        {/* Right: Fleet Telemetry & Controls */}
        <div className="space-y-5">
          <HudPanel corners className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                FLEET READINESS
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-2xl font-black text-white font-mono" data-testid="fleet-count">
                  {ships.length}/{FLEET.length} placed
                </p>
                <span className="text-xs font-mono text-cyan-300">
                  {Math.round((ships.length / FLEET.length) * 100)}% COMPLETE
                </span>
              </div>

              {/* Progress visual bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_#00f2fe] transition-all duration-300"
                  style={{ width: `${(ships.length / FLEET.length) * 100}%` }}
                />
              </div>

              {opponentLocked ? (
                <div className="mt-3.5 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00f5a0]" />
                  <span data-testid="opponent-ready">Opponent Ready</span>
                </div>
              ) : gameId ? (
                <p className="mt-3 text-xs font-mono text-white/60">Opponent placing…</p>
              ) : (
                <p className="mt-3 text-xs font-mono text-white/60">Sandbox mode</p>
              )}
            </div>
          </HudPanel>
          <HudPanel corners className="space-y-5 p-6">
            {/* Controls */}
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                VESSEL MANEUVERS
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <HudButton
                  variant="secondary"
                  data-testid="rotate-button"
                  onClick={handleRotate}
                  disabled={locked}
                  className="text-xs"
                >
                  ↻ ROTATE (R)
                </HudButton>
                <HudButton
                  variant="ghost"
                  data-testid="return-tray-button"
                  onClick={handleReturnToTray}
                  disabled={locked || !selectedShip}
                  className="text-xs"
                >
                  ↩ RETURN TO TRAY
                </HudButton>
              </div>
            </div>

            {/* Captain Lock Button */}
            <div className="pt-2">
              <HudButton
                data-testid="lock-placement"
                fullWidth
                variant={fleetReady && !locked ? "primary" : "ghost"}
                onClick={() => void handleLock()}
                disabled={
                  !fleetReady ||
                  locked ||
                  lockState === "locking" ||
                  (!!gameId && !myTeam) ||
                  (!!gameId && !canLock)
                }
              >
                {lockState === "locking"
                  ? "Locking…"
                  : locked
                    ? "✓ Placement Locked"
                    : gameId && !canLock
                      ? "Waiting for Captain"
                      : "🔒 Lock Placement"}
              </HudButton>
            </div>

            {(bothLocked || game?.status === "BATTLE") && (
              <div
                className="space-y-3 rounded-[var(--radius-hud)] border border-emerald-400/50 bg-emerald-950/50 p-4 text-xs font-semibold text-emerald-200 shadow-[0_0_20px_rgba(0,245,160,0.3)] animate-pulse"
                data-testid="both-locked"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#00f5a0]" />
                  <span>Both fleets locked! Tactical battle commencing…</span>
                </div>
                {gameId && (
                  <Link
                    href={`/game?gameId=${gameId}`}
                    className="inline-flex w-full min-h-[40px] items-center justify-center rounded-[var(--radius-hud)] bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_15px_rgba(0,245,160,0.5)] transition hover:brightness-110 active:scale-95"
                  >
                    ⚡ Enter Fire Control Room →
                  </Link>
                )}
              </div>
            )}
            {statusMessage && (
              <p className="text-xs font-mono text-emerald-300" data-testid="placement-status">
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-xs font-mono text-rose-300">{errorMessage}</p>
            )}
          </HudPanel>
        </div>
      </section>

      {auth.status === "connected" && auth.uid ? (
        <p className="font-mono text-[10px] text-white/30">
          COMMANDER UID: <span data-testid="auth-uid">{auth.uid}</span>
        </p>
      ) : null}

      {/* Dragging Ghost Pip */}
      {drag && draggingShip ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 rounded-[var(--radius-hud)] border border-cyan-300/80 bg-[#060e1c]/95 p-3 text-xs font-bold text-cyan-100 shadow-[0_0_25px_rgba(0,242,254,0.5)] backdrop-blur-md"
          style={{ left: drag.x + 16, top: drag.y + 16 }}
        >
          <ShipMark
            type={drag.type}
            orientation={drag.orientation}
            lifting
            size="sm"
          />
          <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-wider text-cyan-200">
            {draggingShip.name} · {drag.orientation === "HORIZONTAL" ? "H" : "V"}
          </span>
        </div>
      ) : null}
    </CommandShell>
  );
}
