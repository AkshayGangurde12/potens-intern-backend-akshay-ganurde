'use strict';

/**
 * @file src/lib/logger.js
 *
 * Pino logger factory and singleton.
 *
 * Format selection:
 *   - development → pino-pretty (colourised, human-readable)
 *   - test        → silent (suppresses output during test runs)
 *   - production / other → raw JSON to stdout
 *
 * Sensitive fields listed in REDACTED_PATHS are replaced with "[Redacted]"
 * at the serialiser level — they never appear in any log line.
 *
 * @module lib/logger
 */

const pino = require('pino');
const { config } = require('../config/env');

/** @type {string[]} Field paths whose values are replaced with "[Redacted]". */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.body.password',
  'req.body.token',
  'req.body.secret',
  '*.token',
  '*.secret',
  '*.password',
  '*.authorization',
];

/**
 * Creates a configured Pino logger instance.
 *
 * @param {string} level   - Minimum log level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal').
 * @param {string} nodeEnv - Runtime environment ('development' | 'test' | 'production').
 * @returns {import('pino').Logger}
 */
function createLogger(level, nodeEnv) {
  // Silence all output during test runs so Jest output stays clean.
  const effectiveLevel = nodeEnv === 'test' ? 'silent' : level;

  /** @type {import('pino').LoggerOptions} */
  const baseOptions = {
    level: effectiveLevel,
    redact: {
      paths: REDACTED_PATHS,
      censor: '[Redacted]',
    },
  };

  if (nodeEnv === 'development') {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production and all other environments: raw JSON, no transport overhead.
  return pino(baseOptions);
}

/**
 * Shared logger singleton.
 *
 * Import this in any module that needs to emit logs directly, and pass it to
 * pino-http so HTTP request logs share the same Pino instance.
 *
 * @type {import('pino').Logger}
 */
const logger = createLogger(config.logLevel, config.nodeEnv);

module.exports = { logger, createLogger };
