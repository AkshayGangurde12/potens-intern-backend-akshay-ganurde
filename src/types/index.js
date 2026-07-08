'use strict';

/**
 * @file src/types/index.js
 *
 * Shared JSDoc type definitions for the entire application.
 * These are documentation-only — no runtime code.
 *
 * @module types
 */

/**
 * Standard API success response shape.
 *
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Always true for success responses.
 * @property {string}  message - Human-readable description.
 * @property {*}       [data]  - Response payload.
 */

/**
 * Standard API error response shape.
 *
 * @typedef {Object} ErrorResponse
 * @property {boolean}          success - Always false for error responses.
 * @property {string}           message - Human-readable error description.
 * @property {Array|undefined}  [details] - Field-level validation errors.
 */

/**
 * Pagination metadata returned with list responses.
 *
 * @typedef {Object} PaginationMeta
 * @property {number} page     - Current page (1-based).
 * @property {number} pageSize - Items per page.
 * @property {number} total    - Total items across all pages.
 * @property {number} totalPages - Total number of pages.
 */

/**
 * Paginated API response shape.
 *
 * @typedef {Object} PaginatedResponse
 * @property {boolean}        success    - Always true.
 * @property {string}         message    - Human-readable description.
 * @property {Array}          data       - Page of items.
 * @property {PaginationMeta} meta       - Pagination metadata.
 */

/**
 * Express Request extended with authenticated API key flag.
 *
 * @typedef {import('express').Request & { apiKeyVerified?: boolean }} AuthenticatedRequest
 */

module.exports = {};
