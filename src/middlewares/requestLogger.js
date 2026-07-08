'use strict';

/**
 * @file src/middlewares/requestLogger.js
 *
 * Dedicated request-logging middleware (separate from pino-http).
 *
 * Logs HTTP method, URL, IP, status code, and response time on every request
 * completion. Sits on top of the pino-http instance already in app.js —
 * use this when you need custom structured fields beyond what pino-http emits.
 *
 * @module middlewares/requestLogger
 */

const { logger } = require('../lib/logger');

/**
 * Express middleware that logs request details when the response finishes.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestLogger(req, res, next) {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    logger.info({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }, 'HTTP request completed');
  });

  next();
}

module.exports = { requestLogger };
