import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  rooms, players, clues,
  type Room, type Player, type Clue,
  type InsertRoom, type InsertPlayer, type InsertClue
} from "@shared/schema";

export interface IStorage {
  createRoom(insertRoom: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room>;

  createPlayer(insertPlayer: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayersByRoom(roomId: number): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player>;
  deletePlayer(id: number): Promise<void>;

  createClue(insertClue: InsertClue): Promise<Clue>;
  getCluesByRoom(roomId: number): Promise<Clue[]>;
  clearCluesByRoom(roomId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room> {
    const [room] = await db.update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return room;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayersByRoom(roomId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.roomId, roomId));
  }

  async updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player> {
    const [player] = await db.update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  async createClue(insertClue: InsertClue): Promise<Clue> {
    const [clue] = await db.insert(clues).values(insertClue).returning();
    return clue;
  }

  async getCluesByRoom(roomId: number): Promise<Clue[]> {
    return await db.select().from(clues).where(eq(clues.roomId, roomId));
  }

  async clearCluesByRoom(roomId: number): Promise<void> {
    await db.delete(clues).where(eq(clues.roomId, roomId));
  }
}

export const storage = new DatabaseStorage();
