# Imposter Party Game - Replit.md

## Overview

This is a multiplayer "Imposter" party game designed for single-device play. Players pass one device around and privately view their secret role (innocent player or imposter) and the current word. The game manages rooms, players, categories of words, and clue submission. It's a social deduction game where the imposter tries to blend in without knowing the secret word.

Key features:
- Create and join game rooms with 6-character codes
- Players take turns viewing their secret role on a shared device
- Category and word management (built-in + custom categories)
- Polling-based real-time updates (every 2 seconds) instead of WebSockets
- Player session persistence via localStorage
- Celebration effects on win screens

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query v5 for server state; hooks poll `/api/rooms/:code` every 2 seconds for real-time-like updates without WebSockets
- **UI Components**: shadcn/ui component library (Radix UI primitives + Tailwind CSS), plus a custom `PlayfulButton` component with a playful, bouncy design aesthetic
- **Styling**: Tailwind CSS with CSS variables for theming; custom fonts (Fredoka for display, Outfit for body); purple/pink/teal playful startup palette
- **Animations**: Framer Motion for page transitions and UI animations; canvas-confetti for win celebration effects
- **Session Persistence**: `localStorage` stores `playerId` and `roomCode` so players don't lose their session on refresh

**Page structure:**
- `/` → `Home.tsx` — Create a room, enter player name
- `/room/:code` → `Room.tsx` — Main game flow with reveal overlays and phase-based UI
- `/settings` → `Settings.tsx` — Manage word categories, toggle words on/off
- `phases/PhaseFinished.tsx` — End-of-game results screen

**Custom hooks:**
- `use-game.ts` — All API calls (rooms, players, clues, categories) via React Query
- `use-session.ts` — localStorage-backed playerId/roomCode session
- `use-settings.ts` — localStorage-backed category/word preferences
- `use-mobile.tsx` — Responsive breakpoint detection

### Backend Architecture

- **Runtime**: Node.js with Express (ESM modules via `tsx`)
- **API Style**: REST, all routes under `/api/...`
- **Route Definition**: Shared route schema in `shared/routes.ts` using Zod — both server and client import from this file for type-safe API contracts
- **Entry Point**: `server/index.ts` creates an HTTP server and registers routes
- **Development**: Vite dev server runs in middleware mode inside Express (hot module replacement via `/vite-hmr`)
- **Production Build**: esbuild bundles the server; Vite builds the client to `dist/public/`

**Key API endpoints:**
- `GET /api/categories` — List all word categories
- `POST /api/categories` — Create a custom category
- `POST /api/rooms` — Create a new game room (also creates the host player)
- `GET /api/rooms/:code` — Get room state with players and clues (polled every 2s)
- `POST /api/rooms/:code/join` — Join an existing room
- `POST /api/rooms/:code/start` — Host starts the game (assigns words and roles)
- `POST /api/rooms/:code/reveal` — Reveal next player's secret
- `POST /api/rooms/:code/next-round` — Advance to next round
- `POST /api/rooms/:code/end` — End the game

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres` with Drizzle ORM
- **Schema location**: `shared/schema.ts` (shared between client and server for type inference)
- **Migrations**: Drizzle Kit (`drizzle.config.ts`) outputs to `./migrations/`, uses `drizzle-kit push` for schema sync
- **Storage abstraction**: `server/storage.ts` defines an `IStorage` interface implemented by `DatabaseStorage` — makes swapping storage backends straightforward

**Database tables:**
- `categories` — Word categories (`id`, `name`, `words[]`, `isCustom`)
- `rooms` — Game rooms (`id`, `code`, `status`, `playerCount`, `imposterCount`, `currentCategory`, `currentWord`, `revealIndex`, `revealStep`, `startingPlayerId`, `selectedCategoryIds[]`, `revealedPlayerIds[]`, `gameEnded`)
- `players` — Players in rooms (`id`, `roomId`, `name`, `isHost`, `isImposter`, `score`, `votedForId`, `eliminated`, `forgotWordUsed`)
- `clues` — Clues submitted by players during a round (`id`, `roomId`, `playerId`, `word`)

### Game Flow

1. Host creates a room → gets a 6-character room code
2. Players join on the same device (no network joining in "one device party mode")
3. Host starts the game → server assigns one word and marks imposters
4. Device is passed around; each player taps their bubble to see their secret role/word in a fullscreen overlay
5. Players discuss, vote, submit clues
6. Game ends, scores are tallied, confetti fires on winner screen
7. Host can start a new round

## External Dependencies

### Runtime Dependencies
- **PostgreSQL** — Primary database; connection via `DATABASE_URL` environment variable (required)
- **drizzle-orm** + **drizzle-zod** — ORM and Zod schema generation from DB schema
- **express** — HTTP server framework
- **zod** — Runtime schema validation for API inputs/outputs (shared between client and server)
- **framer-motion** — Animation library for page transitions and UI effects
- **canvas-confetti** — Confetti celebration effect on win screens
- **nanoid** — Short unique ID generation (used for cache-busting in dev)
- **wouter** — Lightweight React router
- **@tanstack/react-query** — Server state management and polling
- **lucide-react** — Icon library
- **Radix UI** (full suite) — Accessible headless UI primitives underlying shadcn/ui components
- **tailwind-merge** + **clsx** + **class-variance-authority** — Tailwind class utilities

### Development Dependencies
- **Vite** + **@vitejs/plugin-react** — Frontend build tool and dev server
- **tsx** — TypeScript execution for server in dev mode
- **esbuild** — Server bundler for production
- **drizzle-kit** — Database schema management and migrations
- **@replit/vite-plugin-runtime-error-modal**, **@replit/vite-plugin-cartographer**, **@replit/vite-plugin-dev-banner** — Replit-specific Vite plugins (dev only)

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (must be set before server starts or drizzle config loads)