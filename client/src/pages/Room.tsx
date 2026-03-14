import { useState } from "react";
import { useRoute } from "wouter";
import { useRoom, useStartGame, useNextRound, useRevealPlayer, useEndGame } from "@/hooks/use-game";
import { useSettings } from "@/hooks/use-settings";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Loader2, UserPlus, Trash2, ChevronDown, Eye, Ghost, Star, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { buildUrl, api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Player, Room } from "@shared/schema";

import { PhaseFinished } from "./phases/PhaseFinished";

// ─── Full-screen overlay when a player taps their bubble ───────────────────
function RevealOverlay({
  player,
  room,
  onDismiss,
}: {
  player: Player;
  room: Room;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        transition={{ type: "spring", damping: 18 }}
        className="card-playful p-8 w-full max-w-sm text-center"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Secret for</p>
        <h2 className="text-4xl font-display mb-8">{player.name}</h2>

        <div
          className={`p-8 rounded-3xl border-4 mb-8 ${
            player.isImposter
              ? "bg-destructive/10 border-destructive/30"
              : "bg-primary/10 border-primary/30"
          }`}
        >
          {player.isImposter ? (
            <>
              <Ghost className="w-14 h-14 text-destructive mx-auto mb-4" />
              <div className="text-5xl font-black text-destructive uppercase tracking-tighter">
                IMPOSTER
              </div>
              <p className="text-muted-foreground mt-4 font-medium">
                Category: {room.currentCategory}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Blend in. Give a clue that fits!
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Category
              </p>
              <p className="text-xl font-bold text-primary mb-6">{room.currentCategory}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Your Word
              </p>
              <div className="text-5xl font-display text-primary">{room.currentWord}</div>
            </>
          )}
        </div>

        <PlayfulButton
          size="lg"
          className="w-full"
          onClick={onDismiss}
          data-testid="button-hide-secret"
        >
          Got it — Hide!
        </PlayfulButton>
      </motion.div>
    </motion.div>
  );
}

