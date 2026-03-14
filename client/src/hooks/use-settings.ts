import { useState, useEffect } from "react";

export interface GameSettings {
  selectedCategoryIds: number[] | null; // null = all
  hiddenWords: Record<number, string[]>; // catId -> hidden words
}

const STORAGE_KEY = "imposter_settings";

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { selectedCategoryIds: null, hiddenWords: {} };
}

function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  const update = (partial: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  };

  return { settings, update };
}
