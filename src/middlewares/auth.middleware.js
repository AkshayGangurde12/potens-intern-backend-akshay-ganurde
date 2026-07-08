'use strict';

/**
 * @file src/middlewares/auth.middleware.js
 *
 * API key authentication middleware.
 * Validates the `x-api-key` header on every protected request using
 * crypto.timingSafeEqual to prevent timing-based key enumeration attacks.
 *
 * @module middlewares/auth
 */

const crypto = require('crypto');
const { config } = require('../config/env');

/**
 * Constant-time string comparison using Node.js crypto.timingSafeEqual.
 * Buffers are zero-padded to the same length before comparison so that
 * the comparison time does not reveal the length of the expected key.
 *
 * @param {string} provided - Value supplied by the caller.
 * @param {string} expected - Configured secret value.
 * @returns {boolean}
 */
function timingSafeEqual(provided, expected) {
  // Use fixed-length buffers to avoid leaking string length
  const len = Math.max(provided.length, expected.length, 1);
  const a = Buffer.alloc(len);
  const b = Buffer.alloc(len);
  Buffer.from(provided).copy(a);
  Buffer.from(expected).copy(b);
  return crypto.timingSafeEqual(a, b);
}

/**
 * Middleware that requires a valid `x-api-key` header.
 * Returns 401 if the header is absent or does not match the configured API key.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireApiKey(req, res, next) {
  const provided = req.header('x-api-key');

  if (!provided || !timingSafeEqual(String(provided), config.apiKey)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return next();
}

module.exports = { requireApiKey };
