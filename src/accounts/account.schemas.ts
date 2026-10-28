import { z } from 'zod';
import { bodyErrorMessage } from '../utils/schemas';

export const createAccountSchema = z
  .object({
    name: z
      .string({ error: 'name is required' })
      .trim()
      .min(1, 'name is required')
      .max(100, 'name must be at most 100 characters'),
  }, bodyErrorMessage)
  .strict();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
