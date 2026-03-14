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
      await storage.createCategory({
        name,
        words,
        isCustom: false,
      });
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize default categories on startup
  await initializeDefaultCategories();

  // ========== CATEGORIES ==========
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.status(200).json(cats);
  });

  app.post(api.categories.create.path, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const cat = await storage.createCategory({
        name: input.name,
        words: input.words,
        isCustom: true,
      });
      res.status(201).json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // ========== ROOMS ==========
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const code = generateRoomCode();
      
      const selectedCategoryIds = input.selectedCategoryIds || [];
      
      const room = await storage.createRoom({
        code,
        status: "waiting",
        playerCount: 4,
        imposterCount: 1,
        currentCategory: null,
        currentWord: null,
        selectedCategoryIds,
      });

      const player = await storage.createPlayer({
        roomId: room.id,
        name: input.playerName,
        isHost: true,
        isImposter: false,
        score: 0,
        eliminated: false,
        votedForId: null,
      });

      res.status(201).json({ room, player });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const players = await storage.getPlayersByRoom(room.id);
    const clues = await storage.getCluesByRoom(room.id);

    const cluesWithPlayers = clues.map(clue => {
      const player = players.find(p => p.id === clue.playerId);
      return { ...clue, player: player! };
    });

    res.status(200).json({ room, players, clues: cluesWithPlayers });
  });

  app.post(api.rooms.start.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const players = await storage.getPlayersByRoom(room.id);
    if (players.length < 3) {
      return res.status(400).json({ message: "Not enough players" });
    }

    // Assign imposters
    const imposterIndices = new Set<number>();
    while (imposterIndices.size < Math.min(room.imposterCount, players.length - 1)) {
      imposterIndices.add(Math.floor(Math.random() * players.length));
    }

    for (let i = 0; i < players.length; i++) {
      await storage.updatePlayer(players[i].id, {
        isImposter: imposterIndices.has(i),
        votedForId: null,
        forgotWordUsed: false,
      });
    }

    // Pick random category and word from selected categories
    let selectedCatIds = room.selectedCategoryIds || [];
    if (selectedCatIds.length === 0) {
      const allCats = await storage.getCategories();
      selectedCatIds = allCats.map(c => c.id);
    }

    let selectedCategory: any = null;
    let selectedWord: string | null = null;

    for (const catId of selectedCatIds) {
      const cat = await storage.getCategoryById(catId);
      if (cat && cat.words.length > 0) {
        selectedCategory = cat;
        selectedWord = cat.words[Math.floor(Math.random() * cat.words.length)];
        break;
      }
    }

    if (!selectedCategory || !selectedWord) {
      return res.status(400).json({ message: "No categories available" });
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

      const revealedIds = room.revealedPlayerIds || [];
      if (!revealedIds.includes(input.playerId)) {
        revealedIds.push(input.playerId);
      }

      const players = await storage.getPlayersByRoom(room.id);
      let status = room.status;
      let startingPlayerId = room.startingPlayerId;

      if (revealedIds.length === players.length) {
        status = "playing";
        if (!startingPlayerId) {
          startingPlayerId = players[Math.floor(Math.random() * players.length)].id;
        }
      }

      const updated = await storage.updateRoom(room.id, {
        revealedPlayerIds: revealedIds,
        status,
        startingPlayerId,
      });

      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.rooms.addPlayer.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    
    const input = api.rooms.addPlayer.input.parse(req.body);
    const player = await storage.createPlayer({
      roomId: room.id,
      name: input.name,
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

  app.post(api.rooms.clue.path, async (req, res) => {
    try {
      const input = api.rooms.clue.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const clue = await storage.createClue({
        roomId: room.id,
        playerId: input.playerId,
        word: input.word,
      });

      res.status(200).json(clue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
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

      const player = await storage.updatePlayer(input.voterId, {
        votedForId: input.votedForId,
      });

      const players = await storage.getPlayersByRoom(room.id);
      const votes = players.filter(p => p.votedForId !== null);
      
      if (votes.length === players.length) {
        const voteCounts: Record<number, number> = {};
        for (const p of votes) {
          if (p.votedForId) {
            voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
          }
        }
        
        let maxVotes = 0;
        let eliminatedId = null;
        for (const [idStr, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = parseInt(idStr);
          } else if (count === maxVotes) {
            eliminatedId = null; 
          }
        }

        if (eliminatedId) {
          await storage.updatePlayer(eliminatedId, { eliminated: true });
        }
        
        await storage.updateRoom(room.id, { status: "finished" });
      }

      res.status(200).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.rooms.endGame.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const updated = await storage.updateRoom(room.id, {
      gameEnded: true,
    });

    res.status(200).json(updated);
  });

  app.post(api.rooms.next.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const updated = await storage.updateRoom(room.id, {
      status: "waiting",
      currentCategory: null,
      currentWord: null,
      gameEnded: false,
      revealedPlayerIds: [],
    });

    await storage.clearCluesByRoom(room.id);
    
    const players = await storage.getPlayersByRoom(room.id);
    for (const p of players) {
      await storage.updatePlayer(p.id, {
        isImposter: false,
        votedForId: null,
        eliminated: false,
        forgotWordUsed: false,
      });
    }

    res.status(200).json(updated);
  });

  return httpServer;
}
