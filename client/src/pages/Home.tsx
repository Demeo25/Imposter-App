import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCreateRoom } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Ghost } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const createRoom = useCreateRoom();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const data = await createRoom.mutateAsync({ playerName: name.trim() });
      setLocation(`/room/${data.room.code}`);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-secondary/8 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="inline-block relative mb-6"
          >
            <div className="bg-primary/15 border border-primary/30 text-primary p-6 rounded-3xl rotate-3 glow-primary">
              <Ghost className="w-16 h-16" />
            </div>
          </motion.div>

          <h1 className="text-6xl font-display uppercase mb-2 text-gradient drop-shadow-sm">
            Imposter
          </h1>
          <p className="text-muted-foreground font-medium tracking-wide">
            One Device · Pass &amp; Play
          </p>
        </div>

        {/* Main card */}
        <div className="card-playful p-8">
          <motion.form
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleCreate}
            className="flex flex-col gap-5"
          >
            <h2 className="text-2xl font-display text-center text-foreground/90">
              Start a Party
            </h2>

            <div>
              <label className="block text-xs font-bold mb-2 text-muted-foreground uppercase tracking-widest">
                Your Name (Host)
              </label>
              <Input
                autoFocus
                placeholder="e.g. Alex"
                className="h-14 text-lg rounded-xl border border-border bg-muted/60 focus:border-primary focus:ring-0 px-4 placeholder:text-muted-foreground/50"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={16}
                data-testid="input-host-name"
              />
            </div>

            <PlayfulButton
              type="submit"
              className="w-full text-xl py-8 mt-1"
              disabled={createRoom.isPending || !name.trim()}
              data-testid="button-create-party"
            >
              {createRoom.isPending ? "Setting up..." : "Create Party Room"}
            </PlayfulButton>
          </motion.form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground/40 text-xs mt-6 tracking-wide">
          3–12 players · pass the phone · find the imposter
        </p>
      </motion.div>
    </div>
  );
}
