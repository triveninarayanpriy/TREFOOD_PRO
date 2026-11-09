import { z } from 'zod';

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  commit: z.string(),
  db: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
