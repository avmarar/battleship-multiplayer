"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { CommandShell } from "@/components/layout/CommandShell";
import { ShipTray } from "@/components/placement/ShipTray";
import { MatchSummaryCard } from "@/components/scoreboard/MatchSummaryCard";
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
import { buildMatchSummary } from "@/lib/leaderboard/summary";
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
  const [myTeamDoc, setMyTeamDoc] = useState<GameTeamDocument | null>(null);
  const [enemyTeamDoc, setEnemyTeamDoc] = useState<GameTeamDocument | null>(null);
  const [lockState, setLockState] = useState<LockUiState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEndedOverlay, setShowEndedOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const skipClickRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const hoverRef = useRef<GridCoordinate | null>(null);
  const shipsRef = useRef<PlacedShip[]>([]);
  const lockedRef = useRef(false);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const uid = auth.uid;
  const db = auth.db;
  usePresence({
    db,
    uid,
    gameId,
    accountType: auth.isAnonymous ? "guest" : "registered",
  });
  const fleetReady = isFleetComplete(ships);
  const isEnded = game?.status === "ENDED";
  const locked = lockState === "locked";
  const canLock = isTeamCaptain(game, myTeam, uid);
  const unplaced = unplacedTypes(ships);
  const selectedShip = ships.find((ship) => ship.id === selectedId) ?? null;

  dragRef.current = drag;
  hoverRef.current = hoverOrigin;
  shipsRef.current = ships;
  lockedRef.current = locked;

  // Dismiss ended game and unlock clean placement workspace
  const handleDismissEndedGame = () => {
    try {
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
    } catch {
      // ignore
    }
    setGameId(null);
    setGame(null);
    setMyTeam(null);
    setMyTeamDoc(null);
    setEnemyTeamDoc(null);
    setMatchState("idle");
    setShips([]);
    setLockState("idle");
    setShowEndedOverlay(false);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("gameId");
    window.history.replaceState(null, "", currentUrl.toString());
  };

  // Close ended result modal on Escape key
  useEffect(() => {
    if (!isEnded || !showEndedOverlay) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismissEndedGame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnded, showEndedOverlay]);

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
        if (active.status === "BATTLE") {
          router.replace(`/game?gameId=${active.id}`);
          return;
        }
        if (active.status === "ENDED") {
          setGameId(active.id);
          setMatchState("matched");
          setShowEndedOverlay(true);
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
        if (data.status === "BATTLE") {
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
        } else if (data.status === "ENDED") {
          setShowEndedOverlay(true);
        }
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, gameId, uid, router]);

  // If game has ended, subscribe to team documents to compute summary immediately
  useEffect(() => {
    if (!db || !gameId || !myTeam || game?.status !== "ENDED") {
      return;
    }
    const enemy = opponentTeam(myTeam);
    const unsubMine = onSnapshot(
      doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, myTeam),
      (snapshot) => {
        if (snapshot.exists()) {
          setMyTeamDoc(snapshot.data() as GameTeamDocument);
        }
      }
    );
    const unsubEnemy = onSnapshot(
      doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, enemy),
      (snapshot) => {
        if (snapshot.exists()) {
          setEnemyTeamDoc(snapshot.data() as GameTeamDocument);
        }
      }
    );
    return () => {
      unsubMine();
      unsubEnemy();
    };
  }, [db, gameId, myTeam, game?.status]);

  const endedSummary = useMemo(() => {
    if (!game || !myTeam || game.status !== "ENDED") {
      return null;
    }
    return buildMatchSummary(game, myTeam, myTeamDoc, enemyTeamDoc);
  }, [game, myTeam, myTeamDoc, enemyTeamDoc]);

  useEffect(() => {
    if (!db || !gameId || !myTeam || locked || isEnded) {
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
  }, [db, gameId, myTeam, locked, isEnded]);

  useEffect(() => {
    if (!db || !gameId || !myTeam || locked || isEnded || applyingRemoteRef.current) {
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
  }, [db, gameId, myTeam, ships, locked, isEnded]);

  useEffect(() => {
    if (!drag) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      setDrag((current) =>
        current
          ? {
            ...current,
            x: event.clientX,
            y: event.clientY,
          }
          : null
      );
    };

    const handleUp = () => {
      const activeDrag = dragRef.current;
      const origin = hoverRef.current;
      if (activeDrag && origin) {
        const placed = buildPlacedShip(
          activeDrag.type,
          origin,
          activeDrag.orientation,
          shipsRef.current,
          activeDrag.type
        );
        if (placed) {
          setShips((existing) => [
            ...existing.filter((ship) => ship.id !== activeDrag.type),
            placed,
          ]);
          setSelectedId(placed.id);
          setOrientation(placed.orientation);
          setErrorMessage(null);
        } else {
          setErrorMessage(
            "Invalid placement. Ships cannot overlap or leave the grid."
          );
        }
      }
      setDrag(null);
      setHoverOrigin(null);
      window.setTimeout(() => {
        skipClickRef.current = false;
      }, 50);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag]);

  const startDrag = (
    type: ShipType,
    event: ReactPointerEvent<Element>
  ) => {
    if (locked || isEnded) {
      return;
    }
    skipClickRef.current = true;
    const existing = ships.find((ship) => ship.id === type);
    const useOrientation = existing?.orientation ?? orientation;
    setSelectedId(type);
    setOrientation(useOrientation);
    setDrag({
      type,
      orientation: useOrientation,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (locked || isEnded) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const cell = target?.closest<HTMLButtonElement>("[data-coordinate]");
    const coordinate = cell?.dataset.coordinate;
    if (!coordinate || !isGridCoordinate(coordinate)) {
      return;
    }
    const ship = shipAtCoordinate(ships, coordinate);
    if (!ship) {
      return;
    }
    skipClickRef.current = true;
    setSelectedId(ship.id);
    setOrientation(ship.orientation);
    setDrag({
      type: ship.id,
      orientation: ship.orientation,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleRotate = () => {
    if (!selectedShip || locked || isEnded) {
      setOrientation((current) =>
        current === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL"
      );
      return;
    }
    const rotated = rotateShip(selectedShip, ships);
    if (!rotated) {
      setErrorMessage("Cannot rotate ship here. Blocked or out of bounds.");
      return;
    }
    setShips((existing) =>
      existing.map((ship) => (ship.id === rotated.id ? rotated : ship))
    );
    setOrientation(rotated.orientation);
    setErrorMessage(null);
  };

  const handleSelectCell = (coordinate: GridCoordinate) => {
    if (skipClickRef.current || drag || locked || isEnded) {
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
    if (!selectedShip || locked || isEnded) {
      return;
    }
    setShips((existing) => existing.filter((ship) => ship.id !== selectedShip.id));
    setSelectedId(null);
    setErrorMessage(null);
  };

  const handleResetFleet = () => {
    if (locked || isEnded) {
      return;
    }
    setShips([]);
    setSelectedId(null);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  async function startQuickPlay() {
    if (!db || !uid) {
      return;
    }
    try {
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
    } catch {
      // ignore
    }
    setGameId(null);
    setGame(null);
    setMyTeam(null);
    setMyTeamDoc(null);
    setEnemyTeamDoc(null);
    setShips([]);
    setLockState("idle");
    setShowEndedOverlay(false);
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
    if (!fleetReady || locked || (gameId && !canLock) || !uid || isEnded) {
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
              FLEET DEPLOYMENT PROTOCOL · SECTOR ALPHA
            </p>
          </div>
          {myTeam && (
            <span className="rounded-full border border-cyan-400/40 bg-cyan-950/50 px-3.5 py-1 text-xs font-mono font-bold text-cyan-200 shadow-[0_0_10px_rgba(0,242,254,0.2)]">
              ASSIGNED: TEAM {myTeam}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
              Tactical Fleet Blueprint
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Arrange your 5-vessel armada on the grid. Drag hulls or tap to rotate before battle lock.
            </p>
          </div>

          {/* Quick Play Matchmaking CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {matchState === "idle" && (
              <HudButton
                data-testid="placement-quick-play"
                variant="primary"
                onClick={() => void startQuickPlay()}
                className="py-3 px-6 text-sm font-black tracking-wider"
              >
                ⚡ Matchmaking Quick Play
              </HudButton>
            )}

            {matchState === "searching" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-4 py-2 text-xs font-mono text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>SEARCHING RADAR CHANNELS…</span>
                </div>
                <HudButton
                  data-testid="cancel-quick-play"
                  variant="ghost"
                  onClick={() => void handleCancelSearch()}
                  className="text-xs py-2 px-3"
                >
                  Cancel
                </HudButton>
              </div>
            )}

            {matchState === "matched" && (
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/50 px-4 py-2 text-xs font-mono font-bold text-emerald-200 shadow-[0_0_15px_rgba(0,245,160,0.2)]" data-testid="placement-matched">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>LINK ACTIVE · OPPONENT CONNECTED</span>
              </div>
            )}
          </div>
        </div>
      </HudPanel>

      {/* When match has ended and overlay was dismissed, show persistent top banner */}
      {isEnded && endedSummary && !showEndedOverlay && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-hud)] border border-cyan-400/40 bg-cyan-950/60 p-4 shadow-[0_0_20px_rgba(0,242,254,0.25)] animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{endedSummary.didWin ? "🏆" : "💥"}</span>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-cyan-300 font-bold">
                RECENT MATCH CONCLUDED · {endedSummary.didWin ? "VICTORY" : "DEFEAT"}
              </p>
              <p className="text-xs text-white/70">
                Shots: {endedSummary.shotsFired} · Sunk: {endedSummary.shipsSunk} · Lost: {endedSummary.shipsLost}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HudButton
              variant="primary"
              className="text-xs py-2 px-4 font-mono"
              onClick={() => setShowEndedOverlay(true)}
            >
              📊 View Full Summary Popup
            </HudButton>
            <HudButton
              variant="ghost"
              className="text-xs py-2 px-4 font-mono"
              onClick={() => void startQuickPlay()}
            >
              ⚡ Start New Quick Play
            </HudButton>
          </div>
        </div>
      )}

      {/* Opponent Lock Radar Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2 w-2 rounded-full",
              opponentLocked ? "bg-emerald-400" : "bg-cyan-400 animate-pulse",
            ].join(" ")}
          />
          <span className="text-white/80">
            OPPONENT STATUS:{" "}
            <strong className={opponentLocked ? "text-emerald-300" : "text-cyan-300"}>
              {opponentLocked ? "LOCKED & ARMED" : "DEPLOYING FLEET…"}
            </strong>
          </span>
        </div>

        {gameId ? (
          <span className="rounded bg-black/40 px-3 py-1 text-white/60 border border-white/10">
            MATCH CODE: <strong className="text-cyan-300 font-mono">{gameId}</strong>
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
          disabled={locked || isEnded}
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
              disabled={locked || isEnded}
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
            </div>

            {/* Tactical Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <HudButton
                data-testid="rotate-ship"
                disabled={locked || isEnded}
                variant="secondary"
                onClick={handleRotate}
                className="text-xs py-2.5"
              >
                ↻ Rotate ({orientation === "HORIZONTAL" ? "H" : "V"})
              </HudButton>

              <HudButton
                data-testid="return-ship"
                disabled={!selectedShip || locked || isEnded}
                variant="ghost"
                onClick={handleReturnToTray}
                className="text-xs py-2.5"
              >
                ↩ Recall Ship
              </HudButton>
            </div>

            <HudButton
              data-testid="reset-fleet"
              disabled={ships.length === 0 || locked || isEnded}
              variant="ghost"
              fullWidth
              onClick={handleResetFleet}
              className="text-xs py-2"
            >
              Clear All Ships
            </HudButton>

            {/* Captain Lock Button */}
            <div className="pt-2">
              <HudButton
                data-testid="lock-placement"
                fullWidth
                variant={fleetReady && !locked && !isEnded ? "primary" : "ghost"}
                onClick={() => void handleLock()}
                disabled={
                  !fleetReady ||
                  locked ||
                  isEnded ||
                  lockState === "locking" ||
                  (!!gameId && !myTeam) ||
                  (!!gameId && !canLock)
                }
              >
                {lockState === "locking"
                  ? "Locking…"
                  : locked
                    ? "✓ Placement Locked"
                    : isEnded
                      ? "Match Concluded"
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

      {/* Recently Ended Game Result Overlay Popup */}
      {isEnded && showEndedOverlay && mounted && endedSummary && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300"
          data-testid="battle-ended-overlay"
          onClick={handleDismissEndedGame}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Engagement Result"
            className="w-full max-w-2xl animate-in zoom-in-95 duration-300 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(0,242,254,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <MatchSummaryCard
              summary={endedSummary}
              showLeaderboardLink={true}
              onClose={handleDismissEndedGame}
            />
          </div>
        </div>,
        document.body
      )}
    </CommandShell>
  );
}
