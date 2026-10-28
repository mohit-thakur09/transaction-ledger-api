import { z } from 'zod';
import { AppError } from '../errors/AppError';

export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || null,
      message: issue.message,
    }));
    throw AppError.validation('Invalid request data', details);
  }
  return result.data;
}
