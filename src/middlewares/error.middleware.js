'use strict';

/**
 * @file src/middlewares/error.middleware.js
 *
 * Global error-handling middleware for Express.
 * - notFoundHandler  → 404 for unregistered routes
 * - globalErrorHandler → maps AppError to its statusCode; all others → 500
 *
 * Stack traces are NEVER sent in response bodies.
 *
 * @module middlewares/error
 */

const { isAppError } = require('../errors/AppError');
const { logger } = require('../lib/logger');

/**
 * 404 handler — fires when no route matches the request.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

/**
 * Global error handler — catches anything thrown or passed to next(err).
 *
 * Operational AppErrors use their own statusCode and message.
 * All other errors produce 500 Internal Server Error.
 *
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function globalErrorHandler(err, req, res, _next) {
  logger.error(
    { err, method: req.method, url: req.originalUrl },
    'Unhandled error'
  );

  if (isAppError(err) && err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = { notFoundHandler, globalErrorHandler };
