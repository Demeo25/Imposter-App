import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRoomInput, type CreateCategoryInput, type RevealPlayerInput } from "@shared/routes";

// ============================================
// ROOM QUERIES
// ============================================

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
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

// ============================================
// CATEGORY MUTATIONS
// ============================================

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create category');
      }
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// ============================================
// LOBBY MUTATIONS
// ============================================

export function useCreateRoom() {
  return useMutation({
    mutationFn: async (data: CreateRoomInput) => {
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create room');
      }
      return api.rooms.create.responses[201].parse(await res.json());
    },
  });
}

export function useStartGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { selectedCategoryIds?: number[]; hiddenWords?: Record<string, string[]> }) => {
      const url = buildUrl(api.rooms.start.path, { code });
      const res = await fetch(url, {
        method: api.rooms.start.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to start game');
      }
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
