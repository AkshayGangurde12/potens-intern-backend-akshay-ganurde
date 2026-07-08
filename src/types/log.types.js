'use strict';

/**
 * @file src/types/log.types.js
 * JSDoc type definitions for log-entry DTOs and service results.
 * Documentation only — no runtime code.
 * @module types/log
 */

/**
 * Data Transfer Object for creating a new log entry.
 *
 * @typedef {Object} CreateLogDTO
 * @property {string}             actor   - Identity of the creator (max 100 chars).
 * @property {string}             action  - Short event descriptor (max 500 chars).
 * @property {Record<string,*>}   payload - Structured metadata object.
 */

/**
 * Full log entry as returned from the database.
 *
 * @typedef {Object} LogEntryDTO
 * @property {string}             id           - UUID primary key.
 * @property {string}             actor        - Creator identity.
 * @property {string}             action       - Event descriptor.
 * @property {Record<string,*>|null} payload   - Metadata or null.
 * @property {string|null}        previousHash - Prior entry's currentHash (null for genesis).
 * @property {string}             currentHash  - SHA-256 of this entry's content.
 * @property {Date}               createdAt    - Insertion timestamp (immutable).
 */

/**
 * Result returned by the full-chain verification operation.
 *
 * @typedef {Object} VerificationResult
 * @property {boolean}  success        - true if every entry's hash is valid.
 * @property {number}   totalEntries   - Total entries scanned.
 * @property {string}   [brokenEntryId] - ID of the first invalid entry.
 * @property {string}   [reason]       - Human-readable explanation of failure.
 * @property {string}   [expectedHash] - What the hash should be.
 * @property {string}   [actualHash]   - What the hash actually is.
 */

/**
 * Filters accepted by the export endpoint.
 *
 * @typedef {Object} ExportFilter
 * @property {string}       [actor] - Filter by actor name (exact match).
 * @property {Date|string}  [from]  - Return entries at or after this timestamp.
 * @property {Date|string}  [to]    - Return entries at or before this timestamp.
 */

module.exports = {};
