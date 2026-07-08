'use strict';

/**
 * @file src/app.js
 *
 * Express application factory.
 *
 * Creates and configures the Express application WITHOUT binding to a port.
 * Middleware registration order:
 *   1. x-powered-by disabled
 *   2. helmet  — security headers
 *   3. cors    — cross-origin policy (origin from CORS_ORIGIN env)
 *   4. express.json — body parsing (10 MB limit)
 *   5. pino-http — structured HTTP request logging
 *   6. rateLimit — fixed-window rate limiter
 *   7. routes — /health, /api/*
 *   8. 404 handler
 *   9. global error handler
 *
 * @module app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

const { config } = require('./config/env');
const { logger } = require('./lib/logger');
const { healthRouter } = require('./routes/health.routes');
const { logRouter } = require('./routes/log.routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/error.middleware');
const { ROUTES } = require('./constants/routes');

/**
 * Creates and returns the configured Express application.
 *
 * @returns {import('express').Application}
 */
function createApp() {
  const app = express();

  // ── 1. Disable x-powered-by fingerprinting ───────────────────────────────
  app.disable('x-powered-by');

  // ── 2. Security headers ──────────────────────────────────────────────────
  app.use(helmet());

  // ── 3. CORS ──────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
    })
  );

  // ── 4. JSON body parser (10 MB limit) ────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));

  // ── 5. HTTP request logger ───────────────────────────────────────────────
  // pino-http provides structured per-request logging on the shared Pino instance.
  // The x-api-key header is redacted before reaching the log stream.
  app.use(
    pinoHttp({
      logger,
      redact: {
        paths: ['req.headers.authorization', 'req.headers["x-api-key"]'],
        censor: '[Redacted]',
      },
    })
  );

  // ── 6. Rate limiting (global, fixed-window) ──────────────────────────────
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({ error: 'Too Many Requests' });
      },
    })
  );

  // ── 7. Routes ─────────────────────────────────────────────────────────────
  // Root — browser-friendly landing response
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Tamper-Evident Log Service Running',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        createLog: 'POST /api/log',
        getLog: 'GET /api/log/:id',
        listLogs: 'GET /api/logs',
        verify: 'GET /api/verify',
        export: 'GET /api/export',
      },
      note: 'All /api/* endpoints require x-api-key header',
    });
  });
  app.use(ROUTES.HEALTH, healthRouter);
  app.use(ROUTES.API, logRouter);

  // ── 8. 404 catch-all ─────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── 9. Global error handler ───────────────────────────────────────────────
  app.use(globalErrorHandler);

  return app;
}

module.exports = { createApp };
