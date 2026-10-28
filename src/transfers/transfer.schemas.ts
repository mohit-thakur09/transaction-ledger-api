import { z } from 'zod';
import { amountSchema, bodyErrorMessage, descriptionSchema, referenceIdSchema } from '../utils/schemas';

const accountIdSchema = (field: string) =>
  z.string({ error: `${field} is required` }).trim().min(1, `${field} is required`);

export const createTransferSchema = z
  .object({
    from_account_id: accountIdSchema('from_account_id'),
    to_account_id: accountIdSchema('to_account_id'),
    amount: amountSchema,
    description: descriptionSchema,
    reference_id: referenceIdSchema,
  }, bodyErrorMessage)
  .strict()
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: 'from_account_id and to_account_id must be different',
    path: ['to_account_id'],
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
