import { z } from 'zod';
import { rooms, players, clues, categories } from './schema';

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
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: z.object({
        name: z.string().min(1),
        words: z.array(z.string().min(1)),
      }),
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  rooms: {
    create: {
      method: 'POST' as const,
      path: '/api/rooms' as const,
      input: z.object({
        playerName: z.string().min(1, "Name is required"),
        selectedCategoryIds: z.array(z.number()).optional(),
      }),
      responses: {
        201: z.object({
          room: z.custom<typeof rooms.$inferSelect>(),
          player: z.custom<typeof players.$inferSelect>(),
        }),
        400: errorSchemas.validation,
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
    start: {
      method: 'POST' as const,
      path: '/api/rooms/:code/start' as const,
      input: z.object({
        selectedCategoryIds: z.array(z.number()).optional(),
      }).optional(),
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    revealPlayer: {
      method: 'POST' as const,
      path: '/api/rooms/:code/reveal-player' as const,
      input: z.object({
        playerId: z.number(),
      }),
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    addPlayer: {
      method: 'POST' as const,
      path: '/api/rooms/:code/players' as const,
      input: z.object({
        name: z.string().min(1),
      }),
      responses: {
        200: z.custom<typeof players.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    removePlayer: {
      method: 'DELETE' as const,
      path: '/api/rooms/:code/players/:id' as const,
      responses: {
        204: z.void(),
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
    endGame: {
      method: 'POST' as const,
      path: '/api/rooms/:code/end-game' as const,
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
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
export type CreateCategoryInput = z.infer<typeof api.categories.create.input>;
export type RevealPlayerInput = z.infer<typeof api.rooms.revealPlayer.input>;

export type RoomSessionResponse = z.infer<typeof api.rooms.create.responses[201]>;
export type RoomStateResponse = z.infer<typeof api.rooms.get.responses[200]>;
export type CategoriesListResponse = z.infer<typeof api.categories.list.responses[200]>;
