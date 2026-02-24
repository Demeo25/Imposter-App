import { useState } from "react";
import { motion } from "framer-motion";
import { type Room, type Player, type Clue } from "@shared/schema";
import { useSubmitClue, useNextRound } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Ghost, Sparkles, MessageCircle } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";

interface Props {
  room: Room;
  players: Player[];
  clues: (Clue & { player: Player })[];
  me: Player;
  isHost: boolean;
}

export function PhasePlaying({ room, players, clues, me, isHost }: Props) {
  const [clueWord, setClueWord] = useState("");
  const submitClue = useSubmitClue(room.code);
  const nextRound = useNextRound(room.code); // Note: we repurpose next round logic or we need a specific 'proceed to vote' route. 
  // Let's assume next round advances the state machine in backend. Wait, looking at routes: `next` proceeds state.

  const hasSubmitted = clues.some(c => c.playerId === me.id);
  const everyoneSubmitted = clues.length === players.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueWord.trim()) return;
    submitClue.mutate({ playerId: me.id, word: clueWord.trim() });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      {/* Secret Role Card */}
      <motion.div 
        initial={{ y: -50 }} animate={{ y: 0 }}
        className={`card-playful p-8 text-center ${me.isImposter ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5'}`}
      >
        <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-4">Your Secret Info</h2>
        
        {me.isImposter ? (
          <div className="flex flex-col items-center">
            <Ghost className="w-16 h-16 text-destructive mb-2" />
            <h3 className="text-4xl font-display text-destructive">You are the IMPOSTER</h3>
            <p className="mt-4 font-bold text-lg">Category: <span className="text-primary">{room.currentCategory}</span></p>
            <p className="text-muted-foreground mt-2">Blend in. Give a clue that fits the category.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Sparkles className="w-16 h-16 text-primary mb-2" />
            <h3 className="text-2xl font-bold">Category: <span className="text-primary">{room.currentCategory}</span></h3>
            <div className="bg-white px-8 py-4 rounded-2xl border-4 border-primary mt-6 inline-block">
              <span className="text-4xl font-display text-primary tracking-wider">{room.currentWord}</span>
            </div>
            <p className="text-muted-foreground mt-4">Give a 1-word clue to prove you know it.</p>
          </div>
        )}
      </motion.div>

      {/* Clue Input */}
      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="card-playful p-6 flex flex-col sm:flex-row gap-4">
          <Input 
            autoFocus
            placeholder="Type your 1-word clue..." 
            className="flex-1 h-14 text-xl font-bold text-center rounded-xl border-4 border-border/50"
            value={clueWord}
            onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ''))} // No spaces
            disabled={submitClue.isPending}
          />
          <PlayfulButton type="submit" disabled={!clueWord || submitClue.isPending} className="sm:w-32">
            Submit
          </PlayfulButton>
        </form>
      ) : (
        <div className="card-playful p-6 text-center text-primary font-bold text-xl flex items-center justify-center gap-3 bg-primary/5">
          <MessageCircle className="w-6 h-6" />
          Clue locked in! Waiting for others...
        </div>
      )}

      {/* Clues List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {players.map(p => {
          const theirClue = clues.find(c => c.playerId === p.id);
          return (
            <motion.div 
              key={p.id}
              layout
              className="bg-card p-4 rounded-2xl border-4 border-border/50 flex items-center gap-4 shadow-sm"
            >
              <PlayerAvatar name={p.name} className="scale-75 origin-left" />
              <div className="flex-1">
                <p className="font-bold text-sm text-muted-foreground">{p.name}</p>
                {theirClue ? (
                  <p className="text-xl font-display text-foreground">{theirClue.word}</p>
                ) : (
                  <p className="text-muted-foreground/50 italic text-sm">Thinking...</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {isHost && everyoneSubmitted && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-4">
          <PlayfulButton size="lg" variant="secondary" onClick={() => nextRound.mutate()}>
            Proceed to Voting
          </PlayfulButton>
        </motion.div>
      )}
    </div>
  );
}
