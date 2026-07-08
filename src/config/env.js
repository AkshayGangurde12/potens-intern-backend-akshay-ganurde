'use strict';

/**
 * @file src/config/env.js
 *
 * Environment configuration — MUST be the first module loaded by the application.
 *
 * Loads .env via dotenv, then validates every required variable with Zod.
 * On failure it writes a human-readable message to stderr and exits with code 1,
 * so the application never starts in a misconfigured state.
 *
 * @module config/env
 */

const dotenv = require('dotenv');
const { z } = require('zod');

// ── 1. Load .env into process.env ────────────────────────────────────────────
// If the file is absent dotenv exits silently — we still validate whatever is
// already in process.env (e.g. when running inside Docker or CI).
dotenv.config();

// ── 2. Zod schema ─────────────────────────────────────────────────────────────

const envSchema = z.object({
  /** TCP port the HTTP server will listen on. */
  PORT: z.coerce
    .number()
    .int('PORT must be an integer')
    .min(1, 'PORT must be at least 1')
    .max(65535, 'PORT must be at most 65535'),

  /** Runtime environment — controls logging format and behaviour. */
  NODE_ENV: z.enum(['development', 'test', 'production'], {
    errorMap: () => ({ message: 'NODE_ENV must be one of: development, test, production' }),
  }),

  /** PostgreSQL connection string used by Prisma. */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be a non-empty string'),

  /** Pino log level threshold. Defaults to "info". */
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'], {
      errorMap: () => ({
        message: 'LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal',
      }),
    })
    .default('info'),

  /** Max requests per IP per window (optional, default 100). */
  RATE_LIMIT_MAX: z.coerce
    .number()
    .int('RATE_LIMIT_MAX must be an integer')
    .positive('RATE_LIMIT_MAX must be a positive integer')
    .default(100),

  /** Rate-limit window in milliseconds (optional, default 60000). */
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int('RATE_LIMIT_WINDOW_MS must be an integer')
    .positive('RATE_LIMIT_WINDOW_MS must be a positive integer')
    .default(60000),

  /** API key used to authenticate requests to protected endpoints. */
  API_KEY: z.string().min(1, 'API_KEY must be a non-empty string'),

  /** Allowed CORS origin. Defaults to * (allow all). Restrict in production. */
  CORS_ORIGIN: z.string().default('*'),
});

// ── 3. Parse & validate ───────────────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.errors
    .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
    .join('\n');

  process.stderr.write(`[CONFIG] Validation failed:\n${lines}\n`);
  process.exit(1);
}

// ── 4. Frozen config export ───────────────────────────────────────────────────

const raw = parsed.data;

/**
 * Validated, frozen application configuration.
 *
 * Never read process.env directly in application code — import this object.
 *
 * @type {Readonly<{
 *   port: number,
 *   nodeEnv: 'development'|'test'|'production',
 *   databaseUrl: string,
 *   logLevel: 'trace'|'debug'|'info'|'warn'|'error'|'fatal',
 *   rateLimitMax: number,
 *   rateLimitWindowMs: number,
 *   apiKey: string,
 *   corsOrigin: string
 * }>}
 */
const config = Object.freeze({
  port: raw.PORT,
  nodeEnv: raw.NODE_ENV,
  databaseUrl: raw.DATABASE_URL,
  logLevel: raw.LOG_LEVEL,
  rateLimitMax: raw.RATE_LIMIT_MAX,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  apiKey: raw.API_KEY,
  corsOrigin: raw.CORS_ORIGIN,
});

module.exports = { config };
