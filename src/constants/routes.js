'use strict';

/**
 * @file src/constants/routes.js
 * Route path constants used when mounting routers in app.js.
 * Avoids duplicating path strings across app.js and tests.
 * @module constants/routes
 */

/** @type {Readonly<Record<string, string>>} */
const ROUTES = Object.freeze({
  HEALTH: '/health',
  API: '/api',
  API_LOG: '/api/log',
  API_LOGS: '/api/logs',
  API_VERIFY: '/api/verify',
  API_EXPORT: '/api/export',
});

module.exports = { ROUTES };
