import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateCategory, useDeleteCategory, useSuggestWords } from "@/hooks/use-game";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, X, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";

interface CategoryEditorProps {
  category: Category;
  onClose: () => void;
  onDeleted?: () => void;
}

export function CategoryEditor({ category, onClose, onDeleted }: CategoryEditorProps) {
  const { toast } = useToast();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const suggestWords = useSuggestWords();

  const [words, setWords] = useState<string[]>(category.words);
  const [newWord, setNewWord] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty = JSON.stringify(words) !== JSON.stringify(category.words);

  const addWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (words.map(w => w.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast({ title: "Word already in list", variant: "destructive" });
      return;
    }
    setWords(w => [...w, trimmed]);
    setNewWord("");
  };

  const removeWord = (word: string) => {
    if (words.length <= 2) {
      toast({ title: "Need at least 2 words", variant: "destructive" });
      return;
    }
    setWords(w => w.filter(x => x !== word));
  };

  const handleSave = async () => {
    try {
      await updateCategory.mutateAsync({ id: category.id, words });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      toast({ title: "Words saved!" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    }
  };

  const handleAiFill = async () => {
    try {
      const result = await suggestWords.mutateAsync(category.name);
      const toAdd = result.words.filter(
        w => !words.map(x => x.toLowerCase()).includes(w.toLowerCase())
      );
      if (toAdd.length === 0) {
        toast({ title: "All suggestions already in list" });
        return;
      }
      setWords(prev => [...prev, ...toAdd].slice(0, 50));
      toast({ title: `Added ${toAdd.length} AI-generated words!` });
    } catch (err: any) {
      toast({ title: "AI unavailable", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await deleteCategory.mutateAsync(category.id);
      toast({ title: `"${category.name}" deleted` });
      onDeleted?.();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 top-16 bg-background rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-display">{category.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{words.length} words</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
            data-testid="button-close-editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <AnimatePresence>
              {words.map(word => (
                <motion.div
                  key={word}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center justify-between bg-card border-2 border-border rounded-xl px-3 py-2.5 group"
                >
                  <span className="font-medium text-sm truncate">{word}</span>
                  <button
                    onClick={() => removeWord(word)}
                    className="text-destructive opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity ml-2 flex-shrink-0"
                    data-testid={`button-remove-word-${word}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-4 pb-6 pt-3 border-t border-border/50 flex flex-col gap-3 flex-shrink-0">
          {/* Add word input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a word..."
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addWord(); }}
              className="h-11"
              data-testid="input-new-word"
            />
            <PlayfulButton
              onClick={addWord}
              disabled={!newWord.trim()}
              data-testid="button-add-word"
              className="px-3"
            >
              <Plus className="w-5 h-5" />
            </PlayfulButton>
          </div>

          {/* AI fill button */}
          <PlayfulButton
            variant="outline"
            className="w-full"
            onClick={handleAiFill}
            disabled={suggestWords.isPending}
            data-testid="button-ai-fill"
          >
            {suggestWords.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> AI Fill Words</>
            )}
          </PlayfulButton>

          {/* Save & delete row */}
          <div className="flex gap-2">
            {category.isCustom && (
              <PlayfulButton
                variant="outline"
                className={`border-destructive/50 ${confirmDelete ? 'bg-destructive text-white' : 'text-destructive hover:bg-destructive/10'}`}
                onClick={handleDelete}
                disabled={deleteCategory.isPending}
                data-testid="button-delete-category"
              >
                {confirmDelete ? "Confirm?" : <Trash2 className="w-4 h-4" />}
              </PlayfulButton>
            )}
            <PlayfulButton
              size="lg"
              className="flex-1"
              onClick={handleSave}
              disabled={!isDirty || updateCategory.isPending}
              data-testid="button-save-words"
            >
              {updateCategory.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4 mr-2" /> Saved!</>
              ) : (
                "Save Changes"
              )}
            </PlayfulButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
