"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

export type AtmosphereVariant =
  | "hub"
  | "lobby"
  | "placement"
  | "battle"
  | "scoreboard"
  | "victory"
  | "defeat";

const PLATES: Record<AtmosphereVariant, string> = {
  hub: "/visual/tactical_cic_hero.jpg",
  lobby: "/visual/lobby-bridge.png",
  placement: "/visual/ocean-sonar.png",
  battle: "/visual/ocean-sonar.png",
  scoreboard: "/visual/tactical_cic_hero.jpg",
  victory: "/visual/victory_3d.jpg",
  defeat: "/visual/defeat_3d.jpg",
};

type AtmosphereProps = {
  variant: AtmosphereVariant;
  className?: string;
  showSonar?: boolean;
};

export function Atmosphere({
  variant,
  className = "",
  showSonar = true,
}: AtmosphereProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");

    const onMove = (event: MouseEvent) => {
      if (media.matches || coarse.matches) {
        return;
      }
      const x = (event.clientX / window.innerWidth - 0.5) * 22;
      const y = (event.clientY / window.innerHeight - 0.5) * 16;
      layer.style.setProperty("--parallax-x", `${x}px`);
      layer.style.setProperty("--parallax-y", `${y}px`);
    };

    const reset = () => {
      layer.style.setProperty("--parallax-x", "0px");
      layer.style.setProperty("--parallax-y", "0px");
    };

    if (!media.matches && !coarse.matches) {
      window.addEventListener("pointermove", onMove);
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      reset();
    };
  }, []);

  const style = {
    "--parallax-x": "0px",
    "--parallax-y": "0px",
  } as CSSProperties;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      {/* Background Parallax Layer */}
      <div ref={layerRef} className="atmosphere-layer absolute inset-0" style={style}>
        <Image
          src={PLATES[variant]}
          alt=""
          fill
          priority={variant === "hub" || variant === "placement"}
          sizes="100vw"
          className="object-cover opacity-60"
        />
      </div>

      {/* Atmospheric Radial & Linear Gradients */}
      <div className="absolute inset-0 bg-[#050b14]/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050b14]/80 via-transparent to-[#050b14]/90" />
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#050b14]/40 to-[#050b14]/95" />
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(5,11,20,0.85)]" />

      {/* Ambient Concentric Radar Range Rings */}
      <div className="radar-concentric absolute inset-0 opacity-40" />

      {/* 360 Sonar Radar Sweep */}
      {showSonar ? (
        <div className="sonar-sweep absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-70" />
      ) : null}
    </div>
  );
}
