import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRoomInput, type JoinRoomInput, type RoomSettingsInput, type ClueInput, type VoteInput, type GuessInput } from "@shared/routes";

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
    refetchInterval: 2000, // Poll every 2 seconds for real-time feel
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

export function useJoinRoom(code: string) {
  return useMutation({
    mutationFn: async (data: Omit<JoinRoomInput, 'code'>) => {
      const url = buildUrl(api.rooms.join.path, { code });
      const res = await fetch(url, {
        method: api.rooms.join.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to join room');
      }
      return api.rooms.join.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateSettings(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RoomSettingsInput) => {
      const url = buildUrl(api.rooms.settings.path, { code });
      const res = await fetch(url, {
        method: api.rooms.settings.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return api.rooms.settings.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useStartGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.rooms.start.path, { code });
      const res = await fetch(url, { method: api.rooms.start.method });
      if (!res.ok) throw new Error('Failed to start game');
      return api.rooms.start.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

// ============================================
// GAMEPLAY MUTATIONS
// ============================================

export function useSubmitClue(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClueInput) => {
      const url = buildUrl(api.rooms.clue.path, { code });
      const res = await fetch(url, {
        method: api.rooms.clue.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit clue');
      return api.rooms.clue.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] }),
  });
}

export function useSubmitVote(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: VoteInput) => {
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

export function useSubmitGuess(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GuessInput) => {
      const url = buildUrl(api.rooms.guess.path, { code });
      const res = await fetch(url, {
        method: api.rooms.guess.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit guess');
      return api.rooms.guess.responses[200].parse(await res.json());
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
