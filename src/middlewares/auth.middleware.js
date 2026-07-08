'use strict';

const crypto = require('crypto');
const { config } = require('../config/env');

function timingSafeEqual(provided, expected) {
  const len = Math.max(provided.length, expected.length, 1);

  const a = Buffer.alloc(len);
  const b = Buffer.alloc(len);

  Buffer.from(provided).copy(a);
  Buffer.from(expected).copy(b);

  return crypto.timingSafeEqual(a, b);
}

function requireApiKey(req, res, next) {
  const provided = req.header('x-api-key');

  console.log('========== AUTH DEBUG ==========');
  console.log('Headers:', req.headers);
  console.log('Provided:', provided);
  console.log('Expected:', config.apiKey);
  console.log('================================');

  if (!provided || !timingSafeEqual(String(provided), String(config.apiKey))) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
}

module.exports = {
  requireApiKey,
};