import Link from "next/link";

export default function PlacementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-12 text-white">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-white/5 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Placement · Stub</p>
        <h1 className="text-3xl font-semibold">Placement Prototype</h1>
        <p className="text-white/70">
          This page will host the Sprint 2/3 grid prototyping work: drag-and-drop ships, rotation
          helpers, and placement validation before captains lock the layout. For now it serves as a
          placeholder while the Lobby epic lands.
        </p>
        <Link href="/" className="text-sm font-semibold text-cyan-200">← Back to Hub</Link>
      </main>
    </div>
  );
}
