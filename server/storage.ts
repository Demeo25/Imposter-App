import { db } from "./db";
import { eq, isNull } from "drizzle-orm";
import {
  rooms, players, clues, categories, profiles, groups,
  type Room, type Player, type Clue, type Category, type Profile, type Group,
  type InsertRoom, type InsertPlayer, type InsertClue, type InsertCategory, type InsertProfile,
} from "@shared/schema";

export interface IStorage {
  // Groups
  getGroupByCode(code: string): Promise<Group | undefined>;
  createGroup(data: { code: string; name?: string }): Promise<Group>;

  // Profiles
  getProfiles(groupId?: number | null): Promise<Profile[]>;
  getProfile(id: number): Promise<Profile | undefined>;
  createProfile(data: { name: string; groupId?: number | null }): Promise<Profile>;
  updateProfile(id: number, updates: Partial<InsertProfile>): Promise<Profile>;
  deleteProfile(id: number): Promise<void>;

  // Rooms
  createRoom(insertRoom: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room>;

  // Players
  createPlayer(insertPlayer: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayersByRoom(roomId: number): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player>;
  deletePlayer(id: number): Promise<void>;

  // Clues
  createClue(insertClue: InsertClue): Promise<Clue>;
  getCluesByRoom(roomId: number): Promise<Clue[]>;
  clearCluesByRoom(roomId: number): Promise<void>;

  // Categories
  getCategories(groupId?: number | null): Promise<Category[]>;
  createCategory(insertCategory: InsertCategory): Promise<Category>;
  getCategoryById(id: number): Promise<Category | undefined>;
  updateCategory(id: number, updates: { words: string[] }): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ── Groups ────────────────────────────────────────────────────────────────

  async getGroupByCode(code: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.code, code.toUpperCase()));
    return group;
  }

  async createGroup(data: { code: string; name?: string }): Promise<Group> {
    const [group] = await db.insert(groups).values({ code: data.code.toUpperCase(), name: data.name ?? null }).returning();
    return group;
  }

  // ── Profiles ──────────────────────────────────────────────────────────────

  async getProfiles(groupId?: number | null): Promise<Profile[]> {
    if (groupId === undefined || groupId === null) {
      // Return profiles with no group (legacy local)
      return await db.select().from(profiles).where(isNull(profiles.groupId)).orderBy(profiles.name);
    }
    return await db.select().from(profiles).where(eq(profiles.groupId, groupId)).orderBy(profiles.name);
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async createProfile(data: { name: string; groupId?: number | null }): Promise<Profile> {
    const [profile] = await db.insert(profiles).values({ name: data.name, groupId: data.groupId ?? null }).returning();
    return profile;
  }

  async updateProfile(id: number, updates: Partial<InsertProfile>): Promise<Profile> {
    const [profile] = await db.update(profiles).set(updates).where(eq(profiles.id, id)).returning();
    return profile;
  }

  async deleteProfile(id: number): Promise<void> {
    await db.delete(profiles).where(eq(profiles.id, id));
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room> {
    const [room] = await db.update(rooms).set(updates).where(eq(rooms.id, id)).returning();
    return room;
  }

  // ── Players ───────────────────────────────────────────────────────────────

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
    const [player] = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return player;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  // ── Clues ─────────────────────────────────────────────────────────────────

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

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(groupId?: number | null): Promise<Category[]> {
    // Always return global (non-custom) categories
    const globalCats = await db.select().from(categories).where(eq(categories.isCustom, false));
    // Return custom categories scoped to the group (or ungrouped if no group)
    let customCats: Category[];
    if (groupId) {
      customCats = await db.select().from(categories)
        .where(eq(categories.groupId, groupId));
      // Filter to only custom ones for this group
      customCats = customCats.filter(c => c.isCustom);
    } else {
      // Local/ungrouped custom categories (groupId IS NULL)
      const allCustom = await db.select().from(categories).where(eq(categories.isCustom, true));
      customCats = allCustom.filter(c => c.groupId === null);
    }
    return [...globalCats, ...customCats];
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async updateCategory(id: number, updates: { words: string[] }): Promise<Category> {
    const [category] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }
}

export const storage = new DatabaseStorage();
