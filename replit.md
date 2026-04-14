# Imposter Party Game - Replit.md

## Overview

This is a multiplayer "Imposter" party game designed for single-device play (pass-and-play). Players create persistent profiles, then select which profiles play each game. The device is passed around privately so each player sees their secret role. It's a social deduction game where the imposter tries to blend in without knowing the secret word.

Key features:
- **Persistent player profiles** with full stats (imposter W/L, crew W/L, bad word tally)
- Profile management on the home page (add, rename, delete, view stats)
- Create games by selecting which profiles are playing
- Players take turns viewing their secret role on a shared device
- Category and word management (built-in + custom categories with AI word generation)
- End-of-game resolution: mark each imposter Win/Loss, select bad-word offenders, save stats
- "Play Again" (same players, same settings) or "End Game" (back to home)
- Polling-based real-time updates (every 2 seconds)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query v5 for server state; hooks poll `/api/rooms/:code` every 2 seconds
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS) + custom `PlayfulButton`
- **Styling**: Tailwind CSS with "Midnight Arcade" dark theme (electric purple `267 100% 65%`, hot pink `330 100% 60%`); custom fonts (Fredoka display, Outfit body)
- **Animations**: Framer Motion for transitions and UI animations; canvas-confetti for win effects

**Page structure:**
- `/` → `Home.tsx` — Profile management, player selection, "New Game" button
- `/room/:code` → `Room.tsx` — Lobby setup → Secret Reveal → Playing → Game Over resolution
- `/settings` → `Settings.tsx` — Manage word categories, toggle words on/off
- `phases/PhaseFinished.tsx` — End-of-game results + Win/Loss marking + stat saving

**Custom hooks (client/src/hooks/):**
- `use-game.ts` — All API calls: rooms, players, categories, profiles, resolve
- `use-settings.ts` — localStorage-backed category/word preferences
- `use-mobile.tsx` — Responsive breakpoint detection

### Backend Architecture

- **Runtime**: Node.js with Express (ESM via `tsx`)
- **API Style**: REST, all routes under `/api/...`
- **Route Schema**: `shared/routes.ts` — Zod-typed API contracts shared by client and server
- **Entry Point**: `server/index.ts` → `server/routes.ts`
- **Storage Layer**: `server/storage.ts` — `IStorage` interface + `DatabaseStorage` class

**Key API endpoints:**
- `GET /api/profiles` — List all player profiles
- `POST /api/profiles` — Create a new profile
- `PATCH /api/profiles/:id` — Rename a profile
- `DELETE /api/profiles/:id` — Delete a profile
- `GET /api/categories` — List all word categories
- `POST /api/categories` — Create a custom category
- `POST /api/rooms` — Create a new game room with `{ profileIds, selectedCategoryIds?, imposterCount? }`
- `GET /api/rooms/:code` — Get room state with players and clues (polled every 2s)
- `POST /api/rooms/:code/start` — Start the game (assign roles + pick word)
- `POST /api/rooms/:code/reveal-player` — Mark a player as revealed
- `POST /api/rooms/:code/players` — Add a profile as a player to the room
- `DELETE /api/rooms/:code/players/:id` — Remove a player from the room
- `POST /api/rooms/:code/clue` — Submit a clue word
- `POST /api/rooms/:code/vote` — Vote to eliminate a player
- `POST /api/rooms/:code/end-game` — End the game (set status = finished)
- `POST /api/rooms/:code/resolve` — Save stats (W/L + bad word tallies) after game
- `POST /api/rooms/:code/next` — Reset room for another round

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`
- **Schema**: `shared/schema.ts` (shared between client and server)
- **Migrations**: `drizzle-kit push` via `npm run db:push`
- **Storage abstraction**: `IStorage` interface in `server/storage.ts`

**Database tables:**
- `profiles` — Persistent player profiles (`id`, `name`, `imposterWins`, `imposterLosses`, `nonImposterWins`, `nonImposterLosses`, `badWordTally`)
- `categories` — Word categories (`id`, `name`, `words[]`, `isCustom`)
- `rooms` — Game rooms (`id`, `code`, `status`, `imposterCount`, `currentCategory`, `currentWord`, `selectedCategoryIds[]`, `revealedPlayerIds[]`, etc.)
- `players` — Players in a game (`id`, `roomId`, `profileId` (nullable), `name`, `isHost`, `isImposter`, `score`, `votedForId`, `eliminated`, `forgotWordUsed`)
- `clues` — Clues submitted during play (`id`, `roomId`, `playerId`, `word`)

### Game Flow

1. **Home**: Manage profiles (create/rename/delete, view stats). Select which profiles play. Hit "New Game".
2. **Lobby** (Room - waiting): Shows selected players. Adjust imposter count and categories. Hit "Start Party!".
3. **Secret Reveal**: Device is passed around — each player taps their bubble to see their secret role privately.
4. **Playing**: Players discuss and give clues. Host hits "End Game & Reveal Imposter" when ready.
5. **Resolution** (Game Over): For each imposter, mark Win or Loss. Optionally flag bad-word offenders.
6. **Play Again** → stats saved, same room reset for another round.  
   **End Game** → stats saved, navigate home to adjust rosters.

### Resolve Logic

- `POST /api/rooms/:code/resolve` with `{ imposterResults: [{profileId, result}], badWordProfileIds: [] }`
- If ANY imposter won → non-imposters get a loss
- If ALL imposters lost → non-imposters get a win
- Bad word tallies incremented per profileId

## External Dependencies

- **PostgreSQL** — `DATABASE_URL` env var required
- **drizzle-orm** + **drizzle-zod** — ORM and Zod schema generation
- **express** — HTTP server
- **zod** — Runtime validation
- **framer-motion** — Animations
- **canvas-confetti** — Confetti effects
- **wouter** — React router
- **@tanstack/react-query** — Server state / polling
- **lucide-react** — Icons
- **openai** — AI word generation for categories (uses `AI_INTEGRATIONS_OPENAI_API_KEY`)
- **Radix UI** + **tailwind-merge** + **clsx** + **class-variance-authority** — UI primitives
