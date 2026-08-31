# 🚢 Battleship Multiplayer

A modern, real-time multiplayer tactical Battleship web application built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Firebase v12 (Firestore + Authentication)**.

---

## 🌟 Key Features

### 🎮 Tactical Hub & Match Modes (`/`)
- **Quick Play Matchmaking**: Instant 1v1 auto-pairing via atomic Firestore transactions (`matchmakingSlots/open`).
- **1v1 Invite Matches**: Private host vs. challenger match creation and joining via unique match codes.
- **Multiplayer Crew Matches**: Team-based matches with dual-team lobbies (Alpha & Beta teams) and team-scoped crew invite codes.
- **Active Match Resume**: Automatic heartbeat presence monitoring with an active match resume banner on the hub.

### 👥 Tactical Lobbies & Captain Dashboard (`/lobby`)
- **Dual-Team Captain Architecture**: Match creator commands Team Alpha; the first opposing joiner commands Team Beta.
- **Crew Request Queue**: Captains review, approve, or reject incoming crew join requests in real time.
- **Ready State & Team Lock**: Dynamic ready indicators across all roster members; locks prevent late joins once teams prepare.
- **Synchronized Game Launch**: Captain triggers game start, automatically transitioning all team members to placement.

### ⚓ Interactive Fleet Placement (`/placement`)
- **10×10 Tactical Ocean Grid**: Smooth drag-and-drop, touch support, and keyboard rotation (`R` / 90° snap).
- **Standard 5-Ship Fleet**: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
- **Collision & Boundary Validation**: Visual feedback preventing out-of-bounds or overlapping placements.
- **Real-Time Collaborative Drafting**: Team members can adjust and preview fleet formations collaboratively.
- **Captain-Only Atomic Lock**: Placement lock is validated and committed atomically via Firestore transactions, with real-time opponent status tracking.

### 🎯 Turn-Based Battle Combat Engine (`/game`)
- **Sequential Team Attack Engine**: Fair round-robin turn order across team rosters.
- **Fog of War Radar**: Interactive opponent targeting grid with real-time shot firing transactions.
- **Live Damage & Sunk Alerts**: Immediate hit/miss radar markers, ship damage tracking, and sunk ship broadcast alerts.
- **AFK & Disconnect Resilience**: Automatic 30-second turn skip for disconnected players and 60-second captain handover to the longest-tenured teammate.
- **Victory & Defeat Resolution**: Game ends automatically when all ships of an opposing fleet are sunk.

### 🏆 Post-Match Analysis & Leaderboard (`/scoreboard`)
- **Post-Match Summary**: Detailed end-of-battle performance metrics (shots fired, hit accuracy, ships sunk, victor status).
- **Authenticated Global Leaderboard**: Ranked stats tracking (Win Rate %, Total Wins, Matches Played) with sorting and filtering for registered commanders.

