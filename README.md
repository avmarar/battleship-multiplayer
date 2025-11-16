## Battleship Multiplayer · Sprint 1 Playground

This repository hosts the Sprint 1 proof-of-concept for the Battleship Multiplayer project. The goal of this iteration is to prove out Firebase integration (anonymous authentication + real-time Firestore reads/writes) while delivering a static tactical home screen inspired by the UX blueprint.

## Prerequisites

- Node.js 18+
- npm (bundled with Node)
- Firebase project configured for Web (Firestore + Anonymous Auth)

## Setup

1. Copy the example environment file and fill in your Firebase values:

   ```bash
   cp .env.local.example .env.local
   # populate each NEXT_PUBLIC_FIREBASE_* field with your project values
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local dev server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) to interact with the Sprint 1 dashboard. Once authentication succeeds you can:

   - See your anonymous UID and document path.
   - Edit the nickname/status form to write to `/artifacts/{namespace}/users/{uid}/data/profile`.
   - Watch the Firestore snapshot section update live.

## Scripts

| Command        | Description                                |
| :------------- | :----------------------------------------- |
| `npm run dev`  | Start the Next.js dev server               |
| `npm run lint` | Run ESLint across the project              |
| `npm run build`/`start` | Production build & start commands |

## Firebase Emulators (Optional)

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` if you want the client to connect to local emulators (`auth:9099`, `firestore:8080`).

## Next Steps

- Complete CI/CD wiring (end of Sprint 1\).
- Extend the authenticated PoC into the lobby, placement, and battle sprints documented in `/docs`.

## Git Branching Strategy

- `master`: Release-quality branch only. Promote from `develop` after QA + deployment sign-off.
- `develop`: Integration branch for upcoming sprint work. All feature branches merge here via PR.
- `feature/<ticket-or-topic>`: Short-lived branches for individual tasks. Branch from `develop`, submit PR back to `develop`, then delete after merge.
