import Image from "next/image";
import Link from "next/link";
import { ResumeMatchCard } from "@/components/hub/ResumeMatchCard";
import { CommandShell } from "@/components/layout/CommandShell";
import { HudPanel } from "@/components/ui/HudPanel";
import { ShipMark } from "@/components/visual/ShipMark";

const inviteModes = [
  {
    title: "Duel · 1v1 Combat",
    badge: "Direct Match",
    description:
      "Host a fast tactical duel. Share your 6-character match code — opponent seats instantly as Beta commander.",
    href: "/lobby?mode=1v1",
    testId: "start-1v1",
    image: "/visual/fleet_battleship_3d.jpg",
  },
  {
    title: "Squadron · Multiplayer",
    badge: "Co-op & Teams",
    description:
      "Team captains seat via match code, then recruit crew members with separate invite codes to command together.",
    href: "/lobby?mode=MULTIPLAYER",
    testId: "start-multiplayer",
    image: "/visual/fleet_carrier_3d.jpg",
  },
];

const sections = [
  {
    title: "Deployment",
    icon: "▦",
    description: "Drag, rotate, and lock a 5-vessel legal fleet on the tactical blueprint.",
    href: "/placement",
  },
  {
    title: "Fire Control",
    icon: "◎",
    description: "Real-time naval battle loop covering sonar tracking, firing, and casualty alerts.",
    href: "/game",
  },
  {
    title: "Standings",
    icon: "★",
    description: "Post-match summaries, weapon accuracy telemetry, and ranked global leaderboard.",
    href: "/scoreboard",
  },
];

export default function Home() {
  return (
    <CommandShell variant="hub">
      {/* Hero Combat Command Center */}
      <HudPanel corners tone="accent" className="relative overflow-hidden p-6 sm:p-10">
        {/* Floating 3D Fleet Silhouette Backdrop */}
        <div className="pointer-events-none absolute -right-6 top-6 hidden w-64 perspective-[900px] lg:block opacity-85">
          <div className="fleet-float flex flex-col items-end gap-3.5 pr-6">
            <ShipMark type="CARRIER" size="lg" className="drop-shadow-[0_0_15px_rgba(0,242,254,0.4)]" />
            <ShipMark type="BATTLESHIP" size="lg" className="drop-shadow-[0_0_15px_rgba(0,242,254,0.4)]" />
            <ShipMark type="DESTROYER" size="lg" className="drop-shadow-[0_0_15px_rgba(0,242,254,0.4)]" />
          </div>
        </div>

        {/* Tactical Classification Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-[0.25em] text-cyan-200 shadow-[0_0_12px_rgba(0,242,254,0.25)]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            NAVAL COMBAT COMMAND
          </span>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-mono text-white/60">
            SECTOR 7-ALPHA
          </span>
        </div>

        {/* Hero Title & Description */}
        <div className="mt-5 max-w-xl space-y-3">
          <h1 className="text-3xl font-black uppercase tracking-[0.06em] text-white sm:text-5xl leading-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            COMMAND THE <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent">ABYSS</span>
          </h1>
          <p className="text-base text-white/80 leading-relaxed">
            Instant tactical matchmaking and squadron multiplayer. Place your armada, coordinate fire control, and eliminate enemy fleets on a live synchronized radar grid.
          </p>
        </div>

        {/* Quick Play CTA with Pulsing Radar Ring */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-[var(--radius-hud)] bg-gradient-to-r from-cyan-400 to-teal-300 opacity-60 blur-sm transition duration-300 group-hover:opacity-100 animate-pulse" />
            <Link
              href="/placement?quickPlay=1"
              data-testid="hub-quick-play"
              className="relative inline-flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius-hud)] bg-gradient-to-r from-[#00CED1] to-[#00F2FE] px-8 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#041218] shadow-[0_0_25px_rgba(0,242,254,0.5)] transition duration-150 hover:brightness-110 active:scale-95 sm:w-auto"
            >
              ⚡ Instant Quick Play
            </Link>
          </div>
        </div>

        {/* 3D Game Modes Cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {inviteModes.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              data-testid={mode.testId}
              className="card-3d-tilt group relative overflow-hidden rounded-[var(--radius-hud)] border border-white/15 bg-gradient-to-b from-[#0b1526]/90 to-[#060c18]/95 p-0 transition-all duration-300 hover:border-cyan-400/60"
            >
              {/* 3D Image Header */}
              <div className="relative h-36 w-full overflow-hidden bg-black/50">
                <Image
                  src={mode.image}
                  alt={mode.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060c18] via-[#060c18]/40 to-transparent" />
                <span className="absolute top-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-200">
                  {mode.badge}
                </span>
              </div>

              {/* Mode Info */}
              <div className="relative space-y-2 p-5 pt-2">
                <h2 className="text-lg font-bold uppercase tracking-[0.06em] text-white group-hover:text-cyan-200 transition-colors">
                  {mode.title}
                </h2>
                <p className="text-sm text-white/70 leading-relaxed">{mode.description}</p>
                <div className="pt-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-cyan-300 group-hover:translate-x-1 transition-transform">
                  <span>Open Tactical Lobby</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Live Reconnect Match Banner */}
        <div className="mt-8">
          <ResumeMatchCard />
        </div>
      </HudPanel>

      {/* Feature Navigation Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            aria-label={`Open ${section.title} workspace`}
            className="group relative overflow-hidden rounded-[var(--radius-hud)] border border-white/10 bg-[#070e1b]/80 p-5 backdrop-blur-md transition-all duration-200 hover:border-cyan-400/50 hover:bg-[#0b172a]/90 hover:shadow-[0_0_20px_rgba(0,206,209,0.15)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 font-mono text-base text-cyan-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(0,242,254,0.3)]">
                {section.icon}
              </span>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/90 group-hover:text-cyan-200">
                {section.title}
              </h2>
            </div>
            <p className="mt-3 text-xs text-white/60 leading-relaxed">{section.description}</p>
          </Link>
        ))}
      </section>
    </CommandShell>
  );
}
