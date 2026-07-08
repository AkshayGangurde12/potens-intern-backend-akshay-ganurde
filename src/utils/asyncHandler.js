'use strict';

/**
 * @file src/utils/asyncHandler.js
 *
 * Wraps an async Express route handler so any rejected promise is forwarded
 * to Express's next(err) instead of causing an unhandled rejection crash.
 *
 * @module utils/asyncHandler
 */

/**
 * @param {function(
 *   import('express').Request,
 *   import('express').Response,
 *   import('express').NextFunction
 * ): Promise<void>} fn - Async route handler to wrap.
 * @returns {function} Synchronous wrapper safe to pass to Express.
 *
 * @example
 * router.get('/logs', asyncHandler(async (req, res) => {
 *   const logs = await logService.getAll();
 *   res.json(logs);
 * }));
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
