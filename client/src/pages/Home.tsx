import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useProfiles, useCreateProfile, useDeleteProfile, useRenameProfile, useCreateRoom } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Ghost, UserPlus, Trash2, Check, X, BarChart2, Pencil, Users, Link2, LogOut, Copy, Trophy, Share2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGroup } from "@/context/GroupContext";
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

// ── Group Sheet ─────────────────────────────────────────────────────────────────
function GroupSheet({ onClose }: { onClose: () => void }) {
  const { group, groupCode, isLoading, joinGroup, createGroup, leaveGroup, error, clearError } = useGroup();
  const { toast } = useToast();
  const [tab, setTab] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [groupName, setGroupName] = useState("");

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await joinGroup(joinCode.trim());
  };

  const handleCreate = async () => {
    await createGroup(groupName.trim() || undefined);
  };

  const handleCopyCode = () => {
    if (groupCode) {
      navigator.clipboard.writeText(groupCode);
      toast({ title: "Copied!", description: `Group code ${groupCode} copied to clipboard.` });
    }
  };

  const handleShare = async () => {
    if (!groupCode) return;
    const shareUrl = `${window.location.origin}/?join=${groupCode}`;
    const shareText = `Join my Imposter game! Code: ${groupCode}`;

    // Use native share sheet if available (mobile), otherwise copy the link
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Imposter Party Game",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // User cancelled — silently ignore
        if (err?.name === "AbortError") return;
        // Fall through to clipboard fallback on other errors
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Paste it to a friend so they can join your group." });
    } catch {
      toast({ title: "Couldn't share", description: shareUrl, variant: "destructive" });
    }
  };

  const handleLeave = () => {
    leaveGroup();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-end justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 22 }}
        className="card-playful p-6 w-full max-w-md mb-2"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-display text-gradient flex items-center gap-2">
            <Users className="w-5 h-5" /> Sync Group
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            data-testid="button-close-group-sheet"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Share a group code with friends so all your devices use the same player profiles and custom categories.
        </p>

        {group ? (
          /* ── Already in a group ── */
          <div className="flex flex-col gap-4">
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-center">
              <p className="text-xs text-primary/60 uppercase tracking-widest mb-1">
                {group.name ? group.name : "Your Group"}
              </p>
              <p className="text-4xl font-display text-gradient tracking-widest" data-testid="text-group-code">
                {group.code}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PlayfulButton
                variant="outline"
                className="w-full gap-2"
                onClick={handleCopyCode}
                data-testid="button-copy-group-code"
              >
                <Copy className="w-4 h-4" /> Copy
              </PlayfulButton>
              <PlayfulButton
                className="w-full gap-2"
                onClick={handleShare}
                data-testid="button-share-group-link"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </PlayfulButton>
            </div>
            <p className="text-xs text-muted-foreground text-center -mt-1">
              Friends who tap your shared link join this group automatically.
            </p>
            <button
              onClick={handleLeave}
              className="flex items-center justify-center gap-2 text-sm text-secondary/70 hover:text-secondary transition-colors py-2"
              data-testid="button-leave-group"
            >
              <LogOut className="w-4 h-4" /> Leave group
            </button>
          </div>
        ) : (
          /* ── Join / Create tabs ── */
          <div>
            <div className="flex bg-muted/40 rounded-xl p-1 mb-4">
              {(["join", "create"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); clearError(); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${
                    tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`button-group-tab-${t}`}
                >
                  {t === "join" ? "Join Group" : "Create Group"}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-secondary mb-3 text-center" data-testid="text-group-error">{error}</p>
            )}

            {tab === "join" ? (
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Enter group code (e.g. ABCDEF)"
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); clearError(); }}
                  onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
                  className="h-12 bg-muted/60 border-border focus:border-primary rounded-xl text-center text-xl font-display tracking-widest uppercase"
                  maxLength={6}
                  data-testid="input-join-code"
                />
                <PlayfulButton
                  className="w-full gap-2"
                  onClick={handleJoin}
                  disabled={joinCode.trim().length < 6 || isLoading}
                  data-testid="button-join-group"
                >
                  <Link2 className="w-4 h-4" />
                  {isLoading ? "Joining..." : "Join Group"}
                </PlayfulButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Group name (optional)"
                  value={groupName}
                  onChange={e => { setGroupName(e.target.value); clearError(); }}
                  onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                  className="h-12 bg-muted/60 border-border focus:border-primary rounded-xl"
                  data-testid="input-group-name"
                />
                <PlayfulButton
                  className="w-full gap-2"
                  onClick={handleCreate}
                  disabled={isLoading}
                  data-testid="button-create-group"
                >
                  <Users className="w-4 h-4" />
                  {isLoading ? "Creating..." : "Create Group"}
                </PlayfulButton>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Leaderboard Overlay ────────────────────────────────────────────────────────
type LeaderboardStat = "imposterWins" | "imposterLosses" | "nonImposterWins" | "nonImposterLosses" | "gamesPlayed" | "badWordTally";
type LeaderboardMode = "total" | "percentage";

const STAT_OPTIONS: { value: LeaderboardStat; label: string; supportsPercentage: boolean }[] = [
  { value: "imposterWins", label: "Imposter Wins", supportsPercentage: true },
  { value: "imposterLosses", label: "Imposter Losses", supportsPercentage: true },
  { value: "nonImposterWins", label: "Crew Wins", supportsPercentage: true },
  { value: "nonImposterLosses", label: "Crew Losses", supportsPercentage: true },
  { value: "gamesPlayed", label: "Games Played", supportsPercentage: false },
  { value: "badWordTally", label: "Bad Words", supportsPercentage: false },
];

function getRawValue(profile: Profile, stat: LeaderboardStat): number {
  switch (stat) {
    case "gamesPlayed":
      return profile.imposterWins + profile.imposterLosses + profile.nonImposterWins + profile.nonImposterLosses;
    case "imposterWins": return profile.imposterWins;
    case "imposterLosses": return profile.imposterLosses;
    case "nonImposterWins": return profile.nonImposterWins;
    case "nonImposterLosses": return profile.nonImposterLosses;
    case "badWordTally": return profile.badWordTally;
  }
}

function getDenominator(profile: Profile, stat: LeaderboardStat): number {
  switch (stat) {
    case "imposterWins":
    case "imposterLosses":
      return profile.imposterWins + profile.imposterLosses;
    case "nonImposterWins":
    case "nonImposterLosses":
      return profile.nonImposterWins + profile.nonImposterLosses;
    default:
      return 0;
  }
}

function Leaderboard({ profiles, onClose }: { profiles: Profile[]; onClose: () => void }) {
  const [stat, setStat] = useState<LeaderboardStat>("imposterWins");
  const [mode, setMode] = useState<LeaderboardMode>("total");

  const currentOption = STAT_OPTIONS.find(o => o.value === stat)!;
  const showPercentageToggle = currentOption.supportsPercentage;
  const effectiveMode: LeaderboardMode = showPercentageToggle ? mode : "total";

  const ranked = [...profiles]
    .map(p => {
      const raw = getRawValue(p, stat);
      const denom = getDenominator(p, stat);
      const hasData = effectiveMode === "percentage" ? denom > 0 : true;
      const sortKey = effectiveMode === "percentage"
        ? (denom > 0 ? raw / denom : -1)
        : raw;
      return { profile: p, raw, denom, hasData, sortKey };
    })
    .sort((a, b) => {
      if (a.hasData && !b.hasData) return -1;
      if (!a.hasData && b.hasData) return 1;
      return b.sortKey - a.sortKey;
    });

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
        transition={{ type: "spring", damping: 22 }}
        className="card-playful p-6 w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="overlay-leaderboard"
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-3xl font-display text-gradient flex items-center gap-2">
            <Trophy className="w-6 h-6" /> Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            data-testid="button-close-leaderboard"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Stat selector */}
        <div className="mb-3 flex-shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider text-primary/60 block mb-1.5">
            Rank by
          </label>
          <select
            value={stat}
            onChange={e => setStat(e.target.value as LeaderboardStat)}
            className="w-full h-11 bg-muted/60 border border-border focus:border-primary rounded-xl px-3 text-sm font-bold outline-none"
            data-testid="select-leaderboard-stat"
          >
            {STAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        {showPercentageToggle && (
          <div className="flex bg-muted/40 rounded-xl p-1 mb-4 flex-shrink-0">
            {(["total", "percentage"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${
                  effectiveMode === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-leaderboard-mode-${m}`}
              >
                {m === "total" ? "Total" : "Percentage"}
              </button>
            ))}
          </div>
        )}

        {/* Ranked list */}
        <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1.5">
          {ranked.length === 0 ? (
            <p className="text-center text-primary/40 py-8 text-sm">No profiles yet</p>
          ) : (
            ranked.map((entry, idx) => {
              const { profile, raw, denom, hasData } = entry;
              const rank = idx + 1;
              const isPercent = effectiveMode === "percentage";
              const valueText = !hasData
                ? "—"
                : isPercent
                  ? `${Math.round((raw / denom) * 100)}% (${raw}/${denom})`
                  : `${raw}`;
              return (
                <div
                  key={profile.id}
                  className={`flex items-center gap-3 h-12 px-3 rounded-xl border ${
                    hasData ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/40 opacity-60"
                  }`}
                  data-testid={`row-leaderboard-${profile.id}`}
                >
                  <span className="font-display text-lg w-7 text-center text-primary/70">
                    {rank}
                  </span>
                  <span className="font-bold text-sm flex-1 truncate">{profile.name}</span>
                  <span className="font-display text-base text-gradient" data-testid={`text-leaderboard-value-${profile.id}`}>
                    {valueText}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── How To Play Overlay ────────────────────────────────────────────────────────
function HowToPlay({ onClose }: { onClose: () => void }) {
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
        transition={{ type: "spring", damping: 22 }}
        className="card-playful p-6 w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="overlay-how-to-play"
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-3xl font-display text-gradient flex items-center gap-2">
            <HelpCircle className="w-6 h-6" /> How to Play
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            data-testid="button-close-how-to-play"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 text-sm leading-relaxed">
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5">The Setup</p>
            <p className="text-foreground/90">
              Each round, one player is secretly chosen as the <span className="font-bold text-secondary">Imposter</span> while everyone else receives the same hidden word within a category.
            </p>
          </div>

          <div className="bg-muted/40 border border-border/40 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5">Giving Clues</p>
            <p className="text-foreground/90">
              Players take turns providing a word related to the secret word — enough to prove to the other crew members that you know the secret word, but not so obvious that the Imposter can figure it out.
            </p>
          </div>

          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary/70 mb-1.5">If You're the Imposter</p>
            <p className="text-foreground/90">
              Blend in, avoid suspicion, and try to identify the hidden word before the round ends.
            </p>
          </div>

          <div className="bg-muted/40 border border-border/40 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5">The Vote</p>
            <p className="text-foreground/90">
              After the discussion, everyone votes on who they think the Imposter is.
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-1.5">Winning</p>
            <p className="text-foreground/90">
              If the Imposter survives the vote or correctly guesses the word, <span className="font-bold text-secondary">they win</span>. If the crew identifies the Imposter, <span className="font-bold text-primary">the crew wins</span>.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pending Join Prompt ────────────────────────────────────────────────────────
function JoinPrompt({
  pendingCode, currentCode, onAccept, onDismiss,
}: {
  pendingCode: string;
  currentCode: string | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const isSwitch = currentCode && currentCode !== pendingCode;
  const alreadyIn = currentCode === pendingCode;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        transition={{ type: "spring", damping: 22 }}
        className="card-playful p-6 w-full max-w-sm text-center"
        onClick={e => e.stopPropagation()}
        data-testid="overlay-join-prompt"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-display text-gradient mb-1">
          {alreadyIn ? "You're in this group" : isSwitch ? "Switch Group?" : "Join this group?"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {alreadyIn
            ? "You're already a member of this group."
            : isSwitch
              ? "You're already in another group. Joining will replace it."
              : "Connect this device so you share players and categories."}
        </p>

        {isSwitch && (
          <div className="flex items-center justify-center gap-2 mb-4 text-xs">
            <span className="px-2 py-1 rounded-lg bg-muted/40 border border-border/40 font-display tracking-widest" data-testid="text-current-group-code">
              {currentCode}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary font-display tracking-widest" data-testid="text-pending-group-code">
              {pendingCode}
            </span>
          </div>
        )}

        {!isSwitch && (
          <p className="text-3xl font-display text-gradient tracking-widest mb-4" data-testid="text-pending-group-code">
            {pendingCode}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {!alreadyIn && (
            <PlayfulButton
              className="w-full gap-2"
              onClick={onAccept}
              data-testid="button-accept-join"
            >
              <Link2 className="w-4 h-4" /> {isSwitch ? "Switch Group" : "Join Group"}
            </PlayfulButton>
          )}
          <button
            onClick={onDismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            data-testid="button-dismiss-join"
          >
            {alreadyIn ? "Got it" : "Not now"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { group, groupCode, pendingJoinCode, acceptPendingJoin, dismissPendingJoin } = useGroup();

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
  const [showGroupSheet, setShowGroupSheet] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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

      {/* Floating "How to Play" help button */}
      <button
        onClick={() => setShowHowToPlay(true)}
        className="fixed top-4 right-4 z-20 w-11 h-11 rounded-full bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center backdrop-blur-sm"
        aria-label="How to Play"
        data-testid="button-open-how-to-play"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

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

        {/* Group Badge */}
        <button
          onClick={() => setShowGroupSheet(true)}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border transition-all text-sm font-bold ${
            group
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              : "bg-muted/30 border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
          }`}
          data-testid="button-group-badge"
        >
          <Users className="w-4 h-4" />
          {group ? (
            <>
              <span className="tracking-widest font-display">{group.code}</span>
              {group.name && <span className="text-primary/60 font-normal">· {group.name}</span>}
            </>
          ) : (
            "Sync with other devices"
          )}
        </button>

        {/* Player Roster */}
        <div className="card-playful p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-display text-gradient">Players</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                data-testid="button-open-leaderboard"
              >
                <Trophy className="w-3.5 h-3.5" />
                Leaderboard
              </button>
              <span className="text-xs font-bold text-primary/60">
                {selectedCount} selected
              </span>
            </div>
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

      {/* Group Sheet */}
      <AnimatePresence>
        {showGroupSheet && (
          <GroupSheet onClose={() => setShowGroupSheet(false)} />
        )}
      </AnimatePresence>

      {/* Leaderboard overlay */}
      <AnimatePresence>
        {showLeaderboard && (
          <Leaderboard profiles={profiles} onClose={() => setShowLeaderboard(false)} />
        )}
      </AnimatePresence>

      {/* How to Play overlay */}
      <AnimatePresence>
        {showHowToPlay && (
          <HowToPlay onClose={() => setShowHowToPlay(false)} />
        )}
      </AnimatePresence>

      {/* Join confirmation prompt (from ?join=CODE deep link) */}
      <AnimatePresence>
        {pendingJoinCode && (
          <JoinPrompt
            pendingCode={pendingJoinCode}
            currentCode={groupCode}
            onAccept={async () => {
              const target = pendingJoinCode;
              await acceptPendingJoin();
              toast({ title: "Joined!", description: `Synced with group ${target}.` });
            }}
            onDismiss={dismissPendingJoin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
