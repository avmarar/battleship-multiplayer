import { Suspense } from "react";
import { LobbyPageClient } from "./LobbyPageClient";

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 py-10 text-white">
          Loading lobby…
        </div>
      }
    >
      <LobbyPageClient />
    </Suspense>
  );
}
