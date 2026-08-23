"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { ShipTray } from "@/components/placement/ShipTray";
import { lockPlacement } from "@/lib/games/lockPlacement";
import {
  cancelQuickPlay,
  joinQuickPlay,
  opponentTeam,
  subscribeToMatchedGame,
  teamForPlayer,
} from "@/lib/games/matchmaking";
import {
  GAMES_COLLECTION,
  type GameDocument,
  type GameTeamId,
} from "@/lib/games/types";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import { FLEET, fleetEntry, type Orientation, type ShipType } from "@/lib/grid/fleet";
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

  const uid = auth.uid;
  const db = auth.db;
  usePresence({ db, uid, gameId });
  const fleetReady = isFleetComplete(ships);
  const locked = lockState === "locked";
  const unplaced = unplacedTypes(ships);
  const selectedShip = ships.find((ship) => ship.id === selectedId) ?? null;

  dragRef.current = drag;
  hoverRef.current = hoverOrigin;
  shipsRef.current = ships;
  lockedRef.current = locked;

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
      const mark = ship.id === selectedId ? "ship-selected" : "ship";
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
          router.push(`/game?gameId=${gameId}`);
        }
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, gameId, uid, router]);

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
    if (!fleetReady || locked) {
      return;
    }
    setLockState("locking");
    setErrorMessage(null);
    try {
      if (db && gameId && myTeam) {
        await lockPlacement(db, gameId, myTeam, ships);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-3 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Placement · Sprint 3
          </p>
          <h1 className="text-3xl font-semibold">Place your fleet</h1>
          <p className="max-w-2xl text-white/70">
            Drag ships onto the grid, press R or Rotate for a 90° snap, then lock
            when all five vessels are legal. Quick Play pairs two clients into one
            match document.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex text-sm font-semibold text-cyan-100">
              ← Back to Hub
            </Link>
            {matchState === "idle" && (
              <button
                type="button"
                data-testid="quick-play"
                onClick={() => void startQuickPlay()}
                className="rounded-full bg-[#00CED1] px-5 py-2 text-sm font-semibold text-[#041218] transition hover:brightness-110 active:scale-90"
              >
                Quick Play
              </button>
            )}
            {matchState === "searching" && (
              <button
                type="button"
                onClick={() => void handleCancelSearch()}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Cancel search
              </button>
            )}
          </div>
          {auth.status === "checking" && (
            <p className="text-sm text-white/60" data-testid="auth-pending">
              Signing in anonymously…
            </p>
          )}
          {auth.status === "connected" && auth.uid ? (
            <p className="font-mono text-xs text-white/60">
              UID <span data-testid="auth-uid">{auth.uid}</span>
            </p>
          ) : null}
          {auth.status === "error" || auth.status === "unavailable" ? (
            <p className="text-sm text-red-300">{auth.message}</p>
          ) : null}
        </header>

        <div
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-50"
          data-testid="match-status"
        >
          Placement Phase: Drag and Rotate Ships.
          {matchState === "searching" ? " Searching for opponent…" : null}
          {matchState === "matched" && myTeam ? ` You are Team ${myTeam}.` : null}
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div
              className="rounded-3xl border border-white/5 bg-white/[0.04] p-4 sm:p-6"
              onPointerDown={handleGridPointerDown}
            >
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-cyan-100">
                Home Grid
              </p>
              <BattleGrid marks={marks} onSelect={handleSelectCell} disabled={locked} />
            </div>
            <div className="rounded-3xl border border-white/5 bg-white/[0.04] p-4 sm:p-6">
              <ShipTray
                unplaced={unplaced}
                selectedType={
                  selectedId && unplaced.includes(selectedId) ? selectedId : null
                }
                orientation={drag?.orientation ?? orientation}
                disabled={locked}
                onSelect={setSelectedId}
                onDragStart={startDrag}
              />
            </div>
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.04] p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                Fleet status
              </p>
              <p className="mt-2 text-2xl font-semibold" data-testid="fleet-count">
                {ships.length}/{FLEET.length} placed
              </p>
              {opponentLocked ? (
                <p
                  className="mt-2 text-sm font-semibold text-[#32CD32]"
                  data-testid="opponent-ready"
                >
                  Opponent Ready
                </p>
              ) : gameId ? (
                <p className="mt-2 text-sm text-white/60">Opponent placing…</p>
              ) : (
                <p className="mt-2 text-sm text-white/60">Sandbox mode</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRotate}
                disabled={locked}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 disabled:opacity-50"
              >
                Rotate
              </button>
              <button
                type="button"
                onClick={handleReturnToTray}
                disabled={locked || !selectedShip}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 disabled:opacity-50"
              >
                Return to tray
              </button>
            </div>

            <button
              type="button"
              data-testid="lock-placement"
              onClick={() => void handleLock()}
              disabled={!fleetReady || locked || lockState === "locking" || (!!gameId && !myTeam)}
              className="w-full rounded-full bg-[#00CED1] px-5 py-3 text-sm font-semibold text-[#041218] transition hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:hover:brightness-100"
            >
              {lockState === "locking"
                ? "Locking…"
                : locked
                  ? "Placement locked"
                  : "Lock Placement"}
            </button>

            {bothLocked && (
              <p
                className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
                data-testid="both-locked"
              >
                Both fleets are locked. Waiting for the battle phase.
              </p>
            )}
            {statusMessage && (
              <p className="text-sm text-emerald-300" data-testid="placement-status">
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-300">{errorMessage}</p>
            )}
          </aside>
        </section>
      </main>

      {drag && draggingShip ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 rounded-xl border border-cyan-300/60 bg-[#0b1220]/90 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-lg"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          {draggingShip.name} · {drag.orientation === "HORIZONTAL" ? "H" : "V"}
        </div>
      ) : null}
    </div>
  );
}
