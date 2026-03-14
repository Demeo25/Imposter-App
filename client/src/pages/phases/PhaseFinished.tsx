import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { type Room, type Player } from "@shared/schema";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Ghost, Trophy } from "lucide-react";

interface Props {
  room: Room;
  players: Player[];
  onPlayAgain: () => void;
}

export function PhaseFinished({ room, players, onPlayAgain }: Props) {
  const imposter = players.find(p => p.isImposter);

  useEffect(() => {
    const duration = 3500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#8b5cf6', '#10b981', '#f59e0b'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#8b5cf6', '#10b981', '#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="flex flex-col items-center text-center gap-8 w-full">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
        <Trophy className="w-20 h-20 text-primary mx-auto mb-3" />
        <h1 className="text-5xl font-display">Game Over!</h1>
        <p className="text-muted-foreground mt-2 text-lg">Time to reveal the truth...</p>
      </motion.div>

      {/* Imposter reveal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card-playful p-8 w-full border-4 border-destructive/30 bg-destructive/5"
      >
        <Ghost className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">The Imposter was...</p>
        {imposter ? (
          <>
            <div className="flex justify-center mb-3">
              <PlayerAvatar name={imposter.name} className="scale-125 origin-center" />
            </div>
            <h2 className="text-4xl font-display text-destructive">{imposter.name}</h2>
          </>
        ) : (
          <p className="text-muted-foreground italic">Unknown</p>
        )}
      </motion.div>

      {/* Word reveal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="card-playful p-8 w-full border-4 border-primary/30 bg-primary/5"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">The secret word was</p>
        <p className="text-sm text-muted-foreground mb-4">Category: {room.currentCategory}</p>
        <div className="text-5xl font-display text-primary">{room.currentWord}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="w-full"
      >
        <PlayfulButton size="lg" className="w-full text-xl" onClick={onPlayAgain} data-testid="button-play-again">
          Play Again
        </PlayfulButton>
      </motion.div>
    </div>
  );
}
