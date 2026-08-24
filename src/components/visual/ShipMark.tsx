import type { ShipType } from "@/lib/grid/fleet";

type ShipSilhouetteProps = {
  type: ShipType;
  orientation?: "HORIZONTAL" | "VERTICAL";
  selected?: boolean;
  sunk?: boolean;
  className?: string;
};

const VIEW: Record<ShipType, { w: number; h: number }> = {
  CARRIER: { w: 200, h: 40 },
  BATTLESHIP: { w: 160, h: 40 },
  CRUISER: { w: 120, h: 40 },
  SUBMARINE: { w: 120, h: 40 },
  DESTROYER: { w: 80, h: 40 },
};

function CarrierHull({
  selected,
  sunk,
}: {
  selected: boolean;
  sunk: boolean;
}) {
  const line = sunk ? "#ff2e63" : selected ? "#00f2fe" : "#00ced1";
  const glow = sunk ? "rgba(255,46,99,0.7)" : selected ? "rgba(0,242,254,0.8)" : "rgba(0,206,209,0.4)";
  const bodyGrad = sunk ? "url(#carrierSunk)" : selected ? "url(#carrierSel)" : "url(#carrierNorm)";

  return (
    <>
      <defs>
        <linearGradient id="carrierNorm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0c1b30" />
          <stop offset="50%" stopColor="#142c4c" />
          <stop offset="100%" stopColor="#0e223d" />
        </linearGradient>
        <linearGradient id="carrierSel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f2b4d" />
          <stop offset="50%" stopColor="#1c4778" />
          <stop offset="100%" stopColor="#123761" />
        </linearGradient>
        <linearGradient id="carrierSunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e0a11" />
          <stop offset="50%" stopColor="#52131e" />
          <stop offset="100%" stopColor="#300b13" />
        </linearGradient>
      </defs>

      {/* Main Armored Flight Deck */}
      <rect
        x="6"
        y="5"
        width="188"
        height="30"
        rx="6"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />

      {/* Bow Taper Angle */}
      <path
        d="M174 5h14c6 0 10 7 10 15s-4 15-10 15h-14"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
      />

      {/* Stern Thruster Block */}
      <rect x="2" y="11" width="5" height="18" rx="2" fill="#071220" stroke={line} strokeWidth="1" />
      <rect x="2" y="13" width="3" height="5" rx="1" fill={sunk ? "#555" : "#00f2fe"} />
      <rect x="2" y="22" width="3" height="5" rx="1" fill={sunk ? "#555" : "#00f2fe"} />

      {/* Runway Strip Markings */}
      <line x1="20" y1="16" x2="182" y2="16" stroke={line} strokeWidth="1.25" strokeDasharray="6 4" opacity={selected ? 0.95 : 0.65} />
      <line x1="20" y1="24" x2="182" y2="24" stroke={line} strokeWidth="1.25" strokeDasharray="6 4" opacity={selected ? 0.95 : 0.65} />
      
      {/* Runway Threshold Arrows (Bow) */}
      <path d="M170 14l6 6-6 6" fill="none" stroke={line} strokeWidth="1.5" opacity="0.8" />
      <path d="M164 14l6 6-6 6" fill="none" stroke={line} strokeWidth="1.5" opacity="0.5" />

      {/* Cell Segment Divider Seams (at 40, 80, 120, 160) */}
      <line x1="40" y1="5" x2="40" y2="35" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="80" y1="5" x2="80" y2="35" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="120" y1="5" x2="120" y2="35" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="160" y1="5" x2="160" y2="35" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />

      {/* Island / Superstructure Bridge */}
      <rect x="90" y="3" width="28" height="7" rx="2" fill="#081424" stroke={line} strokeWidth="1.25" />
      <circle cx="96" cy="6.5" r="1.5" fill={line} />
      <circle cx="112" cy="6.5" r="1.5" fill={line} />

      {/* Aircraft Elevators */}
      <rect x="48" y="7" width="16" height="10" rx="1.5" fill="#081320" stroke={line} strokeWidth="0.75" opacity="0.7" />
      <rect x="136" y="7" width="16" height="10" rx="1.5" fill="#081320" stroke={line} strokeWidth="0.75" opacity="0.7" />
    </>
  );
}