### 🔐 Authentication & Session Management
- **Instant Guest Play**: Automatic anonymous guest sign-in (`Guest-XXXX`) on initial launch.
- **Account Upgrades**: Link anonymous credentials to email/password in place via the Guest dropdown without losing active session state.
- **Stale Session Cleanup**: Automated sweeper (`sweepStaleGuestSessions`) for purging expired guest presence and profile records.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **UI & State** | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/), PostCSS |
| **Database & Auth** | [Firebase v12](https://firebase.google.com/) (Cloud Firestore & Firebase Authentication) |
| **Unit & Integration Testing** | [Vitest](https://vitest.dev/), [@firebase/rules-unit-testing](https://www.npmjs.com/package/@firebase/rules-unit-testing) |
| **End-to-End Testing** | [Playwright](https://playwright.dev/) |
| **Tooling & CI** | ESLint 9, Husky, lint-staged, GitHub Actions |

---

## 📂 Project Structure

```text
battleship-multiplayer/
├── .github/workflows/          # CI pipelines (staging build, rules deploy, QA matrix)
├── docs/                       # Architecture diagrams, BRD, HLD, and sprint specifications
├── public/                     # Static assets and icons
├── scripts/
│   └── load-smoke.mjs          # Soft NFR load testing script (50 concurrent sessions)
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Tactical Hub & Matchmaking
│   │   ├── lobby/              # Match & Crew Lobby Workspace
│   │   ├── placement/          # 10×10 Fleet Placement Workspace
│   │   ├── game/               # Tactical Battle Station & Combat Engine
│   │   └── scoreboard/         # Post-Match Summary & Global Leaderboard
│   ├── components/             # Modular UI & Game Components
│   │   ├── auth/               # Account modal, guest dropdown, login/register forms
│   │   ├── battle/             # Combat HUD, targeting radar, fleet health, turn timer
│   │   ├── feedback/           # Toast notifications, confirmation dialogs
│   │   ├── grid/               # 10×10 BattleGrid coordinate renderer
│   │   ├── hub/                # Quick Play, 1v1 invite, and crew match cards
│   │   ├── layout/             # Top navbar, profile status, audio toggles
│   │   ├── placement/          # Ship tray, drag preview, rotation controls
│   │   ├── scoreboard/         # Victory breakdown, leaderboard table
│   │   └── ui/                 # Reusable buttons, badges, modals, cards
│   └── lib/                    # Core business logic & Firebase services
│       ├── cleanup/            # Guest session sweeper & data purge
│       ├── firebase/           # Client SDK initialization & emulator wiring
│       ├── games/              # Combat transactions, shot resolution, turn order
│       ├── grid/               # Coordinate helpers, ship specs, placement validation
│       ├── leaderboard/        # Ranked match stats & leaderboard queries
│       ├── lobbies/            # Match lobby state, captain mutations, crew invites
│       ├── matches/            # Match initialization, team roster management
│       ├── presence/           # Heartbeat listeners & disconnect handling
│       └── profile/            # User profile data & nickname management
├── tests/
│   ├── e2e/                    # Playwright end-to-end browser specs
│   ├── emulator/               # Vitest integration tests against Firestore emulator
│   ├── firestore/              # Security rules unit tests (`rules.test.js`)
│   └── unit/                   # Vitest unit tests for game logic and domain models
├── firestore.rules             # Granular Firestore security rules
├── firestore.indexes.json      # Firestore composite indexes
├── firebase.json               # Firebase emulator & deployment configuration
└── package.json                # Project dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v24.0.0+` (refer to `.nvmrc`)
- **npm**: `v10+`
- **Java JRE**: Required to run the local Firebase emulator suite

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/avmarar/battleship-multiplayer.git
cd battleship-multiplayer
npm install
```

### 2. Environment Configuration

Copy the example environment configuration file:

```bash
cp .env.local.example .env.local
```

For **local development with emulators**, configure `.env.local` as follows:

```dotenv
# Firebase Configuration (Dummy values are sufficient when using emulators)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDemoKey"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="battleship-multiplayer-demo.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="battleship-multiplayer-demo"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="battleship-multiplayer-demo.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="000000000000"
NEXT_PUBLIC_FIREBASE_APP_ID="1:000000000000:web:0000000000000000000000"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-0000000000"

# App-specific Identifiers
NEXT_PUBLIC_APP_NAMESPACE="dev-squadron"
NEXT_PUBLIC_FIREBASE_ARTIFACTS_COLLECTION="artifacts"

# Set to true for local emulator development
NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"
```

### 3. Run Development Server

Start both the Firebase emulators (Auth & Firestore) and Next.js concurrently:

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).  
The Firebase Emulator Suite UI is available at [http://127.0.0.1:4000](http://127.0.0.1:4000) (Auth: `9099`, Firestore: `8080`).

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Firebase emulators and Next.js dev server in parallel |
| `npm run dev:next` | Starts only the Next.js dev server |
| `npm run emulators` | Starts the Firebase Firestore & Auth local emulators |
| `npm run build` | Compiles the production build |
| `npm run start` | Runs the compiled Next.js production server |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run typecheck` | Validates TypeScript types (`tsc --noEmit`) |
| `npm run test` | Runs the full test suite (unit + emulator integration) |
| `npm run test:unit` | Runs Vitest unit tests for domain logic and helpers |
| `npm run test:integration` | Runs Vitest emulator integration tests |
| `npm run test:rules` | Spins up the Firestore emulator and runs security rules tests |
| `npm run test:firebase` | Executes security rules and emulator integration suites within an automated emulator instance |
| `npm run test:e2e` | Runs Playwright end-to-end browser tests |
| `npm run test:e2e:install` | Downloads the required Chromium browser for Playwright |
| `npm run test:load-smoke` | Executes the 50-session concurrent presence load test |

---

## 🧪 Testing & Quality Assurance

### Unit Tests
Unit tests cover ship placement calculations, coordinate translations, team ready states, and captain assignments:
```bash
npm run test:unit
```

### Firestore Security Rules & Integration Tests
Security rules strictly enforce turn authority, fog of war, placement boundaries, and captain authorizations.
```bash
# Automated emulator lifecycle execution
npm run test:firebase

# Or against an already running emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:rules:run
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:integration
```

### End-to-End (E2E) Testing
Playwright simulates multi-client gameplay (Quick Play matchmaking, fleet placement, simultaneous locks, battle turns, and scoreboard resolution):
```bash
# First time setup
npm run test:e2e:install

# Run tests
npm run test:e2e
```

### Soft Load Smoke Test (NFR-LOAD)
Verifies that the system can handle 50 concurrent client presence heartbeats and document writes without contention:
```bash
npm run test:load-smoke
```

---

## 🔒 Security & Firestore Data Model

- **Match & Lobby Isolation**: Lobbies and matches (`matches/{id}`) maintain team assignments, join requests, and captain IDs with strict member-level write permissions.
- **Combat Isolation & Fog of War**: Game documents (`games/{id}`) maintain round-robin turn order, active shooter IDs, and hit registries. Fleets are locked into protected subpaths so opponents cannot inspect hidden ship locations prior to sinking.
- **Turn Authority**: Shots can only be fired during an active player's designated turn against valid un-targeted coordinates.
- **Ranked Leaderboard Protection**: Leaderboard records (`leaderboard/{uid}`) are written exclusively upon match completion for fully authenticated players.

---

## 🌿 Git & Contribution Workflow

- `master`: Production / release-ready branch.
- `develop`: Main integration branch for sprint features.
- `feature/*`: Short-lived feature branches created from `develop` and merged back via Pull Requests.

Pre-commit hooks managed by **Husky** automatically run `lint-staged` (ESLint) and `tsc --noEmit` before any commit is accepted.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
