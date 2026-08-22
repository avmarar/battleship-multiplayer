import Link from "next/link";

const sections = [
  {
    title: "Lobby",
    description:
      "Create squads, share invite codes, and approve join requests in real time.",
    href: "/lobby",
    badge: "Sprint 2",
  },
  {
    title: "Placement",
    description:
      "Upcoming ship placement sandbox with drag/drop validation and locks.",
    href: "/placement",
    badge: "Stub",
  },
  {
    title: "Game",
    description:
      "Battle loop prototype covering turn order, firing, and telemetry feeds.",
    href: "/game",
    badge: "Stub",
  },
  {
    title: "Scoreboard",
    description:
      "Persisted match summaries and leaderboard insights for future sprints.",
    href: "/scoreboard",
    badge: "Stub",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 text-white">
        <header className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-white/80">
            Battleship Multiplayer · Prototype Hub
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Sprint Workbench
            </h1>
            <p className="max-w-3xl text-base text-white/70">
              Navigate to a dedicated workspace for each core epic. Lobby now
              hosts the full Sprint&nbsp;2 experience, while Placement, Game,
              and Scoreboard provide placeholders for upcoming iterations.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/5 bg-white/3 p-8">
          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-3xl border border-white/5 bg-white/2 p-6 transition hover:border-cyan-400/50"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  {section.badge}
                </div>
                <h2 className="text-2xl font-semibold text-white group-hover:text-cyan-200">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {section.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-cyan-200">
                  Enter Workspace →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