function BattleshipHull({
  selected,
  sunk,
}: {
  selected: boolean;
  sunk: boolean;
}) {
  const line = sunk ? "#ff2e63" : selected ? "#00f2fe" : "#00ced1";
  const glow = sunk ? "rgba(255,46,99,0.7)" : selected ? "rgba(0,242,254,0.8)" : "rgba(0,206,209,0.4)";
  const bodyGrad = sunk ? "url(#bbSunk)" : selected ? "url(#bbSel)" : "url(#bbNorm)";

  return (
    <>
      <defs>
        <linearGradient id="bbNorm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0c1a2e" />
          <stop offset="50%" stopColor="#153054" />
          <stop offset="100%" stopColor="#0d2039" />
        </linearGradient>
        <linearGradient id="bbSel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f2d52" />
          <stop offset="50%" stopColor="#1c4e85" />
          <stop offset="100%" stopColor="#123a69" />
        </linearGradient>
        <linearGradient id="bbSunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e0a11" />
          <stop offset="50%" stopColor="#541420" />
          <stop offset="100%" stopColor="#300b13" />
        </linearGradient>
      </defs>

      {/* Heavy Battleship Armored Hull */}
      <path
        d="M6 20c0-9 8-14 20-14h106c16 0 24 8 24 14s-8 14-24 14H26C14 34 6 29 6 20Z"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />

      {/* Cell Segment Divider Seams (at 40, 80, 120) */}
      <line x1="40" y1="7" x2="40" y2="33" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="80" y1="7" x2="80" y2="33" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="120" y1="7" x2="120" y2="33" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />

      {/* Citadel Bridge Superstructure */}
      <rect x="68" y="11" width="24" height="18" rx="3" fill="#081422" stroke={line} strokeWidth="1.25" />
      <rect x="74" y="15" width="12" height="10" rx="1.5" fill="#132740" stroke={line} strokeWidth="0.75" />

      {/* Heavy Forward Turrets */}
      <circle cx="34" cy="20" r="8" fill="#081424" stroke={line} strokeWidth="1.5" />
      <line x1="38" y1="18" x2="52" y2="18" stroke={line} strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="22" x2="52" y2="22" stroke={line} strokeWidth="2" strokeLinecap="round" />

      <circle cx="106" cy="20" r="8" fill="#081424" stroke={line} strokeWidth="1.5" />
      <line x1="110" y1="18" x2="124" y2="18" stroke={line} strokeWidth="2" strokeLinecap="round" />
      <line x1="110" y1="22" x2="124" y2="22" stroke={line} strokeWidth="2" strokeLinecap="round" />

      {/* Aft Turret */}
      <circle cx="138" cy="20" r="7" fill="#081424" stroke={line} strokeWidth="1.5" />
      <line x1="142" y1="19" x2="154" y2="19" stroke={line} strokeWidth="2" strokeLinecap="round" />
      <line x1="142" y1="21" x2="154" y2="21" stroke={line} strokeWidth="2" strokeLinecap="round" />

      {/* Stern Thrusters */}
      <rect x="3" y="16" width="4" height="8" rx="1" fill={sunk ? "#555" : "#00f2fe"} />
    </>
  );
}

function CruiserHull({
  selected,
  sunk,
}: {
  selected: boolean;
  sunk: boolean;
}) {
  const line = sunk ? "#ff2e63" : selected ? "#00f2fe" : "#00ced1";
  const glow = sunk ? "rgba(255,46,99,0.7)" : selected ? "rgba(0,242,254,0.8)" : "rgba(0,206,209,0.4)";
  const bodyGrad = sunk ? "url(#caSunk)" : selected ? "url(#caSel)" : "url(#caNorm)";

  return (
    <>
      <defs>
        <linearGradient id="caNorm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a182b" />
          <stop offset="50%" stopColor="#132c4e" />
          <stop offset="100%" stopColor="#0b1e36" />
        </linearGradient>
        <linearGradient id="caSel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0e2a4f" />
          <stop offset="50%" stopColor="#1a4b82" />
          <stop offset="100%" stopColor="#113864" />
        </linearGradient>
        <linearGradient id="caSunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e0a11" />
          <stop offset="50%" stopColor="#541420" />
          <stop offset="100%" stopColor="#300b13" />
        </linearGradient>
      </defs>

      {/* Cruiser Sleek Armored Hull */}
      <path
        d="M6 20c0-8 8-13 18-13h76c14 0 16 7 16 13s-2 13-16 13H24C14 33 6 28 6 20Z"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />

      {/* Cell Segment Divider Seams (at 40, 80) */}
      <line x1="40" y1="8" x2="40" y2="32" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="80" y1="8" x2="80" y2="32" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />

      {/* Dual Artillery Turrets */}
      <circle cx="28" cy="20" r="6" fill="#081422" stroke={line} strokeWidth="1.25" />
      <line x1="32" y1="20" x2="44" y2="20" stroke={line} strokeWidth="2.2" strokeLinecap="round" />

      <circle cx="92" cy="20" r="6" fill="#081422" stroke={line} strokeWidth="1.25" />
      <line x1="96" y1="20" x2="108" y2="20" stroke={line} strokeWidth="2.2" strokeLinecap="round" />

      {/* VLS Missile Cell Hatch Bay */}
      <rect x="46" y="13" width="28" height="14" rx="2" fill="#081320" stroke={line} strokeWidth="1" />
      <rect x="50" y="16" width="5" height="8" rx="1" fill={line} opacity="0.8" />
      <rect x="58" y="16" width="5" height="8" rx="1" fill={line} opacity="0.8" />
      <rect x="66" y="16" width="5" height="8" rx="1" fill={line} opacity="0.8" />

      {/* Engine */}
      <rect x="3" y="17" width="4" height="6" rx="1" fill={sunk ? "#555" : "#00f2fe"} />
    </>
  );
}

