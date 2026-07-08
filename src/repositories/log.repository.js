'use strict';

/**
 * @file src/repositories/log.repository.js
 *
 * Data-access layer for LogEntry records.
 *
 * Responsibilities:
 *   - All Prisma queries live here and NOWHERE else.
 *   - No business logic, no hash computation, no error throwing.
 *   - Transactions are handled here when atomicity is required.
 *
 * @module repositories/log
 */

const { prisma } = require('../config/database');

// ─── Single-record reads ──────────────────────────────────────────────────────

/**
 * Find a single LogEntry by UUID.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  return prisma.logEntry.findUnique({ where: { id } });
}

/**
 * Return the most recently inserted LogEntry (createdAt DESC).
 * Returns null when the table is empty — caller handles genesis case.
 *
 * @returns {Promise<object|null>}
 */
async function findLatest() {
  return prisma.logEntry.findFirst({ orderBy: { createdAt: 'desc' } });
}

/**
 * Return the entry immediately before the given createdAt timestamp.
 * Useful when you need the predecessor by time rather than ID.
 *
 * @param {Date} createdAt
 * @returns {Promise<object|null>}
 */
async function findPrevious(createdAt) {
  return prisma.logEntry.findFirst({
    where: { createdAt: { lt: createdAt } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── List reads ───────────────────────────────────────────────────────────────

/**
 * Return a paginated list of LogEntry records ordered by createdAt ASC.
 *
 * @param {number} page     - 1-based page index.
 * @param {number} pageSize - Records per page.
 * @returns {Promise<object[]>}
 */
async function findAll(page, pageSize) {
  return prisma.logEntry.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Return ALL records ordered by createdAt ASC (no pagination).
 * Used for full-chain verification and export.
 *
 * @returns {Promise<object[]>}
 */
async function findAllOrdered() {
  return prisma.logEntry.findMany({ orderBy: { createdAt: 'asc' } });
}

/**
 * Return filtered records for export, ordered by createdAt ASC.
 *
 * @param {{
 *   actor?: string,
 *   from?: Date|string,
 *   to?: Date|string
 * }} [filters]
 * @returns {Promise<object[]>}
 */
async function findFiltered(filters = {}) {
  /** @type {import('@prisma/client').Prisma.LogEntryWhereInput} */
  const where = {};

  if (filters.actor) {
    where.actor = filters.actor;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to)   where.createdAt.lte = new Date(filters.to);
  }

  return prisma.logEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Return the total count of LogEntry records.
 *
 * @returns {Promise<number>}
 */
async function count() {
  return prisma.logEntry.count();
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Persist a new LogEntry inside a Prisma transaction.
 * Using a transaction prevents partial writes if the DB connection drops
 * mid-operation or a constraint violation rolls back the insert.
 *
 * @param {{
 *   actor: string,
 *   action: string,
 *   payload?: object|null,
 *   previousHash: string|null,
 *   currentHash: string,
 *   createdAt?: Date
 * }} data
 * @returns {Promise<object>} The persisted LogEntry.
 */
async function create(data) {
  return prisma.$transaction(async (tx) => {
    return tx.logEntry.create({ data });
  });
}

module.exports = {
  findById,
  findLatest,
  findPrevious,
  findAll,
  findAllOrdered,
  findFiltered,
  count,
  create,
};
