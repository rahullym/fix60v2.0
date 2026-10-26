import type { z } from 'zod';
import { uuidParamSchema } from '@fix60/shared';

/** Validates untrusted input; ZodError is mapped to 400 by the global filter. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  return schema.parse(input);
}

/** Parses a UUID route param. */
export function parseUuid(value: unknown): string {
  return uuidParamSchema.parse(value);
}