function SubmarineHull({
  selected,
  sunk,
}: {
  selected: boolean;
  sunk: boolean;
}) {
  const line = sunk ? "#ff2e63" : selected ? "#00f2fe" : "#00ced1";
  const glow = sunk ? "rgba(255,46,99,0.7)" : selected ? "rgba(0,242,254,0.8)" : "rgba(0,206,209,0.4)";
  const bodyGrad = sunk ? "url(#subSunk)" : selected ? "url(#subSel)" : "url(#subNorm)";

  return (
    <>
      <defs>
        <linearGradient id="subNorm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#081526" />
          <stop offset="50%" stopColor="#102747" />
          <stop offset="100%" stopColor="#0a1a30" />
        </linearGradient>
        <linearGradient id="subSel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0c2647" />
          <stop offset="50%" stopColor="#18467d" />
          <stop offset="100%" stopColor="#0f345e" />
        </linearGradient>
        <linearGradient id="subSunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e0a11" />
          <stop offset="50%" stopColor="#541420" />
          <stop offset="100%" stopColor="#300b13" />
        </linearGradient>
      </defs>

      {/* Hydrodynamic Teardrop Submersible Hull */}
      <ellipse
        cx="60"
        cy="20"
        rx="54"
        ry="13"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />

      {/* Cell Segment Divider Seams (at 40, 80) */}
      <line x1="40" y1="8" x2="40" y2="32" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />
      <line x1="80" y1="8" x2="80" y2="32" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />

      {/* Conning Tower Sail */}
      <rect x="52" y="8" width="22" height="13" rx="3" fill="#081422" stroke={line} strokeWidth="1.5" />
      <circle cx="63" cy="14" r="2.5" fill={line} />

      {/* Periscope & Snorkel Masts */}
      <line x1="58" y1="8" x2="58" y2="3" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="66" y1="8" x2="66" y2="4" stroke={line} strokeWidth="1.5" strokeLinecap="round" />

      {/* Forward Sonar Dome */}
      <circle cx="106" cy="20" r="4.5" fill="#081424" stroke={line} strokeWidth="1.25" />
      <circle cx="106" cy="20" r="1.5" fill={sunk ? "#555" : "#00f2fe"} />

      {/* Stern Rudder Stabilizers */}
      <path d="M12 20l-6 7h6l4-7Z" fill={line} opacity="0.8" />
      <path d="M12 20l-6-7h6l4 7Z" fill={line} opacity="0.8" />
    </>
  );
}

