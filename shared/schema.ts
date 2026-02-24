import { pgTable, text, serial, integer, boolean, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting, playing, voting, finished
  playerCount: integer("player_count").notNull().default(4),
  imposterCount: integer("imposter_count").notNull().default(1),
  currentCategory: text("current_category"),
  currentWord: text("current_word"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  name: text("name").notNull(),
  isHost: boolean("is_host").notNull().default(false),
  isImposter: boolean("is_imposter").notNull().default(false),
  score: integer("score").notNull().default(0),
  votedForId: integer("voted_for_id"),
  eliminated: boolean("eliminated").notNull().default(false),
});

export const clues = pgTable("clues", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  playerId: integer("player_id").notNull(),
  word: text("word").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const roomsRelations = relations(rooms, ({ many }) => ({
  players: many(players),
  clues: many(clues),
}));

export const playersRelations = relations(players, ({ one }) => ({
  room: one(rooms, {
    fields: [players.roomId],
    references: [rooms.id],
  }),
}));

export const cluesRelations = relations(clues, ({ one }) => ({
  room: one(rooms, {
    fields: [clues.roomId],
    references: [rooms.id],
  }),
  player: one(players, {
    fields: [clues.playerId],
    references: [players.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertClueSchema = createInsertSchema(clues).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Clue = typeof clues.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertClue = z.infer<typeof insertClueSchema>;

// Request types
export type CreateRoomRequest = {
  playerName: string; // The host's name
};
export type JoinRoomRequest = {
  code: string;
  playerName: string;
};
export type UpdateRoomSettingsRequest = {
  playerCount?: number;
  imposterCount?: number;
};
export type SubmitClueRequest = {
  playerId: number;
  word: string;
};
export type SubmitVoteRequest = {
  voterId: number;
  votedForId: number;
};
export type SubmitGuessRequest = {
  imposterId: number;
  guessedWord: string;
};

// Response types
export type RoomStateResponse = {
  room: Room;
  players: Player[];
  clues: (Clue & { player: Player })[];
};

export type PlayerSessionResponse = {
  player: Player;
  roomCode: string;
};