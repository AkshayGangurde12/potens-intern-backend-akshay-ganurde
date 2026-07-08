'use strict';

/**
 * @file src/services/health.service.js
 *
 * Health-check service — verifies database connectivity within a timeout.
 *
 * Returns a plain object; never throws to the caller so the controller can
 * always send a response regardless of DB state.
 *
 * @module services/health
 */

const { prisma } = require('../config/database');

/** Milliseconds to wait for the DB probe before treating it as unreachable.
 *  Increased to 5000ms to accommodate cloud/pooled database connection latency.
 */
const DB_TIMEOUT_MS = 5000;

/**
 * Checks database connectivity and returns a health status object.
 *
 * @returns {Promise<{
 *   status: 'ok'|'degraded',
 *   database: 'ok'|'unreachable',
 *   timestamp: string
 * }>}
 */
async function checkHealth() {
  const timestamp = new Date().toISOString();

  const probe = prisma.$queryRawUnsafe('SELECT 1');
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('DB probe timed out')), DB_TIMEOUT_MS)
  );

  try {
    await Promise.race([probe, timeout]);
    return { status: 'ok', database: 'ok', timestamp };
  } catch {
    return { status: 'degraded', database: 'unreachable', timestamp };
  }
}

module.exports = { checkHealth };
