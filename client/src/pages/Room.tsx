import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useRoom, useStartGame, useNextRound } from "@/hooks/use-game";
import { useSession } from "@/hooks/use-session";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Loader2, Users, Settings, Crown, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

// Sub-components for phases
import { PhasePlaying } from "./phases/PhasePlaying";
import { PhaseVoting } from "./phases/PhaseVoting";
import { PhaseFinished } from "./phases/PhaseFinished";

export default function Room() {
  const [, params] = useRoute("/room/:code");
  const code = params?.code;
  const [_, setLocation] = useLocation();
  const { session } = useSession();
  const { toast } = useToast();

  const { data, isLoading, error } = useRoom(code);
  const startGame = useStartGame(code || "");
  const nextRound = useNextRound(code || "");

  // Redirect if no session or room error
  useEffect(() => {
    if (!session && !isLoading) {
      setLocation("/");
      toast({ title: "Session Expired", description: "Please rejoin the room." });
    }
  }, [session, isLoading, setLocation, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Room Not Found</h2>
        <PlayfulButton onClick={() => setLocation("/")}>Go Home</PlayfulButton>
      </div>
    );
  }

  if (isLoading || !data || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const { room, players, clues } = data;
  const me = players.find(p => p.id === session.playerId);
  const isHost = me?.isHost;

  if (!me) {
    setLocation("/");
    return null;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between p-4 md:p-6 bg-card border-b-4 border-border/50 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div 
          onClick={copyCode}
          className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold cursor-pointer hover:bg-primary/20 transition-colors"
        >
          <span className="text-sm uppercase tracking-wider opacity-80">Room</span>
          <span className="text-xl tracking-widest">{room.code}</span>
          <Copy className="w-4 h-4 ml-1" />
        </div>
      </div>
      <div className="flex items-center gap-3 bg-secondary/10 text-secondary px-4 py-2 rounded-xl font-bold">
        <Users className="w-5 h-5" />
        <span>{players.length} / {room.playerCount}</span>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderHeader()}

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* WAITING PHASE */}
          {room.status === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-8"
            >
              <div className="max-w-md w-full card-playful p-8">
                <h1 className="text-4xl font-display text-primary mb-2">Waiting for Players...</h1>
                <p className="text-muted-foreground mb-8">Share the code <strong>{room.code}</strong> with your friends!</p>
                
                <div className="flex flex-wrap justify-center gap-6 mb-8">
                  {players.map(p => (
                    <PlayerAvatar key={p.id} name={p.name} isHost={p.isHost} />
                  ))}
                  {Array.from({ length: Math.max(0, room.playerCount - players.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-16 h-16 rounded-full border-4 border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30">
                      ?
                    </div>
                  ))}
                </div>

                {isHost ? (
                  <div className="flex flex-col gap-4 mt-8 pt-8 border-t-4 border-border/30">
                    <PlayfulButton 
                      size="lg" 
                      onClick={() => startGame.mutate()}
                      disabled={players.length < 3 || startGame.isPending}
                    >
                      {startGame.isPending ? "Starting..." : "Start Game!"}
                    </PlayfulButton>
                    {players.length < 3 && (
                      <p className="text-sm text-destructive font-semibold">Need at least 3 players to start.</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 p-4 bg-primary/5 rounded-xl text-primary font-bold flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Waiting for host to start...
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PLAYING PHASE */}
          {room.status === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1">
              <PhasePlaying room={room} players={players} clues={clues} me={me} isHost={isHost} />
            </motion.div>
          )}

          {/* VOTING PHASE */}
          {room.status === 'voting' && (
            <motion.div key="voting" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
              <PhaseVoting room={room} players={players} me={me} isHost={isHost} />
            </motion.div>
          )}

          {/* FINISHED PHASE */}
          {room.status === 'finished' && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col">
              <PhaseFinished room={room} players={players} me={me} isHost={isHost} onPlayAgain={() => nextRound.mutate()} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
