import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCategories, useCreateCategory, useSuggestWords } from "@/hooks/use-game";
import { useSettings } from "@/hooks/use-settings";
import { CategoryEditor } from "@/components/CategoryEditor";
import { PlayfulButton } from "@/components/ui/playful-button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, ChevronRight, Plus, Trash2, Check, Pencil, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";

// ─── Custom category builder ────────────────────────────────────────────────
function CustomCategoryBuilder({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const suggestWords = useSuggestWords();

  const addWord = () => {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    if (words.map(w => w.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast({ title: "Duplicate word", variant: "destructive" });
      return;
    }
    setWords(w => [...w, trimmed]);
    setWordInput("");
  };

  const handleAiFill = async () => {
    if (!name.trim()) {
      toast({ title: "Enter a category name first", variant: "destructive" });
      return;
    }
    try {
      const result = await suggestWords.mutateAsync(name.trim());
      const toAdd = result.words.filter(
        w => !words.map(x => x.toLowerCase()).includes(w.toLowerCase())
      );
      setWords(prev => [...prev, ...toAdd]);
      toast({ title: `Added ${toAdd.length} AI words for "${name}"!` });
    } catch (err: any) {
      toast({ title: "AI unavailable", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast({ title: "Category name required", variant: "destructive" });
    if (words.length < 2) return toast({ title: "Add at least 2 words", variant: "destructive" });
    try {
      await createCategory.mutateAsync({ name: name.trim(), words });
      toast({ title: `"${name.trim()}" created!` });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="flex flex-col gap-5"
    >
      <button
        onClick={onDone}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold"
        data-testid="button-back-from-custom"
      >
        <ArrowLeft className="w-4 h-4" /> Back to categories
      </button>

      <h2 className="text-3xl font-display">New Category</h2>

      <div>
        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground block mb-2">
          Category Name
        </label>
        <Input
          placeholder="e.g. Movies, Video Games, Cities..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-12"
          data-testid="input-category-name"
        />
      </div>

      {/* AI Fill button */}
      <PlayfulButton
        variant="outline"
        className="w-full"
        onClick={handleAiFill}
        disabled={suggestWords.isPending || !name.trim()}
        data-testid="button-ai-fill-new"
      >
        {suggestWords.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating words...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> AI Fill Words</>
        )}
      </PlayfulButton>

      <div>
        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground block mb-2">
          Words ({words.length})
        </label>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Type a word and press Enter..."
            value={wordInput}
            onChange={e => setWordInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addWord(); }}
            className="h-11"
            data-testid="input-word"
          />
          <PlayfulButton onClick={addWord} disabled={!wordInput.trim()} data-testid="button-add-word">
            <Plus className="w-5 h-5" />
          </PlayfulButton>
        </div>

        {words.length > 0 && (
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
            {words.map(w => (
              <div
                key={w}
                className="flex items-center justify-between bg-card border-2 border-border rounded-xl px-3 py-2"
              >
                <span className="font-medium text-sm truncate">{w}</span>
                <button
                  onClick={() => setWords(words.filter(x => x !== w))}
                  className="text-destructive hover:opacity-80 ml-2 flex-shrink-0"
                  data-testid={`button-remove-word-${w}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlayfulButton
        size="lg"
        className="w-full"
        onClick={handleSave}
        disabled={!name.trim() || words.length < 2 || createCategory.isPending}
        data-testid="button-save-category"
      >
        {createCategory.isPending ? "Saving..." : "Save Category"}
      </PlayfulButton>
    </motion.div>
  );
}

// ─── Main Settings page ─────────────────────────────────────────────────────
export default function Settings() {
  const [, setLocation] = useLocation();
  const { data: categories, isLoading } = useCategories();
  const { settings, update } = useSettings();
  const { toast } = useToast();

  const [view, setView] = useState<'list' | 'custom'>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const getSelectedIds = () => {
    if (!categories) return [];
    return settings.selectedCategoryIds ?? categories.map(c => c.id);
  };

  const toggleCategory = (id: number) => {
    if (!categories) return;
    const current = getSelectedIds();
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    update({ selectedCategoryIds: updated });
  };

  const handleDone = () => {
    const selected = getSelectedIds();
    if (selected.length === 0) {
      toast({ title: "Select at least one category", variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved!" });
    setLocation('/');
  };

  if (isLoading || !categories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const selectedIds = getSelectedIds();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-xl mx-auto py-6">
        <AnimatePresence mode="wait">

          {/* ── CATEGORY LIST ── */}
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setLocation('/')}
                  className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
                  data-testid="button-back-home"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-3xl font-display">Categories</h1>
              </div>

              <p className="text-sm text-muted-foreground">
                Choose which categories to include in games. Tap the pencil to add or remove words.
              </p>

              {/* Category list */}
              <div className="flex flex-col gap-2">
                {categories.map(cat => {
                  const isSelected = selectedIds.includes(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center bg-card border-2 border-border/50 rounded-2xl overflow-hidden"
                    >
                      {/* Select toggle */}
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        data-testid={`button-toggle-category-${cat.id}`}
                        className={`w-14 h-full flex items-center justify-center border-r-2 border-border/30 transition-colors flex-shrink-0 py-4
                          ${isSelected ? 'bg-primary/10' : 'bg-muted/20'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>

                      {/* Category info */}
                      <div className="flex-1 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{cat.name}</p>
                          {cat.isCustom && (
                            <span className="bg-secondary/20 text-secondary px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Custom</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cat.words.length} words
                        </p>
                      </div>

                      {/* Edit words button */}
                      <button
                        onClick={() => setEditingCategory(cat)}
                        data-testid={`button-edit-category-${cat.id}`}
                        className="w-12 h-full flex items-center justify-center border-l-2 border-border/30 hover:bg-muted/30 transition-colors flex-shrink-0"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-secondary/10 rounded-xl px-4 py-3 text-sm text-center">
                <span className="font-bold text-foreground">{selectedIds.length}</span>
                <span className="text-muted-foreground"> of </span>
                <span className="font-bold text-foreground">{categories.length}</span>
                <span className="text-muted-foreground"> categories active for games</span>
              </div>

              {/* New category */}
              <PlayfulButton
                variant="outline"
                className="w-full"
                onClick={() => setView('custom')}
                data-testid="button-build-custom"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Category
              </PlayfulButton>

              <PlayfulButton
                size="lg"
                className="w-full"
                onClick={handleDone}
                data-testid="button-done-settings"
              >
                Done
              </PlayfulButton>
            </motion.div>
          )}

          {/* ── CUSTOM CATEGORY BUILDER ── */}
          {view === 'custom' && (
            <CustomCategoryBuilder key="custom" onDone={() => setView('list')} />
          )}
        </AnimatePresence>

        {/* ── CATEGORY WORD EDITOR (modal) ── */}
        <AnimatePresence>
          {editingCategory && (
            <CategoryEditor
              category={editingCategory}
              onClose={() => setEditingCategory(null)}
              onDeleted={() => setEditingCategory(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
