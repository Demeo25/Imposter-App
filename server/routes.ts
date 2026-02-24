import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const WORDS: Record<string, string[]> = {
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const code = generateRoomCode();
      
      const room = await storage.createRoom({
        code,
        status: "waiting",
        playerCount: 4,
        imposterCount: 1,
        currentCategory: null,
        currentWord: null,
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

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const input = api.rooms.join.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.status !== "waiting") {
        return res.status(400).json({ message: "Game already started" });
      }

      const player = await storage.createPlayer({
        roomId: room.id,
        name: input.playerName,
        isHost: false,
        isImposter: false,
        score: 0,
        eliminated: false,
        votedForId: null,
      });

      res.status(200).json({ room, player });
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

    // Map clues to include player
    const cluesWithPlayers = clues.map(clue => {
      const player = players.find(p => p.id === clue.playerId);
      return { ...clue, player: player! };
    });

    res.status(200).json({ room, players, clues: cluesWithPlayers });
  });

  app.patch(api.rooms.settings.path, async (req, res) => {
    try {
      const input = api.rooms.settings.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const updated = await storage.updateRoom(room.id, input);
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
      });
    }

    // Pick random category and word
    const categories = Object.keys(WORDS);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const wordList = WORDS[category];
    const word = wordList[Math.floor(Math.random() * wordList.length)];

    const updated = await storage.updateRoom(room.id, {
      status: "revealing",
      currentCategory: category,
      currentWord: word,
      revealIndex: 0,
      revealStep: "name",
      startingPlayerId: players[Math.floor(Math.random() * players.length)].id,
    });

    res.status(200).json(updated);
  });

  app.post(api.rooms.advanceReveal.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const players = await storage.getPlayersByRoom(room.id);
    let { revealIndex, revealStep, status } = room;

    if (revealStep === "name") {
      revealStep = "word";
    } else if (revealStep === "word") {
      revealStep = "next";
    } else if (revealStep === "next") {
      if (revealIndex < players.length - 1) {
        revealIndex++;
        revealStep = "name";
      } else {
        status = "playing";
      }
    }

    const updated = await storage.updateRoom(room.id, {
      revealIndex,
      revealStep,
      status
    });
    res.status(200).json(updated);
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
    // Add logic to delete player in storage if needed, or just update eliminated
    // For simplicity, we'll just not implement full delete in storage yet but we should
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

      // Check if everyone voted
      const players = await storage.getPlayersByRoom(room.id);
      const votes = players.filter(p => p.votedForId !== null);
      
      if (votes.length === players.length) {
        // Tally votes
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
            // Tie - no one eliminated (or we could handle tiebreaker, keep it simple for now)
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

  app.post(api.rooms.guess.path, async (req, res) => {
    try {
      const input = api.rooms.guess.input.parse(req.body);
      const code = req.params.code.toUpperCase();
      
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const correct = room.currentWord?.toLowerCase() === input.guessedWord.toLowerCase().trim();
      
      // We can record score if correct, but for now we just return if they guessed it correctly.
      res.status(200).json({ correct, room });
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

  app.post(api.rooms.next.path, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Reset room
    const updated = await storage.updateRoom(room.id, {
      status: "waiting",
      currentCategory: null,
      currentWord: null,
    });

    await storage.clearCluesByRoom(room.id);
    
    // Reset players
    const players = await storage.getPlayersByRoom(room.id);
    for (const p of players) {
      await storage.updatePlayer(p.id, {
        isImposter: false,
        votedForId: null,
        eliminated: false,
      });
    }

    res.status(200).json(updated);
  });

  return httpServer;
}