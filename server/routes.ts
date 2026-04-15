import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const DEFAULT_WORDS: Record<string, string[]> = {
  "Sports": ["Hockey", "Basketball", "Tennis", "Soccer", "Baseball", "Golf", "Volleyball", "Rugby"],
  "Animals": ["Elephant", "Giraffe", "Penguin", "Lion", "Tiger", "Kangaroo", "Monkey", "Bear"],
  "Food": ["Pizza", "Burger", "Sushi", "Taco", "Pasta", "Salad", "Steak", "Sandwich"],
  "Countries": ["Japan", "Brazil", "Canada", "France", "Italy", "Spain", "Germany", "Mexico"],
  "Professions": ["Doctor", "Teacher", "Engineer", "Pilot", "Artist", "Chef", "Lawyer", "Scientist"]
};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function initializeDefaultCategories() {
  const existing = await storage.getCategories();
  if (existing.length === 0) {
    for (const [name, words] of Object.entries(DEFAULT_WORDS)) {
      await storage.createCategory({ name, words, isCustom: false });
    }
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await initializeDefaultCategories();

  // ========== GROUPS ==========

  function generateGroupCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  app.post("/api/groups", async (req, res) => {
    const { name } = req.body;
    let code = generateGroupCode();
    // Ensure uniqueness
    while (await storage.getGroupByCode(code)) code = generateGroupCode();
    const group = await storage.createGroup({ code, name: name?.trim() || undefined });
    res.status(201).json(group);
  });

  app.get("/api/groups/:code", async (req, res) => {
    const group = await storage.getGroupByCode(req.params.code);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.status(200).json(group);
  });

  // ========== PROFILES ==========

  async function resolveGroupId(groupCode?: string): Promise<number | null> {
    if (!groupCode) return null;
    const group = await storage.getGroupByCode(groupCode);
    return group?.id ?? null;
  }

  app.get("/api/profiles", async (req, res) => {
    const groupId = await resolveGroupId(req.query.groupCode as string | undefined);
    const list = await storage.getProfiles(groupId);
    res.status(200).json(list);
  });

  app.post("/api/profiles", async (req, res) => {
    const { name, groupCode } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const groupId = await resolveGroupId(groupCode);
    const profile = await storage.createProfile({ name: name.trim(), groupId });
    res.status(201).json(profile);
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const existing = await storage.getProfile(id);
    if (!existing) return res.status(404).json({ message: "Profile not found" });
    const updated = await storage.updateProfile(id, { name: name.trim() });
    res.status(200).json(updated);
  });

  app.delete("/api/profiles/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getProfile(id);
    if (!existing) return res.status(404).json({ message: "Profile not found" });
    await storage.deleteProfile(id);
    res.status(204).send();
  });

  // ========== CATEGORIES ==========

  app.get(api.categories.list.path, async (req, res) => {
    const groupId = await resolveGroupId(req.query.groupCode as string | undefined);
    const cats = await storage.getCategories(groupId);
    res.status(200).json(cats);
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { words } = req.body;
    if (!Array.isArray(words)) return res.status(400).json({ message: "words must be an array" });
    const cat = await storage.getCategoryById(id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const updated = await storage.updateCategory(id, { words });
    res.status(200).json(updated);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const cat = await storage.getCategoryById(id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    if (!cat.isCustom) return res.status(403).json({ message: "Cannot delete default categories" });
    await storage.deleteCategory(id);
    res.status(204).send();
  });

  app.post("/api/suggest-words", async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Category name required" });
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You generate word lists for a social deduction party game. Return a JSON object with a \"words\" key containing an array of 50 distinct, common, well-known items that fit the category. Words must be easy to guess and describe in conversation. No duplicates.",
          },
          { role: "user", content: `Generate 50 words for the category: ${name}` },
        ],
        response_format: { type: "json_object" },
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      const words: string[] = parsed.words || parsed.items || Object.values(parsed)[0] as string[];
      if (!Array.isArray(words) || words.length === 0) throw new Error("No words returned");
      res.json({ words: words.slice(0, 50) });
    } catch (err: any) {
      console.error("AI suggest-words error:", err.message);
      res.status(503).json({ message: "AI suggestions unavailable right now" });
    }
  });

  app.post(api.categories.create.path, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const groupId = await resolveGroupId((req.body as any).groupCode);
      const cat = await storage.createCategory({ name: input.name, words: input.words, isCustom: true, groupId });
      res.status(201).json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  // ========== ROOMS ==========

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const { profileIds, selectedCategoryIds, imposterCount } = req.body;

      if (!Array.isArray(profileIds) || profileIds.length < 3) {
        return res.status(400).json({ message: "Select at least 3 players to start" });
      }

      const code = generateRoomCode();
      const room = await storage.createRoom({
        code,
        status: "waiting",
        playerCount: profileIds.length,
        imposterCount: typeof imposterCount === "number" && imposterCount >= 1 ? imposterCount : 1,
        currentCategory: null,
        currentWord: null,
        selectedCategoryIds: Array.isArray(selectedCategoryIds) ? selectedCategoryIds : [],
      });

      const createdPlayers = [];
      for (let i = 0; i < profileIds.length; i++) {
        const profile = await storage.getProfile(profileIds[i]);
        if (!profile) continue;
        const player = await storage.createPlayer({
          roomId: room.id,
          profileId: profile.id,
          name: profile.name,
          isHost: i === 0,
          isImposter: false,
          score: 0,
          eliminated: false,
          votedForId: null,
        });
        createdPlayers.push(player);
      }

      res.status(201).json({ room, players: createdPlayers });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const players = await storage.getPlayersByRoom(room.id);
    const clues = await storage.getCluesByRoom(room.id);
    const cluesWithPlayers = clues.map(clue => ({ ...clue, player: players.find(p => p.id === clue.playerId)! }));

    res.status(200).json({ room, players, clues: cluesWithPlayers });
  });

  app.post(api.rooms.start.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const players = await storage.getPlayersByRoom(room.id);

    // Already in revealing + all seen → advance to playing
    const revealedIds: number[] = (room.revealedPlayerIds as number[]) || [];
    if (room.status === "revealing" && revealedIds.length === players.length) {
      const startingPlayerId = players[Math.floor(Math.random() * players.length)].id;
      const updated = await storage.updateRoom(room.id, { status: "playing", startingPlayerId });
      return res.status(200).json(updated);
    }

    if (players.length < 3) return res.status(400).json({ message: "Not enough players" });

    const body = req.body || {};
    const bodySelectedIds: number[] | undefined = Array.isArray(body.selectedCategoryIds) ? body.selectedCategoryIds : undefined;
    const hiddenWords: Record<string, string[]> = body.hiddenWords || {};

    const imposterCount = (typeof body.imposterCount === "number" && body.imposterCount >= 1)
      ? body.imposterCount
      : room.imposterCount || 1;

    const imposterIndices = new Set<number>();
    while (imposterIndices.size < Math.min(imposterCount, players.length - 1)) {
      imposterIndices.add(Math.floor(Math.random() * players.length));
    }
    for (let i = 0; i < players.length; i++) {
      await storage.updatePlayer(players[i].id, { isImposter: imposterIndices.has(i), votedForId: null, forgotWordUsed: false });
    }

    let selectedCatIds: number[] = bodySelectedIds || (room.selectedCategoryIds as number[]) || [];
    if (selectedCatIds.length === 0) {
      const allCats = await storage.getCategories();
      selectedCatIds = allCats.map(c => c.id);
    }

    const shuffledCatIds = [...selectedCatIds].sort(() => Math.random() - 0.5);
    let selectedCategory: any = null;
    let selectedWord: string | null = null;

    for (const catId of shuffledCatIds) {
      const cat = await storage.getCategoryById(catId);
      if (!cat) continue;
      const catHidden: string[] = hiddenWords[String(catId)] || [];
      const available = cat.words.filter(w => !catHidden.includes(w));
      if (available.length > 0) {
        selectedCategory = cat;
        selectedWord = available[Math.floor(Math.random() * available.length)];
        break;
      }
    }

    if (!selectedCategory || !selectedWord) {
      return res.status(400).json({ message: "No categories available. Check your settings." });
    }

    const updated = await storage.updateRoom(room.id, {
      status: "revealing",
      currentCategory: selectedCategory.name,
      currentWord: selectedWord,
      revealedPlayerIds: [],
    });

    res.status(200).json(updated);
  });

  app.post(api.rooms.revealPlayer.path, async (req, res) => {
    try {
      const input = api.rooms.revealPlayer.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const revealedIds = [...((room.revealedPlayerIds as number[]) || [])];
      if (!revealedIds.includes(input.playerId)) revealedIds.push(input.playerId);

      const players = await storage.getPlayersByRoom(room.id);
      let status = room.status;
      let startingPlayerId = room.startingPlayerId;

      if (revealedIds.length === players.length) {
        status = "playing";
        if (!startingPlayerId) {
          startingPlayerId = players[Math.floor(Math.random() * players.length)].id;
        }
      }

      const updated = await storage.updateRoom(room.id, { revealedPlayerIds: revealedIds, status, startingPlayerId });
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Add player from profile to room
  app.post(api.rooms.addPlayer.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const { profileId } = req.body;
    if (typeof profileId !== "number") {
      return res.status(400).json({ message: "profileId is required" });
    }

    const profile = await storage.getProfile(profileId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const player = await storage.createPlayer({
      roomId: room.id,
      profileId: profile.id,
      name: profile.name,
      isHost: false,
      isImposter: false,
      score: 0,
      eliminated: false,
      votedForId: null,
    });
    res.status(200).json(player);
  });

  app.delete(api.rooms.removePlayer.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deletePlayer(id);
    res.status(204).send();
  });

  // ========== RESOLVE (save stats after game) ==========

  app.post("/api/rooms/:code/resolve", async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const { imposterResults, badWordProfileIds } = req.body;
    // imposterResults: { profileId: number, result: 'win' | 'loss' }[]
    // badWordProfileIds: number[]

    if (!Array.isArray(imposterResults)) {
      return res.status(400).json({ message: "imposterResults is required" });
    }

    // Update imposter stats
    const imposterProfileIdSet = new Set<number>();
    let anyImposterWon = false;

    for (const entry of imposterResults) {
      const { profileId, result } = entry;
      if (typeof profileId !== "number" || (result !== "win" && result !== "loss")) continue;
      imposterProfileIdSet.add(profileId);
      if (result === "win") anyImposterWon = true;

      const profile = await storage.getProfile(profileId);
      if (!profile) continue;

      if (result === "win") {
        await storage.updateProfile(profileId, { imposterWins: profile.imposterWins + 1 });
      } else {
        await storage.updateProfile(profileId, { imposterLosses: profile.imposterLosses + 1 });
      }
    }

    // Update non-imposter stats
    const allPlayers = await storage.getPlayersByRoom(room.id);
    const nonImposterPlayers = allPlayers.filter(
      p => p.profileId !== null && !imposterProfileIdSet.has(p.profileId!)
    );

    for (const player of nonImposterPlayers) {
      const profile = await storage.getProfile(player.profileId!);
      if (!profile) continue;

      if (anyImposterWon) {
        await storage.updateProfile(profile.id, { nonImposterLosses: profile.nonImposterLosses + 1 });
      } else {
        await storage.updateProfile(profile.id, { nonImposterWins: profile.nonImposterWins + 1 });
      }
    }

    // Update bad word tallies
    if (Array.isArray(badWordProfileIds)) {
      for (const profileId of badWordProfileIds) {
        const profile = await storage.getProfile(profileId);
        if (!profile) continue;
        await storage.updateProfile(profileId, { badWordTally: profile.badWordTally + 1 });
      }
    }

    res.status(200).json({ ok: true });
  });

  // ========== CLUES / VOTE / END / NEXT ==========

  app.post(api.rooms.clue.path, async (req, res) => {
    try {
      const input = api.rooms.clue.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const clue = await storage.createClue({ roomId: room.id, playerId: input.playerId, word: input.word });
      res.status(200).json(clue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.post(api.rooms.vote.path, async (req, res) => {
    try {
      const input = api.rooms.vote.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const player = await storage.updatePlayer(input.voterId, { votedForId: input.votedForId });
      const players = await storage.getPlayersByRoom(room.id);
      const votes = players.filter(p => p.votedForId !== null);

      if (votes.length === players.length) {
        const voteCounts: Record<number, number> = {};
        for (const p of votes) {
          if (p.votedForId) voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
        }
        let maxVotes = 0;
        let eliminatedId: number | null = null;
        for (const [idStr, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) { maxVotes = count; eliminatedId = parseInt(idStr); }
          else if (count === maxVotes) eliminatedId = null;
        }
        if (eliminatedId) await storage.updatePlayer(eliminatedId, { eliminated: true });
        await storage.updateRoom(room.id, { status: "finished" });
      }

      res.status(200).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.post(api.rooms.endGame.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    const updated = await storage.updateRoom(room.id, { status: "finished" });
    res.status(200).json(updated);
  });

  app.post(api.rooms.next.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const players = await storage.getPlayersByRoom(room.id);
    const newStartingPlayerId = players[Math.floor(Math.random() * players.length)].id;

    const updated = await storage.updateRoom(room.id, {
      status: "waiting",
      currentCategory: null,
      currentWord: null,
      gameEnded: false,
      revealedPlayerIds: [],
      startingPlayerId: newStartingPlayerId,
    });

    await storage.clearCluesByRoom(room.id);
    for (const p of players) {
      await storage.updatePlayer(p.id, { isImposter: false, votedForId: null, eliminated: false, forgotWordUsed: false });
    }

    res.status(200).json(updated);
  });

  return httpServer;
}
