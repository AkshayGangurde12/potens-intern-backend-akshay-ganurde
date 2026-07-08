'use strict';

/**
 * @file src/config/database.js
 *
 * Prisma Client singleton.
 *
 * A single PrismaClient instance is shared across the entire application to
 * avoid exhausting the PostgreSQL connection pool.  In development the instance
 * is cached on the global object so that hot-reloads (via nodemon) reuse the
 * same connection instead of leaking a new one on every file save.
 *
 * @module config/database
 */

const { PrismaClient } = require('@prisma/client');

/**
 * @type {PrismaClient}
 */
const prisma = global.__prisma ?? new PrismaClient();

// Cache the instance on the global object outside production so hot-reloads
// do not create a new connection pool on every restart.
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = { prisma };
