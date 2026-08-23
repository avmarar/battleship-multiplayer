/**
 * Soft NFR-LOAD check: write ~50 presence docs against the Firestore emulator.
 * Requires emulators on :8080 (`npm run emulators` or `npm run dev`).
 */
const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "battleship-multiplayer-demo";
const COUNT = Number(process.env.LOAD_SMOKE_COUNT ?? 50);
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function writePresence(index) {
  const response = await fetch(`${BASE}/presence?documentId=load-${index}`, {
    method: "POST",
    headers: {
      Authorization: "Bearer owner",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: `load-${index}` },
        isConnected: { booleanValue: true },
        lastSeenAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `presence/load-${index} failed: ${response.status} ${await response.text()}`
    );
  }
}

async function main() {
  const started = Date.now();
  try {
    await Promise.all(Array.from({ length: COUNT }, (_, index) => writePresence(index)));
  } catch (error) {
    console.error(
      "Load smoke failed. Start Firebase emulators first (`npm run emulators`)."
    );
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const elapsedMs = Date.now() - started;
  console.log(
    `NFR-LOAD: wrote ${COUNT} presence documents in ${elapsedMs}ms (soft 50-session smoke).`
  );
}

await main();
