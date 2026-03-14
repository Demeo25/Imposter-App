import { useState } from "react";
import { motion } from "framer-motion";
import { type Room, type Player } from "@shared/schema";
import { useSubmitVote } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { CheckCircle2 } from "lucide-react";

interface Props {
  room: Room;
  players: Player[];
}

export function PhaseVoting({ room, players }: Props) {
  const submitVote = useSubmitVote(room.code);
  const [votingPlayerId, setVotingPlayerId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const votingPlayer = players.find(p => p.id === votingPlayerId);
  const votesIn = players.filter(p => p.votedForId !== null).length;

  const handleConfirmVote = () => {
    if (!votingPlayerId || !selectedId) return;
    submitVote.mutate({ voterId: votingPlayerId, votedForId: selectedId });
    setVotingPlayerId(null);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="text-center">
        <h2 className="text-3xl font-display mb-1">Voting Time!</h2>
        <p className="text-muted-foreground text-sm">Each player taps their name, then picks who they think is the imposter.</p>
        <div className="mt-2 text-sm font-bold text-primary">{votesIn} / {players.length} voted</div>
      </div>

      {/* Who is voting? */}
      {!votingPlayerId && (
        <>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">Who's voting now?</p>
          <div className="grid grid-cols-2 gap-3">
            {players.map(p => {
              const hasVoted = p.votedForId !== null;
              return (
                <motion.button
                  key={p.id}
                  whileHover={hasVoted ? {} : { scale: 1.04 }}
                  whileTap={hasVoted ? {} : { scale: 0.96 }}
                  onClick={() => !hasVoted && setVotingPlayerId(p.id)}
                  disabled={hasVoted}
                  data-testid={`button-voting-player-${p.id}`}
                  className={`py-5 rounded-2xl font-bold text-lg border-4 transition-all
                    ${hasVoted
                      ? 'bg-muted text-muted-foreground border-muted opacity-50 cursor-default'
                      : 'bg-secondary text-white border-secondary shadow cursor-pointer hover:bg-secondary/90'
                    }`}
                >
                  {p.name}
                  {hasVoted && <div className="text-xs font-normal opacity-60 mt-1">Voted</div>}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {/* Vote selection for current player */}
      {votingPlayerId && votingPlayer && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">{votingPlayer.name}'s vote</p>
            <p className="text-muted-foreground text-sm">Who do you think is the imposter?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {players.map(p => {
              const isMe = p.id === votingPlayerId;
              const isSelected = selectedId === p.id;
              return (
                <motion.div
                  key={p.id}
                  whileHover={!isMe ? { scale: 1.04 } : {}}
                  whileTap={!isMe ? { scale: 0.96 } : {}}
                  onClick={() => !isMe && setSelectedId(p.id)}
                  data-testid={`button-vote-for-${p.id}`}
                  className={`relative flex flex-col items-center gap-3 py-5 rounded-2xl border-4 cursor-pointer transition-all
                    ${isMe ? 'opacity-40 cursor-not-allowed border-border/30 bg-muted' : ''}
                    ${isSelected && !isMe ? 'border-secondary bg-secondary/10' : 'border-border/40 bg-card hover:border-secondary/50'}
                  `}
                >
                  <PlayerAvatar name={p.name} />
                  <span className="font-bold text-sm">{p.name}</span>
                  {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                  {isSelected && !isMe && (
                    <div className="absolute -top-2 -right-2 bg-secondary text-white rounded-full p-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <PlayfulButton variant="outline" onClick={() => { setVotingPlayerId(null); setSelectedId(null); }} className="flex-1">
              Back
            </PlayfulButton>
            <PlayfulButton
              onClick={handleConfirmVote}
              disabled={!selectedId || submitVote.isPending}
              className="flex-1"
              data-testid="button-confirm-vote"
            >
              Lock In Vote
            </PlayfulButton>
          </div>
        </motion.div>
      )}
    </div>
  );
}
