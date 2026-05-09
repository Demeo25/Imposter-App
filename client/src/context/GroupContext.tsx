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
  pendingJoinCode: string | null;
  acceptPendingJoin: () => Promise<void>;
  dismissPendingJoin: () => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groupCode, setGroupCode] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending invitation captured from a ?join=CODE deep link. The actual switch
  // happens via acceptPendingJoin() so we never overwrite the user's existing
  // group without their consent.
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  // On mount: capture any ?join=CODE param, then verify stored code (always)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get("join");

    if (joinParam) {
      const code = joinParam.trim().toUpperCase();
      // Strip ?join= from the URL so it doesn't keep firing on refresh
      params.delete("join");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
      if (code) setPendingJoinCode(code);
    }

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

  const acceptPendingJoin = useCallback(async () => {
    if (!pendingJoinCode) return;
    const code = pendingJoinCode;
    setPendingJoinCode(null);
    await joinGroup(code);
  }, [pendingJoinCode, joinGroup]);

  const dismissPendingJoin = useCallback(() => {
    setPendingJoinCode(null);
  }, []);

  return (
    <GroupContext.Provider value={{
      groupCode, group, isLoading, joinGroup, createGroup, leaveGroup,
      error, clearError, pendingJoinCode, acceptPendingJoin, dismissPendingJoin,
    }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used inside GroupProvider");
  return ctx;
}
