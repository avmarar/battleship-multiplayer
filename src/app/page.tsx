import Link from "next/link";
import { ResumeMatchCard } from "@/components/hub/ResumeMatchCard";

const modes = [
  {
    title: "1v1",
    description:
      "Host a duel. Share one match code — your opponent joins as Beta captain with no approval.",
    href: "/lobby?mode=1v1",
    testId: "start-1v1",
  },
  {
    title: "Multiplayer",
    description:
      "Team captains seat via match code, then each recruits crew with their own invite.",
    href: "/lobby?mode=MULTIPLAYER",
    testId: "start-multiplayer",
  },
];

const sections = [
  {
    title: "Placement",
    description:
      "Drag, rotate, and lock a legal fleet after a match starts.",
    href: "/placement",
    badge: "Sprint 3+",
  },
  {
    title: "Game",
    description:
      "Battle loop covering turn order, firing, and fleet destruction.",
    href: "/game",
    badge: "Sprint 5",
  },
  {
    title: "Scoreboard",
    description:
      "Post-match summaries plus authenticated W/L standings.",
    href: "/scoreboard",
    badge: "Sprint 6",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 text-white">
        <header className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-white/80">
            Battleship Multiplayer
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Choose your engagement
            </h1>
            <p className="max-w-3xl text-base text-white/70">
              Host creates the match and shares a lobby code. The peer becomes
              Beta captain immediately. Multiplayer adds per-team crew invites.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {modes.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                data-testid={mode.testId}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50"
              >
                <h2 className="text-2xl font-semibold text-white">{mode.title}</h2>
                <p className="mt-2 text-sm text-white/70">{mode.description}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-cyan-100">
                  Open lobby →
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/placement?quickPlay=1"
            data-testid="hub-quick-play"
            className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Quick Play (dev)
          </Link>
          <ResumeMatchCard />
        </header>

        <section className="rounded-3xl border border-white/5 bg-white/3 p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                aria-label={`Open ${section.title} workspace`}
                className="group rounded-3xl border border-white/5 bg-white/2 p-6 transition hover:border-cyan-400/50"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
                  {section.badge}
                </div>
                <h2 className="text-xl font-semibold text-white group-hover:text-cyan-100">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
