'use strict';

/**
 * @file src/services/log.service.js
 *
 * Business logic for LogEntry creation, retrieval, and export.
 * Hash computation → hash.service
 * Database access  → log.repository
 * Chain verification → verification.service (separate concern)
 *
 * @module services/log
 */

const repository = require('../repositories/log.repository');
const hashService = require('./hash.service');
const { AppError } = require('../errors/AppError');

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new LogEntry and link it to the hash chain.
 *
 * Workflow:
 *   1. Read the latest entry to determine previousHash.
 *   2. For the first record: set previousHash = "GENESIS"
 *      For subsequent records: set previousHash = latest.currentHash
 *   3. Compute currentHash using SHA256(previousHash + actor + action + payload + createdAt)
 *   4. Persist inside a Prisma transaction.
 *   5. Return the saved record.
 *
 * @param {{ actor: string, action: string, payload?: object|null }} dto
 * @returns {Promise<object>}
 */
async function createLogEntry(dto) {
  const { actor, action, payload = null } = dto;
  const createdAt = new Date();

  const latest = await repository.findLatest();
  let previousHash;
  let currentHash;

  if (latest === null) {
    // First record — store "GENESIS" as previousHash per assessment specification
    previousHash = hashService.GENESIS_PREVIOUS_HASH;
    currentHash = hashService.createGenesisHash(actor, action, payload, createdAt);
  } else {
    previousHash = latest.currentHash;
    currentHash = hashService.calculateCurrentHash(actor, action, payload, previousHash, createdAt);
  }

  return repository.create({ actor, action, payload, previousHash, currentHash, createdAt });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve a single LogEntry by UUID, enriched with its hash verification status.
 *
 * The verification checks whether the stored currentHash matches a freshly
 * recomputed hash for this entry. It does NOT verify the full chain — use
 * verification.service for that.
 *
 * @param {string} id
 * @returns {Promise<{ entry: object, verificationStatus: boolean }>}
 * @throws {AppError} 404 if the entry does not exist.
 */
async function getLogById(id) {
  const entry = await repository.findById(id);
  if (!entry) {
    throw new AppError('Log entry not found', 404, 'NOT_FOUND');
  }

  const resolvedPreviousHash = entry.previousHash ?? hashService.GENESIS_PREVIOUS_HASH;
  const verificationStatus = hashService.verifyEntry(entry, resolvedPreviousHash);

  return { entry, verificationStatus };
}

/**
 * Retrieve a single LogEntry by UUID (no verification enrichment).
 *
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} 404 if not found.
 */
async function getLogEntryById(id) {
  const { entry } = await getLogById(id);
  return entry;
}

/**
 * Return a paginated list of log entries ordered by createdAt ASC.
 *
 * @param {number} [page=1]
 * @param {number} [pageSize=20]
 * @returns {Promise<{ data: object[], meta: { page: number, pageSize: number, total: number } }>}
 */
async function getAllLogEntries(page = 1, pageSize = 20) {
  const [data, total] = await Promise.all([
    repository.findAll(page, pageSize),
    repository.count(),
  ]);
  return { data, meta: { page, pageSize, total } };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Export log entries with optional filtering.
 *
 * @param {{
 *   actor?: string,
 *   from?: Date|string,
 *   to?: Date|string
 * }} [filters]
 * @returns {Promise<object[]>}
 */
async function exportLogs(filters = {}) {
  return repository.findFiltered(filters);
}

module.exports = {
  createLogEntry,
  getLogById,
  getLogEntryById,
  getAllLogEntries,
  exportLogs,
};
