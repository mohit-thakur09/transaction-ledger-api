import { z } from 'zod';
import { hasAtMostTwoDecimals } from './money';

export const amountSchema = z
  .number({ error: 'amount must be a number' })
  .positive('amount must be greater than 0')
  .max(1_000_000_000, 'amount is too large')
  .refine(hasAtMostTwoDecimals, 'amount can have at most 2 decimal places');

export const referenceIdSchema = z
  .string({ error: 'reference_id is required' })
  .trim()
  .min(1, 'reference_id is required')
  .max(100, 'reference_id must be at most 100 characters');

export const descriptionSchema = z
  .string({ error: 'description must be a string' })
  .trim()
  .max(255, 'description must be at most 255 characters')
  .optional();

export const bodyErrorMessage = { error: 'Request body must be a JSON object' };