function DestroyerHull({
  selected,
  sunk,
}: {
  selected: boolean;
  sunk: boolean;
}) {
  const line = sunk ? "#ff2e63" : selected ? "#00f2fe" : "#00ced1";
  const glow = sunk ? "rgba(255,46,99,0.7)" : selected ? "rgba(0,242,254,0.8)" : "rgba(0,206,209,0.4)";
  const bodyGrad = sunk ? "url(#ddSunk)" : selected ? "url(#ddSel)" : "url(#ddNorm)";

  return (
    <>
      <defs>
        <linearGradient id="ddNorm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#091629" />
          <stop offset="50%" stopColor="#122949" />
          <stop offset="100%" stopColor="#0a1d33" />
        </linearGradient>
        <linearGradient id="ddSel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0d284a" />
          <stop offset="50%" stopColor="#19487e" />
          <stop offset="100%" stopColor="#103660" />
        </linearGradient>
        <linearGradient id="ddSunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e0a11" />
          <stop offset="50%" stopColor="#541420" />
          <stop offset="100%" stopColor="#300b13" />
        </linearGradient>
      </defs>

      {/* Fast Patrol / Destroyer Armored Hull */}
      <path
        d="M5 20c0-7 6-12 16-12h44c8 0 12 6 12 12s-4 12-12 12H21C11 32 5 27 5 20Z"
        fill={bodyGrad}
        stroke={line}
        strokeWidth="1.75"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />

      {/* Cell Segment Divider Seams (at 40) */}
      <line x1="40" y1="9" x2="40" y2="31" stroke={line} strokeWidth="0.75" strokeDasharray="2 3" opacity="0.4" />

      {/* Forward Rapid Autocannon */}
      <circle cx="28" cy="20" r="5" fill="#081422" stroke={line} strokeWidth="1.25" />
      <line x1="32" y1="20" x2="44" y2="20" stroke={line} strokeWidth="2.2" strokeLinecap="round" />

      {/* Torpedo Tube Bay */}
      <rect x="44" y="14" width="18" height="12" rx="2" fill="#081320" stroke={line} strokeWidth="1" />
      <rect x="47" y="16" width="12" height="3" fill={line} opacity="0.85" />
      <rect x="47" y="21" width="12" height="3" fill={line} opacity="0.85" />

      {/* Twin Afterburner Propulsion */}
      <rect x="2" y="14" width="3" height="4" rx="1" fill={sunk ? "#555" : "#00f2fe"} />
      <rect x="2" y="22" width="3" height="4" rx="1" fill={sunk ? "#555" : "#00f2fe"} />
    </>
  );
}

function ShipBody({
  type,
  selected,
  sunk,
}: {
  type: ShipType;
  selected: boolean;
  sunk: boolean;
}) {
  switch (type) {
    case "CARRIER":
      return <CarrierHull selected={selected} sunk={sunk} />;
    case "BATTLESHIP":
      return <BattleshipHull selected={selected} sunk={sunk} />;
    case "CRUISER":
      return <CruiserHull selected={selected} sunk={sunk} />;
    case "SUBMARINE":
      return <SubmarineHull selected={selected} sunk={sunk} />;
    case "DESTROYER":
      return <DestroyerHull selected={selected} sunk={sunk} />;
  }
}

/**
 * Continuous top-down naval vessel silhouette. Drawn horizontal; rotated for vertical.
 */
export function ShipSilhouette({
  type,
  orientation = "HORIZONTAL",
  selected = false,
  sunk = false,
  className = "",
}: ShipSilhouetteProps) {
  const { w, h } = VIEW[type];
  const vertical = orientation === "VERTICAL";
  const viewW = vertical ? h : w;
  const viewH = vertical ? w : h;
  const pad = 2;

  return (
    <svg
      aria-hidden
      viewBox={`${-pad} ${-pad} ${viewW + pad * 2} ${viewH + pad * 2}`}
      className={["block h-full w-full overflow-hidden transition-all duration-200", className].join(" ")}
      preserveAspectRatio="none"
    >
      <g transform={vertical ? `translate(0 ${w}) rotate(-90)` : undefined}>
        <ShipBody type={type} selected={selected} sunk={sunk} />
      </g>
    </svg>
  );
}

type ShipMarkProps = {
  type: ShipType;
  orientation?: "HORIZONTAL" | "VERTICAL";
  selected?: boolean;
  sunk?: boolean;
  lifting?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  fit?: "height" | "container";
};

const trayFixedHeight: Record<NonNullable<ShipMarkProps["size"]>, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

export function ShipMark({
  type,
  orientation = "HORIZONTAL",
  selected = false,
  sunk = false,
  lifting = false,
  className = "",
  size = "md",
  fit = "height",
}: ShipMarkProps) {
  const vertical = orientation === "VERTICAL";
  const fitClasses =
    fit === "container"
      ? vertical
        ? `mx-auto block ${trayFixedHeight[size]} w-auto max-w-full`
        : `block ${trayFixedHeight[size]} w-full max-w-full`
      : `inline-block max-w-full ${trayFixedHeight[size]}`;

  return (
    <span
      aria-hidden
      className={[
        "relative overflow-hidden transition duration-150",
        fitClasses,
        lifting ? "ship-lift" : "",
        className,
      ].join(" ")}
      style={{ transformStyle: "preserve-3d" }}
    >
      <ShipSilhouette
        type={type}
        orientation={orientation}
        selected={selected}
        sunk={sunk}
        className="h-full w-full"
      />
    </span>
  );
}

export function CaptainMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-4 w-4 fill-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] ${className}`}
    >
      <path d="M8 1.5 9.8 5.4l4.2.4-3.2 2.8.9 4.1L8 10.8 4.3 12.7l.9-4.1L2 5.8l4.2-.4L8 1.5Z" />
    </svg>
  );
}
