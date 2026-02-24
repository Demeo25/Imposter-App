## Packages
framer-motion | Page transitions and playful bouncy animations
canvas-confetti | Celebration effects for the winning screens
@types/canvas-confetti | Types for confetti
lucide-react | Already installed, but emphasizing usage for game icons

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  sans: ["var(--font-sans)"],
}

Local storage is used to persist the player's session (playerId and roomCode) across refreshes.
Game rooms poll GET /api/rooms/:code every 2 seconds to receive real-time updates without WebSockets.
