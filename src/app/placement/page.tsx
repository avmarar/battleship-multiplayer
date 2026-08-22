"use client";

import { useState } from "react";
import Link from "next/link";
import { BattleGrid } from "@/components/grid/BattleGrid";
import {
  GRID_SIZE,
  type GridCoordinate,
} from "@/lib/grid/coordinates";

export default function PlacementPage() {
  const [selectedCoordinate, setSelectedCoordinate] =
    useState<GridCoordinate | null>(null);
  const [recentCoordinates, setRecentCoordinates] = useState<GridCoordinate[]>(
    []
  );

  const handleSelect = (coordinate: GridCoordinate) => {
    setSelectedCoordinate(coordinate);
    setRecentCoordinates((current) =>
      [coordinate, ...current.filter((item) => item !== coordinate)].slice(0, 6)
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
            Placement · Sprint 2
          </p>
          <h1 className="text-3xl font-semibold">Grid Prototype</h1>
          <p className="max-w-2xl text-white/70">
            Local 10×{GRID_SIZE} sonar grid. Tap or click a cell to highlight it
            and emit a Battleship coordinate (A1–J10). Drag, rotate, and lock
            ship placement land in Sprint 3.
          </p>
          <Link href="/" className="inline-flex text-sm font-semibold text-cyan-200">
            ← Back to Hub
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="rounded-3xl border border-white/5 bg-white/[0.04] p-4 sm:p-6">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-cyan-200/80">
              Home Grid
            </p>
            <BattleGrid
              selectedCoordinate={selectedCoordinate}
              onSelect={handleSelect}
            />
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.04] p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Selected cell
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tracking-widest text-[#00CED1]">
                {selectedCoordinate ?? "—"}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Hover for a light overlay. Selected cells show a teal crosshair.
                Arrow keys move focus; Enter or Space selects.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Recent taps
              </p>
              {recentCoordinates.length === 0 ? (
                <p className="mt-2 text-sm text-white/60">
                  No cells selected yet.
                </p>
              ) : (
                <ol className="mt-2 flex flex-wrap gap-2">
                  {recentCoordinates.map((coordinate) => (
                    <li
                      key={coordinate}
                      className="rounded-full border border-cyan-400/40 px-3 py-1 font-mono text-sm text-cyan-100"
                    >
                      {coordinate}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
