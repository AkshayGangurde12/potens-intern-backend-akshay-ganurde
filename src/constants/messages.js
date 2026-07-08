'use strict';

/**
 * @file src/constants/messages.js
 * Application-wide string constants for API responses and error messages.
 * Centralising these prevents typos and makes message changes a one-line edit.
 * @module constants/messages
 */

/** @type {Readonly<Record<string, string>>} */
const MESSAGES = Object.freeze({
  // Success
  OK: 'Success',
  CREATED: 'Resource created successfully',

  // Auth
  UNAUTHORIZED: 'Unauthorized',
  INVALID_API_KEY: 'Invalid API Key',

  // Validation
  VALIDATION_ERROR: 'Validation Error',

  // Not found
  NOT_FOUND: 'Not Found',
  LOG_ENTRY_NOT_FOUND: 'Log entry not found',

  // Rate limiting
  TOO_MANY_REQUESTS: 'Too Many Requests',

  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  SERVICE_UNAVAILABLE: 'Service Unavailable',
});

module.exports = { MESSAGES };