// ─── Playing phase (category banner + forgot word + end game) ───────────────
function PhasePlaying({
  room,
  players,
  onEndGame,
}: {
  room: Room;
  players: Player[];
  onEndGame: () => void;
}) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotPlayer, setForgotPlayer] = useState<Player | null>(null);
  const startingPlayer = players.find(p => p.id === room.startingPlayerId);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Category banner */}
      <div className="card-playful p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Category
        </p>
        <h2 className="text-4xl font-display text-primary mb-4">{room.currentCategory}</h2>
        {startingPlayer && (
          <div className="bg-secondary/10 rounded-xl px-4 py-3 inline-block">
            <p className="font-bold text-sm">
              <span className="text-muted-foreground">Starting player: </span>
              <span className="text-foreground">{startingPlayer.name}</span>
            </p>
          </div>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          Remember your role and give one-word clues!
        </p>
      </div>

      {/* Players grid (decorative) */}
      <div className="grid grid-cols-2 gap-2">
        {players.map(p => (
          <div
            key={p.id}
            className="bg-card border-2 border-border/50 rounded-xl py-3 text-center font-bold text-sm"
          >
            {p.name}
          </div>
        ))}
      </div>

      {/* Forgot word dropdown */}
      <div className="relative">
        <PlayfulButton
          variant="outline"
          className="w-full"
          onClick={() => setForgotOpen(o => !o)}
          data-testid="button-forgot-word"
        >
          <ChevronDown
            className={`w-4 h-4 mr-2 transition-transform ${forgotOpen ? "rotate-180" : ""}`}
          />
          Forgot your word?
        </PlayfulButton>

        <AnimatePresence>
          {forgotOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-2xl shadow-xl z-40 overflow-hidden"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-2">
                Who needs a reminder?
              </p>
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setForgotPlayer(p);
                    setForgotOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 font-bold text-sm hover:bg-primary/10 transition-colors border-t border-border/30"
                  data-testid={`button-forgot-player-${p.id}`}
                >
                  {p.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* End Game */}
      <PlayfulButton
        size="lg"
        variant="destructive"
        className="w-full"
        onClick={onEndGame}
        data-testid="button-end-game"
      >
        End Game &amp; Reveal Imposter
      </PlayfulButton>

      {/* Forgot-word overlay (one-time re-reveal) */}
      <AnimatePresence>
        {forgotPlayer && (
          <RevealOverlay
            player={forgotPlayer}
            room={room}
            onDismiss={() => setForgotPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Room page ─────────────────────────────────────────────────────────
export default function Room() {
  const [, params] = useRoute("/room/:code");
  const code = params?.code;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useRoom(code);
  const startGame = useStartGame(code || "");
  const nextRound = useNextRound(code || "");
  const revealPlayer = useRevealPlayer(code || "");
  const endGame = useEndGame(code || "");
  const { settings } = useSettings();

  const [newName, setNewName] = useState("");
  const [imposterCount, setImposterCount] = useState(1);

  // Which player is currently showing their secret overlay in the reveal phase
  const [revealingPlayer, setRevealingPlayer] = useState<Player | null>(null);

  const addPlayer = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(buildUrl(api.rooms.addPlayer.path, { code: code! }), {
        method: api.rooms.addPlayer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add player");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["room", code] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removePlayer = useMutation({
    mutationFn: async (playerId: number) => {
      await fetch(
        buildUrl(api.rooms.removePlayer.path, { code: code!, id: playerId }),
        { method: api.rooms.removePlayer.method }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", code] }),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const { room, players } = data;
  const revealedIds: number[] = (room.revealedPlayerIds as number[]) || [];
  const allRevealed = players.length > 0 && revealedIds.length === players.length;

  const handleBubbleClick = (player: Player) => {
    if (revealedIds.includes(player.id)) return;
    setRevealingPlayer(player);
  };

  const handleRevealDismiss = () => {
    if (revealingPlayer) {
      revealPlayer.mutate(revealingPlayer.id);
    }
    setRevealingPlayer(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <main className="max-w-xl mx-auto w-full flex-1 flex flex-col py-4">
        <AnimatePresence mode="wait">

          {/* ── LOBBY ─────────────────────────────────────────────── */}
          {room.status === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card-playful p-6 flex flex-col gap-5"
            >
              <h1 className="text-3xl font-display text-center">Party Setup</h1>

              {/* Add player */}
              <div className="flex gap-2">
                <Input
                  placeholder="Player name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newName.trim()) addPlayer.mutate(newName.trim());
                  }}
                  data-testid="input-player-name"
                />
                <PlayfulButton
                  onClick={() => { if (newName.trim()) addPlayer.mutate(newName.trim()); }}
                  disabled={!newName.trim() || addPlayer.isPending}
                  data-testid="button-add-player"
                >
                  <UserPlus className="w-5 h-5" />
                </PlayfulButton>
              </div>

              {/* Player list */}
              <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto">
                {players.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-card px-4 py-3 rounded-xl border-2 border-border/50"
                  >
                    <span className="font-bold">{p.name}</span>
                    <PlayfulButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removePlayer.mutate(p.id)}
                      data-testid={`button-remove-player-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </PlayfulButton>
                  </div>
                ))}
                {players.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Add at least 3 players to start
                  </p>
                )}
              </div>

              {/* Imposter count */}
              <div className="bg-secondary/10 rounded-xl p-4">
                <p className="text-sm font-bold uppercase tracking-wider mb-3 text-center">
                  Number of Imposters
                </p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setImposterCount(c => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
                    data-testid="button-imposter-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-4xl font-display w-12 text-center">{imposterCount}</span>
                  <button
                    onClick={() =>
                      setImposterCount(c =>
                        Math.min(Math.max(1, players.length - 2), c + 1)
                      )
                    }
                    className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
                    data-testid="button-imposter-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <PlayfulButton
                size="lg"
                className="w-full"
                onClick={() => startGame.mutate({
                  selectedCategoryIds: settings.selectedCategoryIds || undefined,
                  hiddenWords: settings.hiddenWords,
                })}
                disabled={players.length < 3 || startGame.isPending}
                data-testid="button-start-game"
              >
                {startGame.isPending ? "Starting..." : "Start Party!"}
              </PlayfulButton>
              {players.length < 3 && (
                <p className="text-center text-xs text-muted-foreground">
                  Need at least 3 players
                </p>
              )}
            </motion.div>
          )}

          {/* ── REVEALING ─────────────────────────────────────────── */}
          {room.status === "revealing" && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <h2 className="text-3xl font-display mb-1">Secret Reveal</h2>
                <p className="text-muted-foreground text-sm">
                  Pass the phone around. Each player taps their own name to see their role.
                </p>
              </div>

              {/* Player bubbles */}
              <div className="grid grid-cols-2 gap-3">
                {players.map(p => {
                  const seen = revealedIds.includes(p.id);
                  return (
                    <motion.button
                      key={p.id}
                      onClick={() => handleBubbleClick(p)}
                      whileHover={seen ? {} : { scale: 1.04 }}
                      whileTap={seen ? {} : { scale: 0.95 }}
                      disabled={seen}
                      data-testid={`button-reveal-${p.id}`}
                      className={`flex flex-col items-center justify-center py-7 rounded-3xl border-4 font-bold text-xl transition-all
                        ${
                          seen
                            ? "bg-muted border-muted text-muted-foreground opacity-40 cursor-default"
                            : "bg-primary text-white border-primary shadow-lg cursor-pointer"
                        }`}
                    >
                      {seen && <Eye className="w-5 h-5 mb-1 opacity-50" />}
                      {p.name}
                      {seen && <span className="text-xs font-normal mt-1 opacity-60">Done</span>}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {revealedIds.length} / {players.length} players have seen their role
              </p>

              {/* All revealed */}
              <AnimatePresence>
                {allRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-playful p-6 text-center border-primary/30 bg-primary/5"
                  >
                    <Star className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="text-2xl font-display mb-1">Everyone's ready!</h3>
                    <p className="text-muted-foreground text-sm mb-5">
                      Remember your role — don't reveal it to others!
                    </p>
                    <PlayfulButton
                      size="lg"
                      className="w-full"
                      onClick={() => startGame.mutate({})}
                      disabled={startGame.isPending}
                      data-testid="button-begin-playing"
                    >
                      Begin Playing!
                    </PlayfulButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── PLAYING ───────────────────────────────────────────── */}
          {room.status === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PhasePlaying
                room={room}
                players={players}
                onEndGame={() => endGame.mutate()}
              />
            </motion.div>
          )}

          {/* ── FINISHED ──────────────────────────────────────────── */}
          {room.status === "finished" && (
            <motion.div
              key="finished"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PhaseFinished
                room={room}
                players={players}
                onPlayAgain={() => nextRound.mutate()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Full-screen reveal overlay */}
      <AnimatePresence>
        {revealingPlayer && (
          <RevealOverlay
            player={revealingPlayer}
            room={room}
            onDismiss={handleRevealDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
