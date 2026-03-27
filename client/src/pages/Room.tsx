import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useRoom, useStartGame, useNextRound, useRevealPlayer, useEndGame, useCategories, useCreateCategory, useSuggestWords } from "@/hooks/use-game";
import { useSettings } from "@/hooks/use-settings";
import { CategoryEditor } from "@/components/CategoryEditor";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Loader2, UserPlus, Trash2, ChevronDown, ChevronUp, Eye, Ghost, Star, Minus, Plus, Check, Settings2, Pencil, Sparkles, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { buildUrl, api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Player, Room, Category } from "@shared/schema";

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
        <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">Secret for</p>
        <h2 className="text-4xl font-display mb-8 text-gradient">{player.name}</h2>

        <div
          className={`p-8 rounded-3xl border-2 mb-8 ${
            player.isImposter
              ? "bg-secondary/15 border-secondary/60"
              : "bg-primary/15 border-primary/50"
          }`}
        >
          {player.isImposter ? (
            <>
              <Ghost className="w-14 h-14 text-secondary mx-auto mb-4" />
              <div className="text-5xl font-black text-secondary uppercase tracking-tighter">
                IMPOSTER
              </div>
              <p className="text-secondary/70 mt-4 font-medium">
                Category: {room.currentCategory}
              </p>
              <p className="text-sm text-secondary/60 mt-1">
                Blend in. Give a clue that fits!
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">
                Category
              </p>
              <p className="text-xl font-bold text-primary mb-6">{room.currentCategory}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">
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
        <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">
          Category
        </p>
        <h2 className="text-4xl font-display text-gradient mb-4">{room.currentCategory}</h2>
        {startingPlayer && (
          <div className="bg-secondary/15 border border-secondary/40 rounded-xl px-4 py-3 inline-block">
            <p className="font-bold text-sm">
              <span className="text-secondary/70">Starting player: </span>
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
            className="bg-primary/10 border border-primary/30 rounded-xl py-3 text-center font-bold text-sm"
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
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-primary/40 rounded-2xl shadow-xl z-40 overflow-hidden"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary/60 px-4 pt-3 pb-2">
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
  const [, setLocation] = useLocation();
  const code = params?.code;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useRoom(code);
  const startGame = useStartGame(code || "");
  const nextRound = useNextRound(code || "");
  const revealPlayer = useRevealPlayer(code || "");
  const endGame = useEndGame(code || "");
  const { settings, update: updateSettings } = useSettings();
  const { data: categories } = useCategories();

  const [newName, setNewName] = useState("");
  const [imposterCount, setImposterCount] = useState(1);
  const [showCategories, setShowCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const getSelectedIds = () => {
    if (!categories) return [];
    return settings.selectedCategoryIds ?? categories.map(c => c.id);
  };

  const toggleCategory = (id: number) => {
    if (!categories) return;
    const current = getSelectedIds();
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    updateSettings({ selectedCategoryIds: updated });
  };

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
              className="card-playful p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center h-10">
                <button
                  onClick={() => setLocation('/')}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium shrink-0"
                  data-testid="button-back-home"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <h1 className="text-3xl font-display flex-1 text-center pr-10 text-gradient">Party Setup</h1>
              </div>

              {/* Add player row */}
              <div className="flex gap-2">
                <Input
                  placeholder="Player name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newName.trim()) addPlayer.mutate(newName.trim());
                  }}
                  className="h-12 bg-muted/60 border-border focus:border-primary rounded-xl"
                  data-testid="input-player-name"
                />
                <PlayfulButton
                  size="sm"
                  onClick={() => { if (newName.trim()) addPlayer.mutate(newName.trim()); }}
                  disabled={!newName.trim() || addPlayer.isPending}
                  className="h-12 px-4 shrink-0"
                  data-testid="button-add-player"
                >
                  <UserPlus className="w-5 h-5" />
                </PlayfulButton>
              </div>

              {/* Player list */}
              <div className="flex flex-col gap-1.5 max-h-[32vh] overflow-y-auto">
                {players.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between h-12 bg-primary/10 px-4 rounded-xl border border-primary/30"
                  >
                    <span className="font-bold text-sm">{p.name}</span>
                    <button
                      onClick={() => removePlayer.mutate(p.id)}
                      className="text-primary/50 hover:text-secondary transition-colors p-1"
                      data-testid={`button-remove-player-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {players.length === 0 && (
                  <p className="text-center text-primary/50 py-3 text-sm">
                    Add at least 3 players to start
                  </p>
                )}
              </div>

              {/* Imposter count */}
              <div className="bg-secondary/10 border border-secondary/30 rounded-xl px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest mb-3 text-center text-secondary/80">
                  Imposters
                </p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setImposterCount(c => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                    data-testid="button-imposter-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-4xl font-display w-12 text-center text-gradient">{imposterCount}</span>
                  <button
                    onClick={() => setImposterCount(c => Math.min(Math.max(1, players.length - 2), c + 1))}
                    className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                    data-testid="button-imposter-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category selector */}
              <div className="border border-primary/40 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowCategories(v => !v)}
                  className="w-full flex items-center justify-between h-12 px-4 bg-primary/10 hover:bg-primary/15 transition-colors"
                  data-testid="button-toggle-categories-panel"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary/70" />
                    <span className="font-bold text-sm">Categories</span>
                    {categories && (
                      <span className="text-xs text-primary/60">
                        ({getSelectedIds().length}/{categories.length})
                      </span>
                    )}
                  </div>
                  {showCategories
                    ? <ChevronUp className="w-4 h-4 text-primary/70" />
                    : <ChevronDown className="w-4 h-4 text-primary/70" />}
                </button>

                <AnimatePresence>
                  {showCategories && categories && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-3 pb-3 pt-2 flex flex-col gap-1 border-t border-border/30">
                        {categories.map(cat => {
                          const isSelected = getSelectedIds().includes(cat.id);
                          return (
                            <div
                              key={cat.id}
                              className={`flex items-center h-11 rounded-lg transition-colors ${isSelected ? 'bg-primary/10' : 'opacity-40'}`}
                            >
                              <button
                                onClick={() => toggleCategory(cat.id)}
                                data-testid={`button-lobby-toggle-category-${cat.id}`}
                                className="flex items-center gap-3 flex-1 px-3 h-full text-left"
                              >
                                <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="font-medium text-sm">{cat.name}</span>
                              </button>
                              <button
                                onClick={() => setEditingCategory(cat)}
                                data-testid={`button-lobby-edit-category-${cat.id}`}
                                className="px-3 h-full text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => setCreatingCategory(true)}
                          data-testid="button-lobby-new-category"
                          className="flex items-center gap-2 h-11 w-full px-3 text-sm font-medium text-primary hover:bg-primary/8 rounded-lg transition-colors mt-1 border border-dashed border-primary/40"
                        >
                          <Plus className="w-4 h-4" />
                          New Category
                        </button>
                        {getSelectedIds().length === 0 && (
                          <p className="text-xs text-destructive text-center py-1 font-medium">
                            Select at least one category
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <PlayfulButton
                size="lg"
                className="w-full"
                onClick={() => startGame.mutate({
                  selectedCategoryIds: settings.selectedCategoryIds || undefined,
                  hiddenWords: settings.hiddenWords,
                })}
                disabled={players.length < 3 || startGame.isPending || getSelectedIds().length === 0}
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
                <h2 className="text-3xl font-display mb-1 text-gradient">Secret Reveal</h2>
                <p className="text-primary/50 text-sm">
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
                      className={`flex flex-col items-center justify-center py-7 rounded-3xl border-2 font-bold text-xl transition-all
                        ${
                          seen
                            ? "bg-muted/20 border-border/30 text-foreground/25 cursor-default"
                            : "bg-primary text-white border-primary/60 shadow-lg cursor-pointer"
                        }`}
                    >
                      {seen && <Eye className="w-5 h-5 mb-1 opacity-40" />}
                      {p.name}
                      {seen && <span className="text-xs font-normal mt-1 opacity-40">Done</span>}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-primary/50">
                {revealedIds.length} / {players.length} players have seen their role
              </p>

              {/* All revealed */}
              <AnimatePresence>
                {allRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-playful p-6 text-center border-primary/50 bg-primary/10"
                  >
                    <Star className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="text-2xl font-display mb-1">Everyone's ready!</h3>
                    <p className="text-primary/60 text-sm mb-5">
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

      {/* Category word editor */}
      <AnimatePresence>
        {editingCategory && (
          <CategoryEditor
            category={editingCategory}
            onClose={() => setEditingCategory(null)}
            onDeleted={() => setEditingCategory(null)}
          />
        )}
      </AnimatePresence>

      {/* New category sheet */}
      <AnimatePresence>
        {creatingCategory && (
          <NewCategorySheet onClose={() => setCreatingCategory(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── New Category bottom sheet ───────────────────────────────────────────────
function NewCategorySheet({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const suggestWords = useSuggestWords();

  const [name, setName] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState("");

  const addWord = () => {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    if (words.map(w => w.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast({ title: "Word already added", variant: "destructive" });
      return;
    }
    setWords(prev => [...prev, trimmed]);
    setWordInput("");
  };

  const handleAiFill = async () => {
    if (!name.trim()) {
      toast({ title: "Enter a category name first", variant: "destructive" });
      return;
    }
    try {
      const result = await suggestWords.mutateAsync(name.trim());
      const toAdd = result.words.filter(
        w => !words.map(x => x.toLowerCase()).includes(w.toLowerCase())
      );
      setWords(prev => [...prev, ...toAdd].slice(0, 50));
      toast({ title: `Added ${toAdd.length} AI-generated words!` });
    } catch (err: any) {
      toast({ title: "AI unavailable", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!name.trim() || words.length < 2) return;
    try {
      await createCategory.mutateAsync({ name: name.trim(), words });
      toast({ title: `"${name.trim()}" category created!` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 top-16 bg-background rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-primary/20 flex-shrink-0">
          <h2 className="text-2xl font-display text-gradient">New Category</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            data-testid="button-close-new-category"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Name input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-primary/60 block mb-2">
              Category Name
            </label>
            <Input
              placeholder="e.g. Movies, Video Games, Cities..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12"
              data-testid="input-new-category-name"
            />
          </div>

          {/* AI Fill */}
          <PlayfulButton
            variant="outline"
            className="w-full"
            onClick={handleAiFill}
            disabled={suggestWords.isPending || !name.trim()}
            data-testid="button-ai-fill-new-category"
          >
            {suggestWords.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> AI Fill Words</>
            )}
          </PlayfulButton>

          {/* Add word manually */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-primary/60 block mb-2">
              Words ({words.length})
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Type a word and press Enter..."
                value={wordInput}
                onChange={e => setWordInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addWord(); }}
                className="h-11"
                data-testid="input-new-category-word"
              />
              <PlayfulButton onClick={addWord} disabled={!wordInput.trim()} data-testid="button-add-new-category-word">
                <Plus className="w-5 h-5" />
              </PlayfulButton>
            </div>

            {words.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {words.map(w => (
                    <motion.div
                      key={w}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center justify-between bg-primary/15 border border-primary/40 rounded-xl px-3 py-2.5 group"
                    >
                      <span className="font-medium text-sm truncate">{w}</span>
                      <button
                        onClick={() => setWords(prev => prev.filter(x => x !== w))}
                        className="text-secondary opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity ml-2 flex-shrink-0"
                        data-testid={`button-remove-new-word-${w}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-primary/20 flex-shrink-0">
          <PlayfulButton
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || words.length < 2 || createCategory.isPending}
            data-testid="button-save-new-category"
          >
            {createCategory.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Save Category${words.length >= 2 ? ` (${words.length} words)` : ""}`
            )}
          </PlayfulButton>
          {words.length < 2 && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Add at least 2 words to save
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
