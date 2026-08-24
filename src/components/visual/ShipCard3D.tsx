"use client";

import Image from "next/image";
import type { ShipType } from "@/lib/grid/fleet";

export type ShipSpec = {
  name: string;
  classification: string;
  size: number;
  image: string;
  role: string;
};

export const SHIP_SPECS: Record<ShipType, ShipSpec> = {
  CARRIER: {
    name: "Carrier",
    classification: "Fleet Supercarrier",
    size: 5,
    image: "/visual/fleet_carrier_3d.jpg",
    role: "Air Superiority & Recon",
  },
  BATTLESHIP: {
    name: "Battleship",
    classification: "Heavy Dreadnought",
    size: 4,
    image: "/visual/fleet_battleship_3d.jpg",
    role: "Heavy Bombardment",
  },
  CRUISER: {
    name: "Cruiser",
    classification: "Stealth Missile Cruiser",
    size: 3,
    image: "/visual/fleet_cruiser_3d.jpg",
    role: "Tactical Strike & Defense",
  },
  SUBMARINE: {
    name: "Submarine",
    classification: "Deep-Sea Attack Sub",
    size: 3,
    image: "/visual/fleet_submarine_3d.jpg",
    role: "Covert Torpedo Warfare",
  },
  DESTROYER: {
    name: "Destroyer",
    classification: "Fast Patrol Escort",
    size: 2,
    image: "/visual/fleet_destroyer_3d.jpg",
    role: "Rapid Interception",
  },
};

type ShipCard3DProps = {
  type: ShipType;
  selected?: boolean;
  sunk?: boolean;
  hits?: number;
  onClick?: () => void;
  className?: string;
};

export function ShipCard3D({
  type,
  selected = false,
  sunk = false,
  hits = 0,
  onClick,
  className = "",
}: ShipCard3DProps) {
  const spec = SHIP_SPECS[type];
  const hpPercent = Math.max(0, Math.round(((spec.size - hits) / spec.size) * 100));

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={[
        "card-3d-tilt relative overflow-hidden rounded-[var(--radius-hud)] border p-3.5 backdrop-blur-xl transition-all duration-300",
        sunk
          ? "border-rose-500/50 bg-rose-950/30 opacity-70"
          : selected
            ? "border-cyan-400/80 bg-cyan-950/40 shadow-[0_0_24px_rgba(0,242,254,0.3)]"
            : "border-white/10 bg-[#0c1626]/80 hover:border-cyan-400/40 hover:bg-[#101e35]/90",
        onClick ? "cursor-pointer" : "",
        className,
      ].join(" ")}
    >
      {/* 3D Ship Model Image */}
      <div className="relative h-28 w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <Image
          src={spec.image}
          alt={spec.name}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className={[
            "object-cover transition-transform duration-500 hover:scale-105",
            sunk ? "grayscale brightness-50 contrast-125" : "",
          ].join(" ")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08101d] via-transparent to-transparent opacity-80" />

        {/* Size Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-cyan-200 border border-cyan-500/30">
          <span>{spec.size} CELLS</span>
        </div>

        {/* Sunk / Status Overlay */}
        {sunk && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-950/60 backdrop-blur-xs">
            <span className="rounded border border-rose-500 bg-rose-900/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg">
              DESTROYED
            </span>
          </div>
        )}
      </div>

      {/* Ship Metadata */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            {spec.name}
          </h4>
          <span className="text-[10px] font-mono uppercase text-cyan-300/80">
            {spec.classification}
          </span>
        </div>

        <p className="text-xs text-white/50">{spec.role}</p>

        {/* Hull Integrity Bar */}
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-white/60">
            <span>HULL INTEGRITY</span>
            <span className={sunk ? "text-rose-400 font-bold" : "text-cyan-300 font-bold"}>
              {sunk ? "0%" : `${hpPercent}%`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50 border border-white/10">
            <div
              className={[
                "h-full transition-all duration-300",
                sunk
                  ? "w-0 bg-rose-500"
                  : hpPercent < 50
                    ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                    : "bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_#00f2fe]",
              ].join(" ")}
              style={{ width: `${sunk ? 0 : hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
