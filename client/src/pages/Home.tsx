import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCreateRoom } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Ghost, Settings } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="inline-block bg-primary text-white p-6 rounded-3xl rotate-3 shadow-xl mb-6"
          >
            <Ghost className="w-16 h-16" />
          </motion.div>
          <h1 className="text-6xl font-display text-primary drop-shadow-sm mb-2 uppercase">Imposter</h1>
          <p className="text-muted-foreground font-medium text-lg italic">One Device Party Mode</p>
        </div>

        {/* Main card */}
        <div className="card-playful p-8">
          <motion.form
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onSubmit={handleCreate}
            className="flex flex-col gap-6"
          >
            <h2 className="text-2xl font-bold text-center">Start a Party</h2>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Your Name (Host)</label>
              <Input
                autoFocus
                placeholder="e.g. Alex"
                className="h-14 text-lg rounded-xl border-4 border-border/50 focus:border-primary px-4 bg-background"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={16}
                data-testid="input-host-name"
              />
            </div>

            <PlayfulButton
              type="submit"
              className="w-full text-xl py-8"
              disabled={createRoom.isPending || !name.trim()}
              data-testid="button-create-party"
            >
              {createRoom.isPending ? "Setting up..." : "Create Party Room"}
            </PlayfulButton>
          </motion.form>
        </div>

        {/* Settings button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setLocation('/settings')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium px-4 py-2 rounded-xl hover:bg-card"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
            Category Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
