import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateCategoryInput, type RevealPlayerInput } from "@shared/routes";
import type { Profile } from "@shared/schema";
import { useGroup } from "@/context/GroupContext";

// ── Profiles ──────────────────────────────────────────────────────────────────

export function useProfiles() {
  const { groupCode } = useGroup();
  return useQuery({
    queryKey: ['profiles', groupCode],
    queryFn: async () => {
      const url = groupCode ? `/api/profiles?groupCode=${groupCode}` : '/api/profiles';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch profiles');
      return res.json() as Promise<Profile[]>;
    },
    // When in a group, poll so changes from other devices show up automatically
    refetchInterval: groupCode ? 4000 : false,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { groupCode } = useGroup();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, groupCode }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<Profile>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useRenameProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<Profile>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

// ── Room queries ───────────────────────────────────────────────────────────────

export function useRoom(code: string | undefined) {
  return useQuery({
    queryKey: ['room', code],
    queryFn: async () => {
      if (!code) throw new Error("No code provided");
      const url = buildUrl(api.rooms.get.path, { code });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Room not found");
        throw new Error('Failed to fetch room');
      }
      return api.rooms.get.responses[200].parse(await res.json());
    },
    enabled: !!code,
    refetchInterval: 2000,
  });
}

export function useCategories() {
  const { groupCode } = useGroup();
  return useQuery({
    queryKey: ['categories', groupCode],
    queryFn: async () => {
      const url = groupCode
        ? `${api.categories.list.path}?groupCode=${groupCode}`
        : api.categories.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return api.categories.list.responses[200].parse(await res.json());
    },
    // Poll in a group so custom categories added on another device show up
    refetchInterval: groupCode ? 8000 : false,
  });
}

// ── Category mutations ─────────────────────────────────────────────────────────

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { groupCode } = useGroup();
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, groupCode }),
      });
      if (!res.ok) { const error = await res.json(); throw new Error(error.message || 'Failed to create category'); }
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, words }: { id: number; words: string[] }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to update category'); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to delete category'); }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useSuggestWords() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/suggest-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'AI suggestions unavailable'); }
      return res.json() as Promise<{ words: string[] }>;
    },
  });
}

// ── Room mutations ─────────────────────────────────────────────────────────────

export function useCreateRoom() {
  return useMutation({
    mutationFn: async (data: { profileIds: number[]; selectedCategoryIds?: number[]; imposterCount?: number }) => {
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const error = await res.json(); throw new Error(error.message || 'Failed to create room'); }
      return api.rooms.create.responses[201].parse(await res.json());
    },
  });
}

export function useStartGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { selectedCategoryIds?: number[]; hiddenWords?: Record<string, string[]>; imposterCount?: number }) => {
      const url = buildUrl(api.rooms.start.path, { code });
      const res = await fetch(url, {
        method: api.rooms.start.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to start game'); }
      return api.rooms.start.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useRevealPlayer(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: number) => {
      const url = buildUrl(api.rooms.revealPlayer.path, { code });
      const res = await fetch(url, {
        method: api.rooms.revealPlayer.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error('Failed to mark player as revealed');
      return api.rooms.revealPlayer.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useAddProfilePlayer(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: number) => {
      const url = buildUrl(api.rooms.addPlayer.path, { code });
      const res = await fetch(url, {
        method: api.rooms.addPlayer.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useEndGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.rooms.endGame.path, { code });
      const res = await fetch(url, { method: api.rooms.endGame.method });
      if (!res.ok) throw new Error('Failed to end game');
      return api.rooms.endGame.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useSubmitVote(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { voterId: number; votedForId: number }) => {
      const url = buildUrl(api.rooms.vote.path, { code });
      const res = await fetch(url, {
        method: api.rooms.vote.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit vote');
      return api.rooms.vote.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useNextRound(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.rooms.next.path, { code });
      const res = await fetch(url, { method: api.rooms.next.method });
      if (!res.ok) throw new Error('Failed to proceed to next round');
      return api.rooms.next.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useAbortGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.rooms.abort.path, { code });
      const res = await fetch(url, { method: api.rooms.abort.method });
      if (!res.ok) throw new Error('Failed to abort game');
      return api.rooms.abort.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useResolveGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      imposterResults: { profileId: number; result: 'win' | 'loss' }[];
      badWordProfileIds: number[];
    }) => {
      const url = buildUrl(api.rooms.resolve.path, { code });
      const res = await fetch(url, {
        method: api.rooms.resolve.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to resolve game');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
