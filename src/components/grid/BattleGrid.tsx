"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  clampGridIndex,
  coordinateFromIndices,
  GRID_COLUMNS,
  GRID_ROWS,
  GRID_SIZE,
  indicesFromCoordinate,
  type GridCoordinate,
} from "@/lib/grid/coordinates";
import type { PlacedShip } from "@/lib/grid/placement";
import { ShipSilhouette } from "@/components/visual/ShipMark";

export type CellMark =
  | "ship"
  | "ship-selected"
  | "preview-valid"
  | "preview-invalid"
  | "hit"
  | "miss"
  | "sunk";

export type BattleGridProps = {
  selectedCoordinate?: GridCoordinate | null;
  marks?: Partial<Record<GridCoordinate, CellMark>>;
  onSelect?: (coordinate: GridCoordinate) => void;
  disabled?: boolean;
  labelledBy?: string;
  ships?: PlacedShip[];
  selectedShipId?: string | null;
  sunkShipIds?: string[];
};

export function BattleGrid({
  selectedCoordinate = null,
  marks,
  onSelect,
  disabled = false,
  labelledBy,
  ships = [],
  selectedShipId = null,
  sunkShipIds = [],
}: BattleGridProps) {
  const labelId = useId();
  const cellRefs = useRef(new Map<GridCoordinate, HTMLButtonElement>());
  const [hoveredCoordinate, setHoveredCoordinate] =
    useState<GridCoordinate | null>(null);
  const [focusCoordinate, setFocusCoordinate] = useState<GridCoordinate>(
    selectedCoordinate ?? "A1"
  );

  const focusCell = useCallback((coordinate: GridCoordinate) => {
    setFocusCoordinate(coordinate);
    cellRefs.current.get(coordinate)?.focus();
  }, []);

  const handleSelect = useCallback(
    (coordinate: GridCoordinate) => {
      if (disabled) {
        return;
      }
      onSelect?.(coordinate);
    },
    [disabled, onSelect]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, coordinate: GridCoordinate) => {
      const indices = indicesFromCoordinate(coordinate);
      if (!indices) {
        return;
      }

      let nextCol = indices.col;
      let nextRow = indices.row;

      switch (event.key) {
        case "ArrowRight":
          nextCol += 1;
          break;
        case "ArrowLeft":
          nextCol -= 1;
          break;
        case "ArrowDown":
          nextRow += 1;
          break;
        case "ArrowUp":
          nextRow -= 1;
          break;
        case "Home":
          nextCol = 0;
          if (event.ctrlKey || event.metaKey) {
            nextRow = 0;
          }
          break;
        case "End":
          nextCol = GRID_SIZE - 1;
          if (event.ctrlKey || event.metaKey) {
            nextRow = GRID_SIZE - 1;
          }
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleSelect(coordinate);
          return;
        default:
          return;
      }

      event.preventDefault();
      const next = coordinateFromIndices(
        clampGridIndex(nextCol),
        clampGridIndex(nextRow)
      );
      focusCell(next);
    },
    [focusCell, handleSelect]
  );

  return (
    <div
      className="w-full overflow-x-auto select-none"
      role="group"
      aria-labelledby={labelledBy ?? labelId}
    >
      {!labelledBy && (
        <p id={labelId} className="sr-only">
          Battleship grid, columns A through J, rows 1 through 10
        </p>
      )}

      <div className="mx-auto w-max max-w-full rounded-[var(--radius-hud)] border border-cyan-500/30 bg-[#060e1c]/95 p-4 shadow-[0_0_35px_rgba(0,206,209,0.12),inset_0_0_50px_rgba(0,242,254,0.05)] backdrop-blur-xl">
        {/* Top Header: Spacer (w-7) + Column Letters (A-J) */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-7 shrink-0" aria-hidden />
          <div className="grid flex-1 grid-cols-10 gap-1.5">
            {GRID_COLUMNS.map((column) => (
              <span
                key={column}
                className="flex h-7 items-center justify-center font-mono text-xs font-bold tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_6px_rgba(0,242,254,0.5)]"
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        {/* Grid Body Area: Numbers on Left + 10x10 Interactive Cells + Precise Ship Overlay */}
        <div className="relative flex flex-col gap-1.5">
          {/* Row Containers */}
          {GRID_ROWS.map((rowLabel, rowIdx) => (
            <div key={rowLabel} className="flex items-center gap-1.5">
              <span className="flex w-7 shrink-0 items-center justify-center font-mono text-xs font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(0,242,254,0.5)]">
                {rowLabel}
              </span>

              <div className="grid flex-1 grid-cols-10 gap-1.5">
                {GRID_COLUMNS.map((_, colIdx) => {
                  const coordinate = coordinateFromIndices(colIdx, rowIdx);
                  const mark = marks?.[coordinate];
                  const isSelected = selectedCoordinate === coordinate;
                  const isHovered = hoveredCoordinate === coordinate && !mark;
                  const tabIndex = focusCoordinate === coordinate ? 0 : -1;
                  const showCrosshair = isSelected && !mark;

                  return (
                    <button
                      key={coordinate}
                      type="button"
                      data-coordinate={coordinate}
                      ref={(node) => {
                        if (node) {
                          cellRefs.current.set(coordinate, node);
                        } else {
                          cellRefs.current.delete(coordinate);
                        }
                      }}
                      tabIndex={disabled ? -1 : tabIndex}
                      disabled={disabled}
                      aria-label={`Cell ${coordinate}`}
                      aria-pressed={isSelected || mark === "ship-selected"}
                      onMouseEnter={() => setHoveredCoordinate(coordinate)}
                      onMouseLeave={() => setHoveredCoordinate(null)}
                      onFocus={() => {
                        setFocusCoordinate(coordinate);
                        setHoveredCoordinate(coordinate);
                      }}
                      onBlur={() => setHoveredCoordinate(null)}
                      onClick={() => handleSelect(coordinate)}
                      onKeyDown={(event) => handleKeyDown(event, coordinate)}
                      className={[
                        "relative aspect-square min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] rounded-lg border transition-all duration-150",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#00CED1]",
                        "active:scale-95 disabled:cursor-not-allowed",
                        cellSurfaceClass(mark, isSelected, isHovered),
                      ].join(" ")}
                    >
                      {/* Miss Marker: Neon X */}
                      {mark === "miss" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-black text-[#FF4500] drop-shadow-[0_0_8px_rgba(255,69,0,0.8)]"
                        >
                          ×
                        </span>
                      )}

                      {/* Hit Marker: Glowing Beacon */}
                      {mark === "hit" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F5A0] shadow-[0_0_12px_#00f5a0,0_0_20px_#00ced1]"
                        />
                      )}

                      {/* Sunk Marker: Crimson Skull / Flare */}
                      {mark === "sunk" && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF2E63] shadow-[0_0_14px_#ff2e63,0_0_24px_#ff4500]"
                        />
                      )}

                      {/* Crosshair Targeting Reticle */}
                      {showCrosshair && (
                        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="absolute h-7 w-7 rounded-full border border-dashed border-cyan-300 animate-[spin_6s_linear_infinite]" />
                          <span className="absolute top-1.5 bottom-1.5 left-1/2 w-px bg-cyan-300 shadow-[0_0_6px_#00f2fe]" />
                          <span className="absolute right-1.5 left-1.5 top-1/2 h-px bg-cyan-300 shadow-[0_0_6px_#00f2fe]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_6px_#00f2fe]" />
                        </span>
                      )}

                      <span className="sr-only">{coordinate}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ship Overlay Layer: Perfectly mapped to the 10x10 cell zone */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 left-[calc(1.75rem+0.375rem)] grid grid-cols-10 grid-rows-10 gap-1.5"
          >
            {ships.map((ship) => {
              const indices = ship.coordinates
                .map((coordinate) => indicesFromCoordinate(coordinate))
                .filter((value): value is { col: number; row: number } => !!value);
              if (indices.length === 0) {
                return null;
              }
              const cols = indices.map((item) => item.col);
              const rows = indices.map((item) => item.row);
              const minCol = Math.min(...cols);
              const maxCol = Math.max(...cols);
              const minRow = Math.min(...rows);
              const maxRow = Math.max(...rows);
              const isSelected = ship.id === selectedShipId;
              const isSunk = sunkShipIds.includes(ship.id);
              const isVertical = ship.orientation === "VERTICAL";

              return (
                <div
                  key={ship.id}
                  className={[
                    "relative flex items-center justify-center overflow-hidden transition-all duration-200",
                    isSunk
                      ? "drop-shadow-[0_0_15px_rgba(255,46,99,0.8)] brightness-75 contrast-125"
                      : isSelected
                        ? "drop-shadow-[0_0_20px_rgba(0,242,254,0.9)]"
                        : "drop-shadow-[0_0_12px_rgba(0,206,209,0.5)]",
                  ].join(" ")}
                  style={{
                    gridColumn: `${minCol + 1} / ${maxCol + 2}`,
                    gridRow: `${minRow + 1} / ${maxRow + 2}`,
                    padding: isVertical ? "4px 6px" : "6px 4px",
                  }}
                >
                  <ShipSilhouette
                    type={ship.type}
                    orientation={ship.orientation}
                    selected={isSelected}
                    sunk={isSunk}
                    className="h-full w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function cellSurfaceClass(
  mark: CellMark | undefined,
  isSelected: boolean,
  isHovered: boolean
) {
  if (mark === "sunk") {
    return "border-rose-500 bg-gradient-to-br from-rose-950 to-[#28050e] shadow-[0_0_16px_rgba(255,46,99,0.5)] anim-hit-burst";
  }
  if (mark === "hit") {
    return "border-emerald-400 bg-gradient-to-br from-emerald-950 to-[#052814] shadow-[0_0_16px_rgba(0,245,160,0.5)] anim-hit-burst";
  }
  if (mark === "miss") {
    return "border-orange-500/80 bg-orange-950/40 shadow-[0_0_12px_rgba(255,69,0,0.35)] anim-miss-ripple";
  }
  if (mark === "preview-invalid") {
    return "border-rose-500 bg-rose-500/30 shadow-[0_0_16px_rgba(255,46,99,0.5)]";
  }
  if (mark === "preview-valid") {
    return "border-cyan-400 bg-cyan-400/30 shadow-[0_0_16px_rgba(0,242,254,0.5)]";
  }
  if (mark === "ship-selected") {
    return "border-cyan-300 bg-gradient-to-br from-cyan-950/90 via-[#0e2440] to-cyan-950/80 shadow-[0_0_18px_rgba(0,242,254,0.5),inset_0_0_10px_rgba(0,242,254,0.25)]";
  }
  if (mark === "ship") {
    return "border-cyan-500/50 bg-gradient-to-br from-[#0c182c] to-[#071120] shadow-[inset_0_0_10px_rgba(0,206,209,0.15)]";
  }
  if (isSelected) {
    return "border-cyan-300 bg-cyan-400/25 shadow-[0_0_18px_rgba(0,242,254,0.55),inset_0_0_10px_rgba(0,242,254,0.3)]";
  }
  if (isHovered) {
    return "border-cyan-300/80 bg-sky-400/20 shadow-[0_0_12px_rgba(0,206,209,0.35)]";
  }
  return "border-white/10 bg-[#091222]/90 hover:border-cyan-400/50 hover:bg-sky-500/10";
}
