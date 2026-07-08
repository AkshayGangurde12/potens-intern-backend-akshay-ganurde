'use strict';

/**
 * @file src/utils/crypto.js
 *
 * Cryptographic utility — placeholder that re-exports the Node.js built-in
 * `crypto` module. Business logic (SHA-256 hash chain) is implemented in
 * src/services/hash.service.js and imports `crypto` directly.
 *
 * This file exists as the designated place for any future app-level
 * crypto helpers (e.g. key generation, token signing).
 *
 * @module utils/crypto
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically random hex string of the given byte length.
 *
 * @param {number} [bytes=32] - Number of random bytes (output length = bytes * 2).
 * @returns {string} Hex-encoded random string.
 */
function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { randomHex, crypto };
