import { z } from 'zod';
import { amountSchema, bodyErrorMessage, descriptionSchema, referenceIdSchema } from '../utils/schemas';

const typeSchema = z.enum(['credit', 'debit'], { error: "type must be either 'credit' or 'debit'" });

export const createTransactionSchema = z
  .object({
    type: typeSchema,
    amount: amountSchema,
    description: descriptionSchema,
    reference_id: referenceIdSchema,
  }, bodyErrorMessage)
  .strict();

export const listTransactionsQuerySchema = z.object({
  type: typeSchema.optional(),
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
