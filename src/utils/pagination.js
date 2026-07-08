'use strict';

/**
 * @file src/utils/pagination.js
 * Helpers for parsing and normalising pagination query parameters.
 * @module utils/pagination
 */

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Parse and clamp pagination parameters from a query string.
 *
 * @param {{ page?: string|number, pageSize?: string|number }} query
 * @returns {{ page: number, pageSize: number }}
 *
 * @example
 * parsePagination({ page: '2', pageSize: '50' })
 * // → { page: 2, pageSize: 50 }
 */
function parsePagination(query = {}) {
  const page = Math.max(DEFAULT_PAGE, parseInt(String(query.page), 10) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(String(query.pageSize), 10) || DEFAULT_PAGE_SIZE)
  );
  return { page, pageSize };
}

/**
 * Build a PaginationMeta object for list responses.
 *
 * @param {number} page
 * @param {number} pageSize
 * @param {number} total - Total record count.
 * @returns {{ page: number, pageSize: number, total: number, totalPages: number }}
 */
function buildPaginationMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 0,
  };
}

module.exports = { parsePagination, buildPaginationMeta, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
