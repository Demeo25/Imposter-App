import { z } from 'zod';
import { rooms, players, clues } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  rooms: {
    create: {
      method: 'POST' as const,
      path: '/api/rooms' as const,
      input: z.object({
        playerName: z.string().min(1, "Name is required"),
      }),
      responses: {
        201: z.object({
          room: z.custom<typeof rooms.$inferSelect>(),
          player: z.custom<typeof players.$inferSelect>(),
        }),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/rooms/:code/join' as const,
      input: z.object({
        playerName: z.string().min(1, "Name is required"),
      }),
      responses: {
        200: z.object({
          room: z.custom<typeof rooms.$inferSelect>(),
          player: z.custom<typeof players.$inferSelect>(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:code' as const,
      responses: {
        200: z.object({
          room: z.custom<typeof rooms.$inferSelect>(),
          players: z.array(z.custom<typeof players.$inferSelect>()),
          clues: z.array(
            z.custom<typeof clues.$inferSelect>().and(
              z.object({ player: z.custom<typeof players.$inferSelect>() })
            )
          ),
        }),
        404: errorSchemas.notFound,
      },
    },
    settings: {
      method: 'PATCH' as const,
      path: '/api/rooms/:code/settings' as const,
      input: z.object({
        playerCount: z.number().min(3).max(20).optional(),
        imposterCount: z.number().min(1).max(5).optional(),
      }),
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/rooms/:code/start' as const,
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    clue: {
      method: 'POST' as const,
      path: '/api/rooms/:code/clue' as const,
      input: z.object({
        playerId: z.number(),
        word: z.string().min(1, "Clue must not be empty"),
      }),
      responses: {
        200: z.custom<typeof clues.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    vote: {
      method: 'POST' as const,
      path: '/api/rooms/:code/vote' as const,
      input: z.object({
        voterId: z.number(),
        votedForId: z.number(),
      }),
      responses: {
        200: z.custom<typeof players.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    guess: {
      method: 'POST' as const,
      path: '/api/rooms/:code/guess' as const,
      input: z.object({
        imposterId: z.number(),
        guessedWord: z.string().min(1),
      }),
      responses: {
        200: z.object({
          correct: z.boolean(),
          room: z.custom<typeof rooms.$inferSelect>(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    next: {
      method: 'POST' as const,
      path: '/api/rooms/:code/next' as const,
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CreateRoomInput = z.infer<typeof api.rooms.create.input>;
export type JoinRoomInput = z.infer<typeof api.rooms.join.input>;
export type RoomSettingsInput = z.infer<typeof api.rooms.settings.input>;
export type ClueInput = z.infer<typeof api.rooms.clue.input>;
export type VoteInput = z.infer<typeof api.rooms.vote.input>;
export type GuessInput = z.infer<typeof api.rooms.guess.input>;

export type RoomSessionResponse = z.infer<typeof api.rooms.create.responses[201]>;
export type RoomStateResponse = z.infer<typeof api.rooms.get.responses[200]>;
export type GuessResponse = z.infer<typeof api.rooms.guess.responses[200]>;
