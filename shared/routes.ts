import { z } from 'zod';
import { insertBotSchema } from './schema';

export const api = {
  bots: {
    list: {
      method: 'GET' as const,
      path: '/api/bots',
      responses: {
        200: z.array(insertBotSchema),
      },
    },
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
