"use client";

import type { PointerEvent } from "react";
import { fleetEntry, type Orientation, type ShipType } from "@/lib/grid/fleet";

type ShipTrayProps = {
  unplaced: ShipType[];
  orientation: Orientation;
  disabled: boolean;
  onDragStart: (type: ShipType, event: PointerEvent) => void;
};

export function ShipTray({
  unplaced,
  orientation,
  disabled,
  onDragStart,
}: ShipTrayProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
        Ship tray
      </p>
      {unplaced.length === 0 ? (
        <p className="text-sm text-white/60">All ships are on the grid.</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {unplaced.map((type) => {
            const ship = fleetEntry(type);
            return (
              <li key={type}>
                <button
                  type="button"
                  disabled={disabled}
                  onPointerDown={(event) => onDragStart(type, event)}
                  className="touch-none rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-left transition hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Drag ${ship.name}, length ${ship.size}`}
                >
                  <p className="text-sm font-semibold text-white">{ship.name}</p>
                  <p className="text-xs text-white/50">{ship.size} cells</p>
                  <span
                    aria-hidden
                    className="mt-2 flex gap-0.5"
                    style={{
                      flexDirection:
                        orientation === "HORIZONTAL" ? "row" : "column",
                    }}
                  >
                    {Array.from({ length: ship.size }).map((_, index) => (
                      <span
                        key={index}
                        className="h-3 w-3 rounded-[2px] border border-[#00CED1]/80 bg-[#1a2230]"
                      />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
