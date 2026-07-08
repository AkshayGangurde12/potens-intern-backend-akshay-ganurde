'use strict';

/**
 * @file src/services/verification.service.js
 *
 * Full-chain integrity verification.
 * Calls the repository and hash service directly — avoids circular
 * dependency through log.service.
 *
 * @module services/verification
 */

const repository = require('../repositories/log.repository');
const { verifyEntireChain } = require('./hash.service');

/**
 * Fetch all entries in insertion order and verify the hash chain.
 *
 * @returns {Promise<{
 *   success: boolean,
 *   totalEntries: number,
 *   brokenEntryId?: string,
 *   reason?: string,
 *   expectedHash?: string,
 *   actualHash?: string
 * }>}
 */
async function verifyIntegrity() {
  const entries = await repository.findAllOrdered();
  return verifyEntireChain(entries);
}

module.exports = { verifyIntegrity };
