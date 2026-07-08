'use strict';

/**
 * @file src/services/hash.service.js
 *
 * Cryptographic hash-chain service using Node.js built-in crypto (SHA-256).
 *
 * Each LogEntry stores the SHA-256 hex digest of its own content combined with
 * the previous entry's hash, forming an immutable chain. Altering any past
 * entry changes its hash and breaks every subsequent link.
 *
 * Field serialisation order is fixed and must never change:
 *   previousHash | actor | action | JSON.stringify(payload) | createdAt (ISO)
 *
 * @module services/hash
 */

const crypto = require('crypto');

/**
 * Sentinel previousHash value used when computing the genesis entry's hash.
 * Stored as the literal string "0" — never null — so computeHash stays pure.
 * @type {string}
 */
const GENESIS_PREVIOUS_HASH = '0';

// ─── Core hash primitive ──────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hex digest from structured log-entry data.
 *
 * Field serialisation order (must never change once data exists in DB):
 *   actor | action | payload (JSON or "null") | previousHash | createdAt (ISO)
 *
 * @param {{
 *   actor?: string,
 *   action?: string,
 *   payload?: object|null,
 *   previousHash: string,
 *   createdAt?: Date|string,
 *   timestamp?: Date|string
 * }} data
 * @returns {string} 64-character lowercase hex digest.
 */
function generateHash(data) {
  // Support both `createdAt` (new) and `timestamp` (legacy) field names
  const ts = data.createdAt || data.timestamp;
  const input = [
    data.actor,
    data.action,
    data.payload !== null && data.payload !== undefined
      ? JSON.stringify(data.payload)
      : 'null',
    data.previousHash,
    ts instanceof Date ? ts.toISOString() : String(ts),
  ].join('|');

  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// ─── Named aliases (backward-compatible with existing callers) ────────────────

/**
 * Alias of generateHash — kept for call-site readability.
 * @type {typeof generateHash}
 */
const computeHash = generateHash;

// ─── Genesis helper ───────────────────────────────────────────────────────────

/**
 * Compute the hash for the very first entry (genesis).
 * Uses the sentinel "0" as previousHash.
 *
 * @param {string}      actor
 * @param {string}      action
 * @param {object|null} payload
 * @param {Date}        createdAt
 * @returns {string}
 */
function createGenesisHash(actor, action, payload, createdAt) {
  return generateHash({ actor, action, payload, previousHash: GENESIS_PREVIOUS_HASH, createdAt });
}

/** @type {typeof createGenesisHash} Alias used by log.service */
const buildGenesisHash = createGenesisHash;

// ─── Chain hash helper ────────────────────────────────────────────────────────

/**
 * Compute the hash for a non-genesis entry, chaining to its predecessor.
 *
 * @param {string}      actor
 * @param {string}      action
 * @param {object|null} payload
 * @param {string}      previousHash - currentHash of the immediately preceding entry.
 * @param {Date}        createdAt
 * @returns {string}
 */
function calculateCurrentHash(actor, action, payload, previousHash, createdAt) {
  return generateHash({ actor, action, payload, previousHash, createdAt });
}

/** @type {typeof calculateCurrentHash} Alias used by log.service */
const buildChainHash = calculateCurrentHash;

// ─── Single-entry verification ────────────────────────────────────────────────

/**
 * Verify one log entry by recomputing its hash and comparing to the stored value.
 *
 * @param {{
 *   actor: string,
 *   action: string,
 *   payload: object|null,
 *   previousHash: string|null,
 *   currentHash: string,
 *   createdAt: Date
 * }} entry
 * @param {string|null} resolvedPreviousHash
 *   The hash to use as previousHash when recomputing.
 *   Pass GENESIS_PREVIOUS_HASH for the first entry, or the prior entry's currentHash otherwise.
 * @returns {boolean} true if stored hash matches recomputed hash.
 */
function verifyEntry(entry, resolvedPreviousHash) {
  const expected = generateHash({
    actor: entry.actor,
    action: entry.action,
    payload: entry.payload,
    previousHash: resolvedPreviousHash ?? GENESIS_PREVIOUS_HASH,
    createdAt: entry.createdAt,
  });
  return entry.currentHash === expected;
}

// ─── Full-chain verification ──────────────────────────────────────────────────

/**
 * Walk all entries in createdAt ASC order and verify the entire hash chain.
 *
 * Checks:
 *   1. previousHash linkage (each entry references the prior entry's currentHash)
 *   2. currentHash integrity (stored hash matches recomputed hash)
 *   3. Chronological order (entries are already assumed sorted by caller)
 *
 * @param {Array<{
 *   id: string,
 *   actor: string,
 *   action: string,
 *   payload: object|null,
 *   previousHash: string|null,
 *   currentHash: string,
 *   createdAt: Date
 * }>} entries - All log entries ordered by createdAt ASC.
 *
 * @returns {{
 *   success: boolean,
 *   totalEntries: number,
 *   brokenEntryId?: string,
 *   reason?: string,
 *   expectedHash?: string,
 *   actualHash?: string
 * }}
 */
function verifyEntireChain(entries) {
  if (entries.length === 0) {
    return { success: true, totalEntries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const resolvedPreviousHash = i === 0 ? GENESIS_PREVIOUS_HASH : entries[i - 1].currentHash;

    // Check previousHash linkage (genesis entry should have null in DB; non-genesis must match)
    if (i > 0 && entry.previousHash !== entries[i - 1].currentHash) {
      return {
        success: false,
        totalEntries: entries.length,
        brokenEntryId: entry.id,
        reason: 'previousHash linkage broken',
        expectedHash: entries[i - 1].currentHash,
        actualHash: entry.previousHash ?? '',
      };
    }

    // Recompute and compare currentHash
    const expectedHash = generateHash({
      actor: entry.actor,
      action: entry.action,
      payload: entry.payload,
      previousHash: resolvedPreviousHash,
      createdAt: entry.createdAt,
    });

    if (entry.currentHash !== expectedHash) {
      return {
        success: false,
        totalEntries: entries.length,
        brokenEntryId: entry.id,
        reason: 'Hash mismatch',
        expectedHash,
        actualHash: entry.currentHash,
      };
    }
  }

  return { success: true, totalEntries: entries.length };
}

/**
 * Legacy alias — maps old { valid, totalEntries, brokenAt } shape to the
 * new { success, totalEntries, brokenEntryId } shape so existing callers
 * (tests, verification.service) continue to work without modification.
 *
 * @param {Array} entries
 * @returns {{ valid: boolean, totalEntries: number, brokenAt?: string }}
 */
function verifyChain(entries) {
  const result = verifyEntireChain(entries);
  return {
    valid: result.success,
    totalEntries: result.totalEntries,
    ...(result.brokenEntryId ? { brokenAt: result.brokenEntryId } : {}),
  };
}

module.exports = {
  // Primary API
  generateHash,
  createGenesisHash,
  calculateCurrentHash,
  verifyEntry,
  verifyEntireChain,
  GENESIS_PREVIOUS_HASH,
  // Aliases for backward compatibility
  computeHash,
  buildGenesisHash,
  buildChainHash,
  verifyChain,
};
