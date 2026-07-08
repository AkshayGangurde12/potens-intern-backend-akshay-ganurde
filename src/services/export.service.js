'use strict';

/**
 * @file src/services/export.service.js
 *
 * Export service — returns all log entries as JSON with optional filters.
 *
 * @module services/export
 */

const { exportLogs } = require('./log.service');

/**
 * Export all matching log entries ordered by createdAt ASC.
 *
 * @param {{
 *   actor?: string,
 *   from?: Date|string,
 *   to?: Date|string
 * }} [filters]
 * @returns {Promise<object[]>}
 */
async function exportAsJson(filters = {}) {
  return exportLogs(filters);
}

module.exports = { exportAsJson };
