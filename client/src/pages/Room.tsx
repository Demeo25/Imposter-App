import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useRoom, useStartGame, useNextRound } from "@/hooks/use-game";
import { useSession } from "@/hooks/use-session";
import { PlayfulButton } from "@/components/ui/playful-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Loader2, Users, Settings, Crown, Trash2, UserPlus, Eye, EyeOff, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { buildUrl, api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useRoom(code);
  const startGame = useStartGame(code || "");
  const nextRound = useNextRound(code || "");

  const [newName, setNewName] = useState("");

  const addPlayer = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(buildUrl(api.rooms.addPlayer.path, { code: code! }), {
        method: api.rooms.addPlayer.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ['room', code] });
    }
  });

  const advanceReveal = useMutation({
    mutationFn: async () => {
      await fetch(buildUrl(api.rooms.advanceReveal.path, { code: code! }), { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] })
  });

  if (isLoading || !data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const { room, players, clues } = data;
  const me = players[room.revealIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <main className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {room.status === 'waiting' && (
            <motion.div key="waiting" className="card-playful p-6 flex flex-col gap-6">
              <h1 className="text-3xl font-display text-center">Party Setup</h1>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Add player name..." 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer.mutate(newName)}
                />
                <PlayfulButton onClick={() => addPlayer.mutate(newName)} disabled={!newName.trim()}>
                  <UserPlus className="w-5 h-5" />
                </PlayfulButton>
              </div>

              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-card p-3 rounded-xl border-2 border-border/50">
                    <span className="font-bold">{p.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                <div className="bg-secondary/10 p-4 rounded-xl">
                  <label className="text-sm font-bold uppercase mb-2 block">Imposters: {room.imposterCount}</label>
                  {/* Slider or selection could go here */}
                </div>
                <PlayfulButton size="lg" className="w-full" onClick={() => startGame.mutate()} disabled={players.length < 3}>
                  Start Party!
                </PlayfulButton>
              </div>
            </motion.div>
          )}

          {room.status === 'revealing' && (
            <motion.div key="reveal" className="flex-1 flex flex-col items-center justify-center text-center gap-8">
              <div className="card-playful p-10 w-full">
                {room.revealStep === 'name' && (
                  <>
                    <h2 className="text-4xl font-display mb-4">Pass the Phone!</h2>
                    <div className="text-6xl my-8 text-primary font-bold">{me?.name}</div>
                    <p className="text-xl text-muted-foreground">It's your turn to see the secret.</p>
                    <PlayfulButton size="lg" className="mt-8" onClick={() => advanceReveal.mutate()}>
                      I am {me?.name}
                    </PlayfulButton>
                  </>
                )}

                {room.revealStep === 'word' && (
                  <>
                    <h2 className="text-3xl font-display mb-8">Your Secret:</h2>
                    <div className="bg-primary/10 p-10 rounded-3xl border-4 border-primary/20 mb-8">
                      {me?.isImposter ? (
                        <div className="text-6xl font-black text-destructive uppercase tracking-tighter">IMPOSTER</div>
                      ) : (
                        <div className="text-5xl font-bold text-primary">{room.currentWord}</div>
                      )}
                    </div>
                    <p className="text-lg italic text-muted-foreground mb-8">Category: {room.currentCategory}</p>
                    <PlayfulButton size="lg" onClick={() => advanceReveal.mutate()}>
                      Got it! (Hide)
                    </PlayfulButton>
                  </>
                )}

                {room.revealStep === 'next' && (
                  <>
                    <h2 className="text-3xl font-display mb-4">Done!</h2>
                    <p className="text-xl mb-10">Pass the phone to the next player.</p>
                    <PlayfulButton size="lg" onClick={() => advanceReveal.mutate()}>
                      {room.revealIndex < players.length - 1 ? "Next Player" : "Start Game"}
                    </PlayfulButton>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {room.status === 'playing' && (
            <motion.div key="playing" className="flex-1 flex flex-col gap-6">
              <div className="card-playful p-6 text-center">
                <h2 className="text-2xl font-display mb-2">Game Started!</h2>
                <div className="text-primary font-bold text-lg mb-4">Category: {room.currentCategory}</div>
                <div className="bg-secondary/10 p-4 rounded-xl border-2 border-secondary/20 flex items-center justify-center gap-3">
                  <User className="w-6 h-6" />
                  <span className="text-xl">Starting Player: <span className="font-black underline">{players.find(p => p.id === room.startingPlayerId)?.name}</span></span>
                </div>
              </div>
              <PhasePlaying room={room} players={players} clues={clues} me={players[0]} isHost={true} />
            </motion.div>
          )}

          {room.status === 'voting' && (
            <PhaseVoting room={room} players={players} me={players[0]} isHost={true} />
          )}

          {room.status === 'finished' && (
            <PhaseFinished room={room} players={players} me={players[0]} isHost={true} onPlayAgain={() => nextRound.mutate()} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
