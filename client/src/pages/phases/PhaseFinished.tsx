import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { type Room, type Player } from "@shared/schema";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Ghost, Trophy, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Home } from "lucide-react";
import { useResolveGame } from "@/hooks/use-game";

interface Props {
  room: Room;
  players: Player[];
  onPlayAgain: () => void;
  onEndGame: () => void;
}

export function PhaseFinished({ room, players, onPlayAgain, onEndGame }: Props) {
  const imposters = players.filter(p => p.isImposter);
  const nonImposters = players.filter(p => !p.isImposter);
  const profiledImposters = imposters.filter(p => p.profileId != null);

  // keyed by player.id
  const [imposterResults, setImposterResults] = useState<Record<number, 'win' | 'loss'>>({});
  const [badWordPlayerIds, setBadWordPlayerIds] = useState<number[]>([]);
  const [badWordsOpen, setBadWordsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const resolveGame = useResolveGame(room.code);

  const allMarked = profiledImposters.length === 0 ||
    profiledImposters.every(p => imposterResults[p.id] !== undefined);

  useEffect(() => {
    const duration = 3500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#a855f7', '#ec4899', '#f59e0b'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#a855f7', '#ec4899', '#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const setImposterResult = (playerId: number, result: 'win' | 'loss') => {
    setImposterResults(prev => ({ ...prev, [playerId]: result }));
  };

  const toggleBadWord = (playerId: number) => {
    setBadWordPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(x => x !== playerId) : [...prev, playerId]
    );
  };

  const handleAction = async (action: 'playAgain' | 'endGame') => {
    setSaving(true);
    try {
      const imposterResultsList = imposters
        .filter(p => p.profileId != null && imposterResults[p.id] !== undefined)
        .map(p => ({ profileId: p.profileId!, result: imposterResults[p.id] }));

      const badWordProfileIds = players
        .filter(p => p.profileId != null && badWordPlayerIds.includes(p.id))
        .map(p => p.profileId!);

      await resolveGame.mutateAsync({ imposterResults: imposterResultsList, badWordProfileIds });
    } catch {
      // stats save failure — still proceed
    } finally {
      setSaving(false);
      if (action === 'playAgain') onPlayAgain();
      else onEndGame();
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-5 w-full">
      {/* Title */}
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
        <Trophy className="w-16 h-16 text-primary mx-auto mb-2" />
        <h1 className="text-5xl font-display text-gradient">Game Over!</h1>
        <p className="text-primary/50 mt-1 text-base">Time to reveal the truth...</p>
      </motion.div>

      {/* Imposter reveal(s) with Win / Loss marking */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full flex flex-col gap-3"
      >
        {imposters.length === 0 ? (
          <div className="card-playful p-6 border-2 border-secondary/60 bg-secondary/15 text-center">
            <Ghost className="w-10 h-10 text-secondary mx-auto mb-2" />
            <p className="text-secondary/70 font-bold">No imposter found</p>
          </div>
        ) : (
          imposters.map(imposter => {
            const result = imposterResults[imposter.id];
            const hasProfile = imposter.profileId != null;

            return (
              <div
                key={imposter.id}
                className="card-playful p-5 border-2 border-secondary/60 bg-secondary/15"
                data-testid={`card-imposter-${imposter.id}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Ghost className="w-8 h-8 text-secondary flex-shrink-0" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary/60">The Imposter</p>
                    <h2 className="text-2xl font-display text-secondary">{imposter.name}</h2>
                  </div>
                  <PlayerAvatar name={imposter.name} />
                </div>

                {hasProfile ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImposterResult(imposter.id, 'win')}
                      className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm border-2 transition-all ${
                        result === 'win'
                          ? 'bg-primary border-primary text-white glow-primary'
                          : 'border-primary/30 text-primary/60 hover:border-primary/60'
                      }`}
                      data-testid={`button-imposter-win-${imposter.id}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Imposter Won
                    </button>
                    <button
                      onClick={() => setImposterResult(imposter.id, 'loss')}
                      className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm border-2 transition-all ${
                        result === 'loss'
                          ? 'bg-secondary border-secondary text-white glow-secondary'
                          : 'border-secondary/30 text-secondary/60 hover:border-secondary/60'
                      }`}
                      data-testid={`button-imposter-loss-${imposter.id}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Imposter Lost
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-secondary/50 italic">No profile linked — stats not tracked</p>
                )}
              </div>
            );
          })
        )}
      </motion.div>

      {/* Secret word reveal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="card-playful p-5 w-full border-2 border-primary/50 bg-primary/15"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">The secret word was</p>
        <p className="text-xs text-primary/50 mb-3">Category: {room.currentCategory}</p>
        <div className="text-4xl font-display text-gradient">{room.currentWord}</div>
      </motion.div>

      {/* Bad words section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="w-full"
      >
        <button
          onClick={() => setBadWordsOpen(v => !v)}
          className="w-full flex items-center justify-between h-12 px-4 bg-muted/40 border border-border/50 rounded-xl hover:bg-muted/60 transition-colors"
          data-testid="button-toggle-bad-words"
        >
          <span className="font-bold text-sm text-foreground/80">
            Bad Words Used?
            {badWordPlayerIds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded-full font-bold">
                {badWordPlayerIds.length}
              </span>
            )}
          </span>
          {badWordsOpen ? <ChevronUp className="w-4 h-4 text-primary/60" /> : <ChevronDown className="w-4 h-4 text-primary/60" />}
        </button>

        <AnimatePresence>
          {badWordsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div className="pt-2 flex flex-col gap-1.5">
                <p className="text-xs text-primary/50 text-left px-1 mb-1">
                  Select anyone who gave away the word or said something inappropriate
                </p>
                {players.filter(p => p.profileId != null).map(player => {
                  const isMarked = badWordPlayerIds.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => toggleBadWord(player.id)}
                      className={`flex items-center gap-3 h-11 px-4 rounded-xl border-2 transition-colors text-left ${
                        isMarked
                          ? 'bg-secondary/15 border-secondary/50 text-secondary'
                          : 'bg-muted/30 border-border/40 text-foreground/70'
                      }`}
                      data-testid={`button-bad-word-${player.id}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                        isMarked ? 'bg-secondary border-secondary' : 'border-muted-foreground/40'
                      }`} />
                      <span className="font-medium text-sm">{player.name}</span>
                      {player.isImposter && (
                        <span className="text-xs text-secondary/60 ml-auto">(imposter)</span>
                      )}
                    </button>
                  );
                })}
                {players.filter(p => p.profileId != null).length === 0 && (
                  <p className="text-xs text-primary/40 text-center py-2">No profiled players in this game</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Resolution prompt when not all marked yet */}
      {profiledImposters.length > 0 && !allMarked && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-primary/50 font-medium"
        >
          Mark each imposter's result above to continue
        </motion.p>
      )}

      {/* Action buttons */}
      <AnimatePresence>
        {allMarked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-3"
          >
            <PlayfulButton
              size="lg"
              className="w-full text-xl"
              onClick={() => handleAction('playAgain')}
              disabled={saving}
              data-testid="button-play-again"
            >
              {saving ? "Saving..." : "Play Again"}
            </PlayfulButton>

            <button
              onClick={() => handleAction('endGame')}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-border/60 text-foreground/60 hover:text-foreground hover:border-border transition-colors text-sm font-medium"
              data-testid="button-end-game"
            >
              <Home className="w-4 h-4" />
              End Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
