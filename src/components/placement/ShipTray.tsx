"use client";

import type { PointerEvent } from "react";
import { fleetEntry, type Orientation, type ShipType } from "@/lib/grid/fleet";
import { ShipMark } from "@/components/visual/ShipMark";

type ShipTrayProps = {
  unplaced: ShipType[];
  selectedType?: ShipType | null;
  orientation: Orientation;
  disabled: boolean;
  draggingType?: ShipType | null;
  onSelect: (type: ShipType) => void;
  onDragStart: (type: ShipType, event: PointerEvent) => void;
};

const shipCardWidth: Record<ShipType, string> = {
  CARRIER: "w-[12.5rem]",
  BATTLESHIP: "w-[11.5rem]",
  CRUISER: "w-[10.5rem]",
  SUBMARINE: "w-[10.5rem]",
  DESTROYER: "w-[10.5rem]",
};

export function ShipTray({
  unplaced,
  selectedType = null,
  orientation,
  disabled,
  draggingType = null,
  onSelect,
  onDragStart,
}: ShipTrayProps) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
          <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
            ARMADA DOCK · UNPLACED VESSELS ({unplaced.length} REMAINING)
          </p>
        </div>
        <span className="text-[11px] font-mono text-white/50">
          Click vessel then click grid cell, or drag to position
        </span>
      </div>

      {unplaced.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-hud)] border border-emerald-500/30 bg-emerald-950/25 px-5 py-4 text-sm text-emerald-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#00f5a0]" />
          <span className="font-medium">All 5 vessels deployed to tactical grid. Ready for captain lock.</span>
        </div>
      ) : (
        <ul className="flex flex-wrap items-stretch justify-start gap-3">
          {unplaced.map((type) => {
            const ship = fleetEntry(type);
            const selected = selectedType === type;
            const lifting = draggingType === type;
            const cardWidth = shipCardWidth[type];

            return (
              <li
                key={type}
                className={`flex-none ${cardWidth} transition-all duration-300`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  data-testid={`ship-tray-${type}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(type)}
                  onPointerDown={(event) => onDragStart(type, event)}
                  className={[
                    "card-3d-tilt touch-none relative w-full overflow-hidden rounded-[var(--radius-hud)] border p-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                    "min-h-[44px] perspective-[600px]",
                    selected
                      ? "border-cyan-300 bg-cyan-950/50 shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                      : "border-white/15 bg-[#0a1324]/85 hover:border-cyan-400/60 hover:bg-[#0e1a30]/90 hover:shadow-[0_0_15px_rgba(0,206,209,0.2)]",
                  ].join(" ")}
                  aria-label={`Place ${ship.name}, length ${ship.size}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">
                      {ship.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {selected && (
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-200 border border-cyan-400/40 animate-pulse">
                          {orientation === "VERTICAL" ? "↕ V" : "↔ H"}
                        </span>
                      )}
                      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                        {ship.size}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 w-full overflow-hidden rounded bg-black/40 p-1.5 border border-white/5">
                    <ShipMark
                      type={type}
                      orientation="HORIZONTAL"
                      selected={selected}
                      lifting={lifting}
                      size="md"
                      fit="container"
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
