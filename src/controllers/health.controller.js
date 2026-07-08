'use strict';

/**
 * @file src/controllers/health.controller.js
 *
 * Health endpoint controller.
 *
 * @module controllers/health
 */

const { checkHealth } = require('../services/health.service');

/**
 * GET /health
 *
 * Returns 200 when the database is reachable, 503 when degraded.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function healthCheck(req, res, next) {
  try {
    const health = await checkHealth();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
}

module.exports = { healthCheck };
