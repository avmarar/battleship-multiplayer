"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
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

export type BattleGridProps = {
  selectedCoordinate?: GridCoordinate | null;
  onSelect?: (coordinate: GridCoordinate) => void;
  disabled?: boolean;
  labelledBy?: string;
};

export function BattleGrid({
  selectedCoordinate = null,
  onSelect,
  disabled = false,
  labelledBy,
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
      className="w-full overflow-x-auto"
      role="group"
      aria-labelledby={labelledBy ?? labelId}
    >
      {!labelledBy && (
        <p id={labelId} className="sr-only">
          Battleship grid, columns A through J, rows 1 through 10
        </p>
      )}
      <div
        className="mx-auto grid w-max min-w-full max-w-xl gap-px rounded-2xl border border-white/10 bg-[#0b1220] p-2 shadow-[inset_0_0_40px_rgba(0,206,209,0.08)]"
        style={{
          gridTemplateColumns: `1.75rem repeat(${GRID_SIZE}, minmax(2.75rem, 1fr))`,
        }}
      >
        <span aria-hidden className="h-7" />
        {GRID_COLUMNS.map((column) => (
          <span
            key={column}
            className="flex h-7 items-center justify-center text-xs font-semibold tracking-[0.2em] text-cyan-200/80"
          >
            {column}
          </span>
        ))}

        {GRID_ROWS.map((rowLabel, row) => (
          <RowCells
            key={rowLabel}
            row={row}
            rowLabel={rowLabel}
            selectedCoordinate={selectedCoordinate}
            hoveredCoordinate={hoveredCoordinate}
            focusCoordinate={focusCoordinate}
            disabled={disabled}
            cellRefs={cellRefs}
            onHover={setHoveredCoordinate}
            onFocusCell={setFocusCoordinate}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
    </div>
  );
}

type RowCellsProps = {
  row: number;
  rowLabel: number;
  selectedCoordinate: GridCoordinate | null;
  hoveredCoordinate: GridCoordinate | null;
  focusCoordinate: GridCoordinate;
  disabled: boolean;
  cellRefs: MutableRefObject<Map<GridCoordinate, HTMLButtonElement>>;
  onHover: (coordinate: GridCoordinate | null) => void;
  onFocusCell: (coordinate: GridCoordinate) => void;
  onSelect: (coordinate: GridCoordinate) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    coordinate: GridCoordinate
  ) => void;
};

function RowCells({
  row,
  rowLabel,
  selectedCoordinate,
  hoveredCoordinate,
  focusCoordinate,
  disabled,
  cellRefs,
  onHover,
  onFocusCell,
  onSelect,
  onKeyDown,
}: RowCellsProps) {
  return (
    <>
      <span className="flex items-center justify-center text-xs font-semibold text-cyan-200/80">
        {rowLabel}
      </span>
      {GRID_COLUMNS.map((_, col) => {
        const coordinate = coordinateFromIndices(col, row);
        const isSelected = selectedCoordinate === coordinate;
        const isHovered = hoveredCoordinate === coordinate;
        const tabIndex = focusCoordinate === coordinate ? 0 : -1;

        return (
          <button
            key={coordinate}
            type="button"
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
            aria-pressed={isSelected}
            onMouseEnter={() => onHover(coordinate)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => {
              onFocusCell(coordinate);
              onHover(coordinate);
            }}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(coordinate)}
            onKeyDown={(event) => onKeyDown(event, coordinate)}
            className={[
              "relative aspect-square min-h-[44px] min-w-[44px] rounded-sm border transition duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#00CED1]",
              "active:scale-90 disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-[#00CED1] bg-cyan-400/20 shadow-[0_0_12px_rgba(0,206,209,0.35)]"
                : isHovered
                  ? "border-cyan-300/70 bg-sky-400/15"
                  : "border-white/10 bg-[#161d2b] hover:border-cyan-300/50 hover:bg-sky-400/10",
            ].join(" ")}
          >
            {isSelected ? (
              <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute top-1/4 bottom-1/4 left-1/2 w-px bg-[#00CED1]/90" />
                <span className="absolute right-1/4 left-1/4 top-1/2 h-px bg-[#00CED1]/90" />
              </span>
            ) : null}
            <span className="sr-only">{coordinate}</span>
          </button>
        );
      })}
    </>
  );
}
