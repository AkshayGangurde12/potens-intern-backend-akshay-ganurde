'use strict';

/**
 * @file src/utils/response.helper.js
 *
 * Typed response helpers — every API response goes through one of these.
 * All functions return `res` so callers can chain if needed.
 *
 * Response shapes:
 *   success  → { success: true,  message, data }
 *   created  → { success: true,  message, data }  (201)
 *   error    → { success: false, message, details? }
 *   paginated→ { success: true,  message, data, meta }
 *
 * @module utils/response
 */

const { MESSAGES } = require('../constants/messages');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Send a 200 success response.
 *
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function success(res, data, message = MESSAGES.OK) {
  return res.status(HTTP_STATUS.OK).json({ success: true, message, data });
}

/**
 * Send a 201 created response.
 *
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function created(res, data, message = MESSAGES.CREATED) {
  return res.status(HTTP_STATUS.CREATED).json({ success: true, message, data });
}

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {Array|undefined} [details]
 */
function error(res, statusCode, message, details) {
  const body = { success: false, message };
  if (details !== undefined) body.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Send a paginated list response.
 *
 * @param {import('express').Response} res
 * @param {Array}  data
 * @param {{ page: number, pageSize: number, total: number, totalPages: number }} meta
 * @param {string} [message]
 */
function paginated(res, data, meta, message = MESSAGES.OK) {
  return res.status(HTTP_STATUS.OK).json({ success: true, message, data, meta });
}

// Keep the original low-level helpers for backward-compat with existing code
/**
 * @deprecated Use success() instead.
 */
function sendSuccess(res, statusCode, data) {
  return res.status(statusCode).json({ data });
}

/**
 * @deprecated Use error() instead.
 */
function sendError(res, statusCode, message, details) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, created, error, paginated, sendSuccess, sendError };
