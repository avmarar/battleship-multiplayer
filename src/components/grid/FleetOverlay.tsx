import type { PlacedShip } from "@/lib/grid/placement";
import {
  GRID_SIZE,
  indicesFromCoordinate,
} from "@/lib/grid/coordinates";
import { ShipSilhouette } from "@/components/visual/ShipMark";

type FleetOverlayProps = {
  ships: PlacedShip[];
  selectedId?: string | null;
  sunkIds?: string[];
  className?: string;
};

/**
 * Non-interactive overlay that paints one hull across each ship's cells.
 * Sits above the axis-aligned grid so tap targeting stays accurate.
 */
export function FleetOverlay({
  ships,
  selectedId = null,
  sunkIds = [],
  className = "",
}: FleetOverlayProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        padding: "0.75rem",
        paddingLeft: "calc(0.75rem + 2rem)",
        paddingTop: "calc(0.75rem + 2rem)",
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gap: "4px",
      }}
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
        const selected = ship.id === selectedId;
        const sunk = sunkIds.includes(ship.id);
        const vertical = ship.orientation === "VERTICAL";

        return (
          <div
            key={ship.id}
            className={[
              "relative flex items-center justify-center overflow-hidden transition-all duration-200",
              sunk
                ? "drop-shadow-[0_0_12px_rgba(255,46,99,0.7)] brightness-75 contrast-125"
                : selected
                  ? "drop-shadow-[0_0_18px_rgba(0,242,254,0.75)]"
                  : "drop-shadow-[0_0_8px_rgba(0,206,209,0.3)]",
            ].join(" ")}
            style={{
              gridColumn: `${minCol + 1} / ${maxCol + 2}`,
              gridRow: `${minRow + 1} / ${maxRow + 2}`,
              padding: vertical ? "8% 16%" : "16% 8%",
            }}
          >
            <ShipSilhouette
              type={ship.type}
              orientation={ship.orientation}
              selected={selected}
              sunk={sunk}
            />
          </div>
        );
      })}
    </div>
  );
}
