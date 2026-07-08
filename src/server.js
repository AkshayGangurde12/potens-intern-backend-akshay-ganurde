'use strict';

/**
 * @file src/server.js
 *
 * HTTP server entry point.
 *
 * Responsibilities:
 *   - Create the Express application
 *   - Bind it to the configured port
 *   - Handle graceful shutdown on SIGTERM / SIGINT
 *
 * @module server
 */

const { config } = require('./config/env');
const { createApp } = require('./app');
const { prisma } = require('./config/database');
const { logger } = require('./lib/logger');

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30_000;
const PRISMA_DISCONNECT_TIMEOUT_MS = 5_000;

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, nodeEnv: config.nodeEnv },
    'Server started'
  );
});

server.on('error', (err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

/**
 * Gracefully shuts down the HTTP server and Prisma client.
 *
 * 1. Stops accepting new connections.
 * 2. Waits up to 30 s for in-flight requests to finish.
 * 3. Disconnects Prisma within 5 s.
 * 4. Exits with code 0 on success, 1 on timeout.
 *
 * @param {string} signal - The OS signal that triggered shutdown.
 */
async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — draining connections');

  // Stop accepting new connections and wait for in-flight requests
  await new Promise((resolve) => {
    const forceCloseTimer = setTimeout(() => {
      logger.warn('Graceful shutdown timeout — forcing close');
      resolve();
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    server.close(() => {
      clearTimeout(forceCloseTimer);
      resolve();
    });
  });

  // Disconnect Prisma with a hard timeout
  try {
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Prisma disconnect timed out')),
          PRISMA_DISCONNECT_TIMEOUT_MS
        )
      ),
    ]);
    logger.info('Prisma disconnected — exiting cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Prisma disconnect failed — forcing exit');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
