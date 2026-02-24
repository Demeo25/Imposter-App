import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { type Room, type Player } from "@shared/schema";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Ghost, Trophy, Skull } from "lucide-react";
import { useSubmitGuess } from "@/hooks/use-game";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Props {
  room: Room;
  players: Player[];
  me: Player;
  isHost: boolean;
  onPlayAgain: () => void;
}

export function PhaseFinished({ room, players, me, isHost, onPlayAgain }: Props) {
  const imposter = players.find(p => p.isImposter);
  const imposterEliminated = imposter?.eliminated;
  
  const [guessWord, setGuessWord] = useState("");
  const submitGuess = useSubmitGuess(room.code);
  const { toast } = useToast();

  // Local state to show if guess was correct without needing backend event
  const [guessResult, setGuessResult] = useState<'pending' | 'correct' | 'wrong'>('pending');

  const imposterWins = (imposterEliminated === false) || guessResult === 'correct';
  const crewWins = imposterEliminated && guessResult !== 'correct';

  useEffect(() => {
    if (imposterWins || crewWins) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: imposterWins ? ['#ef4444', '#000000'] : ['#8b5cf6', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: imposterWins ? ['#ef4444', '#000000'] : ['#8b5cf6', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [imposterWins, crewWins]);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imposter) return;
    try {
      const res = await submitGuess.mutateAsync({ imposterId: imposter.id, guessedWord: guessWord });
      setGuessResult(res.correct ? 'correct' : 'wrong');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const isMyTurnToGuess = me.isImposter && imposterEliminated && guessResult === 'pending';

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto w-full gap-8">
      
      {/* Title Header */}
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4">
        {guessResult === 'correct' ? (
          <>
            <Ghost className="w-24 h-24 text-destructive mx-auto mb-4" />
            <h1 className="text-5xl font-display text-destructive">IMPOSTER STEALS IT!</h1>
            <p className="text-xl font-bold mt-2">They guessed the word correctly!</p>
          </>
        ) : imposterEliminated && guessResult === 'pending' ? (
          <>
            <Skull className="w-24 h-24 text-primary mx-auto mb-4" />
            <h1 className="text-5xl font-display text-primary">IMPOSTER CAUGHT!</h1>
            <p className="text-xl font-bold mt-2">But they get one final chance...</p>
          </>
        ) : imposterEliminated && guessResult === 'wrong' ? (
          <>
            <Trophy className="w-24 h-24 text-primary mx-auto mb-4" />
            <h1 className="text-5xl font-display text-primary">CREW WINS!</h1>
            <p className="text-xl font-bold mt-2">The imposter failed to guess the word.</p>
          </>
        ) : (
          <>
            <Ghost className="w-24 h-24 text-destructive mx-auto mb-4" />
            <h1 className="text-5xl font-display text-destructive">IMPOSTER SURVIVES!</h1>
            <p className="text-xl font-bold mt-2">They blended in perfectly.</p>
          </>
        )}
      </motion.div>

      {/* The Reveal Card */}
      <div className="card-playful p-8 w-full border-4 border-border bg-card shadow-xl">
        <h3 className="text-lg font-bold text-muted-foreground uppercase tracking-widest mb-6">The Real Imposter Was</h3>
        <div className="flex justify-center mb-6">
          <PlayerAvatar name={imposter?.name || "Unknown"} className="scale-125 origin-center" />
        </div>
        
        <div className="bg-primary/5 rounded-2xl p-6 mt-8 border-2 border-primary/20">
          <p className="text-muted-foreground font-bold uppercase text-sm mb-2">The secret word was</p>
          <p className="text-4xl font-display text-primary">{room.currentWord}</p>
        </div>
      </div>

      {/* Imposter Guessing UI */}
      {isMyTurnToGuess && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full">
          <form onSubmit={handleGuess} className="card-playful p-6 border-destructive flex flex-col gap-4 bg-destructive/5">
            <h3 className="text-2xl font-bold text-destructive">Steal the Win!</h3>
            <p className="font-medium">You were caught. Guess the secret word to win anyway.</p>
            <div className="flex gap-4">
              <Input 
                autoFocus
                placeholder="Enter word..." 
                className="flex-1 h-14 text-xl font-bold text-center rounded-xl border-4 border-destructive/30"
                value={guessWord}
                onChange={(e) => setGuessWord(e.target.value)}
                disabled={submitGuess.isPending}
              />
              <PlayfulButton type="submit" variant="destructive" disabled={!guessWord || submitGuess.isPending}>
                Guess
              </PlayfulButton>
            </div>
          </form>
        </motion.div>
      )}

      {/* Waiting for guess UI for others */}
      {!me.isImposter && imposterEliminated && guessResult === 'pending' && (
        <div className="text-xl font-bold text-muted-foreground animate-pulse">
          Waiting for Imposter to guess...
        </div>
      )}

      {/* Host Controls */}
      {isHost && (!imposterEliminated || guessResult !== 'pending' || !imposterEliminated) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1 } }}>
          <PlayfulButton size="lg" className="w-64 text-xl mt-8" onClick={onPlayAgain}>
            Play Again
          </PlayfulButton>
        </motion.div>
      )}
    </div>
  );
}
