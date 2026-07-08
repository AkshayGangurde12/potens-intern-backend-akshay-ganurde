'use strict';

/**
 * @file src/utils/date.js
 * Date and time utilities used across the application.
 * @module utils/date
 */

/**
 * Return the current UTC datetime as an ISO-8601 string.
 *
 * @returns {string} e.g. "2024-01-15T10:30:00.000Z"
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Convert a Date (or date string) to an ISO-8601 UTC string.
 *
 * @param {Date|string|number} date
 * @returns {string}
 */
function toIso(date) {
  return new Date(date).toISOString();
}

/**
 * Return the number of milliseconds elapsed since a start hrtime bigint.
 *
 * @param {bigint} startBigInt - Value from process.hrtime.bigint()
 * @returns {number} Elapsed milliseconds rounded to 2 decimal places.
 */
function elapsedMs(startBigInt) {
  return Math.round(Number(process.hrtime.bigint() - startBigInt) / 1e4) / 100;
}

module.exports = { nowIso, toIso, elapsedMs };
