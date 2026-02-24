import { useState } from "react";
import { motion } from "framer-motion";
import { type Room, type Player } from "@shared/schema";
import { useSubmitVote, useNextRound } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { CheckCircle2 } from "lucide-react";

interface Props {
  room: Room;
  players: Player[];
  me: Player;
  isHost: boolean;
}

export function PhaseVoting({ room, players, me, isHost }: Props) {
  const submitVote = useSubmitVote(room.code);
  const nextRound = useNextRound(room.code);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const hasVoted = me.votedForId !== null;
  const everyoneVoted = players.every(p => p.votedForId !== null);

  const handleVote = () => {
    if (!selectedId) return;
    submitVote.mutate({ voterId: me.id, votedForId: selectedId });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto items-center">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-display text-secondary mb-2">Voting Time</h1>
        <p className="text-lg text-muted-foreground font-medium">Who do you think is the Imposter?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
        {players.map(p => {
          const isMe = p.id === me.id;
          const isSelected = selectedId === p.id;
          
          return (
            <motion.div
              key={p.id}
              whileHover={!hasVoted && !isMe ? { scale: 1.05 } : {}}
              whileTap={!hasVoted && !isMe ? { scale: 0.95 } : {}}
              onClick={() => !hasVoted && !isMe && setSelectedId(p.id)}
              className={`
                relative p-6 rounded-[2rem] border-4 cursor-pointer transition-colors flex flex-col items-center gap-4
                ${isMe ? 'opacity-50 cursor-not-allowed border-border/50 bg-card' : ''}
                ${isSelected ? 'border-secondary bg-secondary/10' : 'border-border/50 bg-card hover:border-secondary/50'}
                ${hasVoted ? 'cursor-default pointer-events-none' : ''}
              `}
            >
              <PlayerAvatar name={p.name} />
              <span className="font-bold">{p.name}</span>
              {isMe && <span className="absolute top-4 right-4 text-xs font-bold text-muted-foreground bg-border px-2 py-1 rounded-full">(You)</span>}
              {isSelected && (
                <div className="absolute -top-3 -right-3 bg-secondary text-white rounded-full p-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!hasVoted && (
        <PlayfulButton 
          size="lg" 
          variant="secondary"
          className="w-full max-w-md mt-8" 
          disabled={!selectedId || submitVote.isPending}
          onClick={handleVote}
        >
          {submitVote.isPending ? "Locking in..." : "Lock in Vote"}
        </PlayfulButton>
      )}

      {hasVoted && (
        <div className="mt-8 text-xl font-bold text-primary bg-primary/10 px-8 py-4 rounded-2xl">
          Vote locked! Waiting for others...
        </div>
      )}

      {isHost && everyoneVoted && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 w-full max-w-md">
          <PlayfulButton size="lg" className="w-full" onClick={() => nextRound.mutate()}>
            Reveal Results
          </PlayfulButton>
        </motion.div>
      )}
    </div>
  );
}
