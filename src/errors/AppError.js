'use strict';

/**
 * @file src/errors/AppError.js
 *
 * Base class for all application errors.
 *
 * The `isOperational` flag distinguishes known domain errors (404, 401, 422)
 * from unexpected programmer errors (500), guiding the global error handler's
 * logging severity and response strategy.
 *
 * @module errors/AppError
 */

/**
 * Application-level error with HTTP status code and machine-readable code.
 *
 * @example
 * throw new AppError('Log entry not found', 404, 'NOT_FOUND');
 */
class AppError extends Error {
  /**
   * @param {string}  message       - Human-readable error description.
   * @param {number}  statusCode    - HTTP status code to return (e.g. 404, 422).
   * @param {string}  code          - Machine-readable error code (e.g. 'NOT_FOUND').
   * @param {boolean} [isOperational=true] - true for expected domain errors; false for bugs.
   */
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Ensure instanceof checks work correctly in all environments.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Type guard — returns true if the value is an AppError instance.
 *
 * @param {unknown} err
 * @returns {err is AppError}
 */
function isAppError(err) {
  return err instanceof AppError;
}

module.exports = { AppError, isAppError };
