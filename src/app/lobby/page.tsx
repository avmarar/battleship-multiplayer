import { Suspense } from "react";
import { LobbyPageClient } from "./LobbyPageClient";

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-10 text-white">
          Loading lobby…
        </div>
      }
    >
      <LobbyPageClient />
    </Suspense>
  );
}
