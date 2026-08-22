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

4. Visit [http://localhost:3000](http://localhost:3000) to interact with the hub. The lobby workspace now lives at `/lobby`, with additional stubs at `/placement`, `/game`, and `/scoreboard`. Once authentication succeeds you can:

   - See your anonymous UID and document path.
   - Edit the nickname/status form to write to `/artifacts/{namespace}/users/{uid}/data/profile`.
   - Watch the Firestore snapshot section update live.

## Scripts

| Command        | Description                                |
| :------------- | :----------------------------------------- |
| `npm run dev`  | Start the Next.js dev server               |
| `npm run lint` | Run ESLint across the project              |
| `npm run test:rules` | Launch the Firestore emulator suite and run the security rule tests |
| `npm run build`/`start` | Production build & start commands |

## Firebase Emulators (Optional)

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` if you want the client to connect to local emulators (`auth:9099`, `firestore:8080`).

## Sprint 2 Lobby Flow

Sprint 2 layers lobby creation/join flows on top of the Sprint 1 profile PoC. The full experience resides on `/lobby`.

1. Sign in anonymously (handled automatically on page load) and configure your nickname in the profile form.
2. Use the **Create a new lobby** card to generate a lobby document. The UI surfaces the invite code, members list, and pending join requests in real time.
3. Teammates submit the invite code through the **Join by Code** form. Each request is persisted under `lobbies/{lobbyId}/joinRequests/{uid}` and shows up in the captain dashboard for approval.
4. Captains approve or reject pending join requests from the Active Lobby panel. Approvals add the user to `memberIds`/`members`, enabling instant roster updates for everyone in that lobby.
5. Run `npm run test:rules` before committing rule changes to verify the Firestore security posture with the emulator suite.

## Next Steps

- Complete CI/CD wiring (end of Sprint 1\).
- Extend the authenticated PoC into the lobby, placement, and battle sprints documented in `/docs`.

## Git Branching Strategy

- `master`: Release-quality branch only. Promote from `develop` after QA + deployment sign-off.
- `develop`: Integration branch for upcoming sprint work. All feature branches merge here via PR.
- `feature/<ticket-or-topic>`: Short-lived branches for individual tasks. Branch from `develop`, submit PR back to `develop`, then delete after merge.
