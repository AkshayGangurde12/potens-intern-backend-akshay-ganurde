'use strict';

/**
 * @file src/routes/health.routes.js
 *
 * Mounts the health-check route.
 *
 * @module routes/health
 */

const { Router } = require('express');
const { healthCheck } = require('../controllers/health.controller');

const healthRouter = Router();

/**
 * GET /health
 *
 * Checks service and database status. No authentication required —
 * designed for load balancers and monitoring systems.
 */
healthRouter.get('/', healthCheck);

module.exports = { healthRouter };
