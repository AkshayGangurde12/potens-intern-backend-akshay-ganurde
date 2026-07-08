'use strict';

/**
 * @file src/validators/log.validator.js
 *
 * Zod schemas for log-entry request bodies.
 * Validator constraints align with the Prisma schema field lengths.
 *
 * @module validators/log
 */

const { z } = require('zod');

/**
 * Schema for POST /api/log — creates a new log entry.
 *
 * @type {import('zod').ZodObject}
 */
const CreateLogSchema = z.object({
  /** Identity of the entity creating the entry. Required. Max 100 chars (prompt) / 255 chars (DB). */
  actor: z
    .string({ required_error: 'actor is required' })
    .min(1, 'actor must be at least 1 character')
    .max(100, 'actor must be at most 100 characters'),

  /** Short event descriptor. Required. Max 500 chars. */
  action: z
    .string({ required_error: 'action is required' })
    .min(1, 'action must be at least 1 character')
    .max(500, 'action must be at most 500 characters'),

/** Optional structured metadata — must be a plain object or null. */
  payload: z.record(z.unknown()).nullable().optional().default(null),
});

/**
 * Schema for export query parameters.
 *
 * @type {import('zod').ZodObject}
 */
const ExportFilterSchema = z.object({
  actor: z.string().optional(),
  from: z.string().datetime({ message: 'from must be a valid ISO-8601 datetime' }).optional(),
  to:   z.string().datetime({ message: 'to must be a valid ISO-8601 datetime' }).optional(),
});

module.exports = { CreateLogSchema, ExportFilterSchema };
