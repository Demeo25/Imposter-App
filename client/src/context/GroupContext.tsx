import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Group } from "@shared/schema";

const STORAGE_KEY = "imposter_group_code";

interface GroupContextValue {
  groupCode: string | null;
  group: Group | null;
  isLoading: boolean;
  joinGroup: (code: string) => Promise<void>;
  createGroup: (name?: string) => Promise<void>;
  leaveGroup: () => void;
  error: string | null;
  clearError: () => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groupCode, setGroupCode] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, if we have a stored code, verify it
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      fetch(`/api/groups/${stored}`)
        .then(r => {
          if (!r.ok) {
            // Group no longer exists or code invalid — clear it
            localStorage.removeItem(STORAGE_KEY);
            setGroupCode(null);
            return null;
          }
          return r.json() as Promise<Group>;
        })
        .then(g => { if (g) setGroup(g); })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setGroupCode(null);
        });
    }
  }, []);

  const joinGroup = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${code.trim().toUpperCase()}`);
      if (!res.ok) {
        setError("Group not found. Check the code and try again.");
        return;
      }
      const g: Group = await res.json();
      setGroup(g);
      setGroupCode(g.code);
      localStorage.setItem(STORAGE_KEY, g.code);
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (name?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create group");
      const g: Group = await res.json();
      setGroup(g);
      setGroupCode(g.code);
      localStorage.setItem(STORAGE_KEY, g.code);
    } catch {
      setError("Could not create group. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveGroup = useCallback(() => {
    setGroup(null);
    setGroupCode(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <GroupContext.Provider value={{ groupCode, group, isLoading, joinGroup, createGroup, leaveGroup, error, clearError }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used inside GroupProvider");
  return ctx;
}
