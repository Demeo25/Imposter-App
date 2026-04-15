import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useProfiles, useCreateProfile, useDeleteProfile, useRenameProfile, useCreateRoom } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Ghost, UserPlus, Trash2, Check, X, BarChart2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@shared/schema";

// ── Stat Card Overlay ──────────────────────────────────────────────────────────
function StatCard({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const totalGames = profile.imposterWins + profile.imposterLosses + profile.nonImposterWins + profile.nonImposterLosses;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        transition={{ type: "spring", damping: 20 }}
        className="card-playful p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-3xl font-display text-gradient">{profile.name}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            data-testid="button-close-stat-card"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        <p className="text-xs text-primary/50 uppercase tracking-widest mb-4 text-center">
          {totalGames} game{totalGames !== 1 ? "s" : ""} played
        </p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Imposter record */}
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary/70 mb-2">Imposter</p>
            <p className="text-2xl font-display text-secondary">{profile.imposterWins}W</p>
            <p className="text-lg font-bold text-foreground/60">{profile.imposterLosses}L</p>
          </div>
          {/* Non-imposter record */}
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Crew</p>
            <p className="text-2xl font-display text-primary">{profile.nonImposterWins}W</p>
            <p className="text-lg font-bold text-foreground/60">{profile.nonImposterLosses}L</p>
          </div>
          {/* Bad word tally */}
          <div className="bg-muted/60 border border-border/60 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Bad Words</p>
            <p className="text-2xl font-display text-foreground">{profile.badWordTally}</p>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profiles = [], isLoading } = useProfiles();
  const createProfile = useCreateProfile();
  const deleteProfile = useDeleteProfile();
  const renameProfile = useRenameProfile();
  const createRoom = useCreateRoom();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);

  const toggleProfile = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddProfile = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const p = await createProfile.mutateAsync(trimmed);
      setNewName("");
      setSelectedIds(prev => [...prev, p.id]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProfile.mutateAsync(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
      setDeletingId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRenameStart = (profile: Profile) => {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
    setDeletingId(null);
  };

  const handleRenameSave = async () => {
    if (!renamingId || !renameValue.trim()) return;
    try {
      await renameProfile.mutateAsync({ id: renamingId, name: renameValue.trim() });
      setRenamingId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleNewGame = async () => {
    if (selectedIds.length < 3) return;
    try {
      const data = await createRoom.mutateAsync({ profileIds: selectedIds });
      setLocation(`/room/${data.room.code}`);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    }
  };

  const selectedCount = selectedIds.filter(id => profiles.some(p => p.id === id)).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-secondary/8 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md relative z-10 flex flex-col gap-4"
      >
        {/* Logo */}
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="inline-block mb-4"
          >
            <div className="bg-primary/15 border border-primary/30 text-primary p-5 rounded-3xl rotate-3 glow-primary">
              <Ghost className="w-12 h-12" />
            </div>
          </motion.div>
          <h1 className="text-5xl font-display uppercase mb-1 text-gradient drop-shadow-sm">Imposter</h1>
          <p className="text-primary/50 text-sm tracking-wide">One Device · Pass &amp; Play</p>
        </div>

        {/* Player Roster */}
        <div className="card-playful p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-display text-gradient">Players</h2>
            <span className="text-xs font-bold text-primary/60">
              {selectedCount} selected
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-primary/40 text-sm">Loading...</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[42vh] overflow-y-auto pr-0.5">
              {profiles.map(profile => {
                const isSelected = selectedIds.includes(profile.id);
                const isDeleting = deletingId === profile.id;
                const isRenaming = renamingId === profile.id;

                return (
                  <motion.div
                    key={profile.id}
                    layout
                    className={`flex items-center rounded-xl border transition-colors overflow-hidden ${
                      isSelected ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/40"
                    }`}
                  >
                    {/* Checkbox toggle */}
                    <button
                      onClick={() => { toggleProfile(profile.id); setDeletingId(null); setRenamingId(null); }}
                      className="w-11 h-12 flex items-center justify-center flex-shrink-0"
                      data-testid={`button-toggle-profile-${profile.id}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>

                    {/* Name / rename input */}
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 bg-transparent text-sm font-bold px-1 py-2 outline-none border-b border-primary/40"
                        data-testid={`input-rename-profile-${profile.id}`}
                      />
                    ) : (
                      <button
                        onClick={() => setViewingProfile(profile)}
                        className="flex-1 text-left font-bold text-sm px-1 h-12 flex items-center gap-2"
                        data-testid={`button-view-profile-${profile.id}`}
                      >
                        {profile.name}
                        <BarChart2 className="w-3.5 h-3.5 text-primary/30 flex-shrink-0" />
                      </button>
                    )}

                    {/* Actions */}
                    {isRenaming ? (
                      <div className="flex">
                        <button
                          onClick={handleRenameSave}
                          className="w-10 h-12 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                          data-testid={`button-rename-save-${profile.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="w-10 h-12 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : isDeleting ? (
                      <div className="flex">
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="px-3 h-12 text-xs font-bold text-white bg-secondary hover:bg-secondary/90 transition-colors"
                          data-testid={`button-confirm-delete-profile-${profile.id}`}
                        >
                          Delete?
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="w-10 h-12 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex">
                        <button
                          onClick={() => handleRenameStart(profile)}
                          className="w-10 h-12 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors"
                          data-testid={`button-rename-profile-${profile.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeletingId(profile.id); setRenamingId(null); }}
                          className="w-10 h-12 flex items-center justify-center text-muted-foreground/50 hover:text-secondary transition-colors"
                          data-testid={`button-delete-profile-${profile.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {profiles.length === 0 && (
                <p className="text-center text-primary/40 py-5 text-sm">
                  Add players below to get started
                </p>
              )}
            </div>
          )}

          {/* Add player input */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-primary/20">
            <Input
              placeholder="Add new player..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddProfile(); }}
              className="h-11 bg-muted/60 border-border focus:border-primary rounded-xl"
              data-testid="input-new-profile-name"
            />
            <PlayfulButton
              onClick={handleAddProfile}
              disabled={!newName.trim() || createProfile.isPending}
              className="px-3"
              data-testid="button-add-profile"
            >
              <UserPlus className="w-5 h-5" />
            </PlayfulButton>
          </div>
        </div>

        {/* New Game Button */}
        <PlayfulButton
          size="lg"
          className="w-full text-xl py-7"
          onClick={handleNewGame}
          disabled={selectedCount < 3 || createRoom.isPending}
          data-testid="button-new-game"
        >
          {createRoom.isPending ? "Setting up..." : `New Game${selectedCount >= 3 ? ` (${selectedCount} players)` : ""}`}
        </PlayfulButton>

        {selectedCount > 0 && selectedCount < 3 && (
          <p className="text-center text-primary/50 text-xs">
            Select at least 3 players
          </p>
        )}
      </motion.div>

      {/* Stat card overlay */}
      <AnimatePresence>
        {viewingProfile && (
          <StatCard profile={viewingProfile} onClose={() => setViewingProfile(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
