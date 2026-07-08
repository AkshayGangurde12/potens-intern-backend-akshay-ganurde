'use strict';

/**
 * @file src/routes/log.routes.js
 * All /api/* routes — every route is protected by API key auth.
 * @module routes/log
 */
const { Router } = require('express');
const { requireApiKey } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validate.middleware');
const { CreateLogSchema } = require('../validators/log.validator');
const {
  createLog,
  getLogById,
  getLogs,
  verifyLog,
  exportLogs,
} = require('../controllers/log.controller');

const logRouter = Router();

// All routes on this router require a valid API key
logRouter.use(requireApiKey);

logRouter.post('/log', validateBody(CreateLogSchema), createLog);
logRouter.get('/log/:id', getLogById);
logRouter.get('/logs', getLogs);
logRouter.get('/verify', verifyLog);
logRouter.get('/export', exportLogs);

module.exports = { logRouter };
