'use strict';

/**
 * @file src/controllers/log.controller.js
 *
 * HTTP handlers — thin layer mapping HTTP in/out to service calls.
 * No business logic lives here.
 *
 * @module controllers/log
 */

const { asyncHandler } = require('../utils/asyncHandler');
const { created, success, paginated, error } = require('../utils/response.helper');
const { AppError } = require('../errors/AppError');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { MESSAGES } = require('../constants/messages');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { ExportFilterSchema } = require('../validators/log.validator');
const logService = require('../services/log.service');
const verificationService = require('../services/verification.service');
const exportService = require('../services/export.service');

/**
 * POST /api/log
 * Body already validated upstream by validateBody(CreateLogSchema).
 */
const createLog = asyncHandler(async (req, res) => {
  const entry = await logService.createLogEntry(req.body);
  created(res, entry, MESSAGES.CREATED);
});

/**
 * GET /api/log/:id
 * Returns the entry plus its individual hash verification status.
 */
const getLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || id.trim() === '') {
    throw new AppError('Invalid id', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID');
  }
  const result = await logService.getLogById(id.trim());
  success(res, result);
});

/**
 * GET /api/logs?page=1&pageSize=20
 */
const getLogs = asyncHandler(async (req, res) => {
  const { page, pageSize } = parsePagination(req.query);
  const result = await logService.getAllLogEntries(page, pageSize);
  const meta = buildPaginationMeta(page, pageSize, result.meta.total);
  paginated(res, result.data, meta);
});

/**
 * GET /api/verify
 */
const verifyLog = asyncHandler(async (req, res) => {
  const result = await verificationService.verifyIntegrity();
  success(res, result);
});

/**
 * GET /api/export?actor=...&from=...&to=...
 */
const exportLogs = asyncHandler(async (req, res) => {
  const parsed = ExportFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return error(res, HTTP_STATUS.UNPROCESSABLE_ENTITY, MESSAGES.VALIDATION_ERROR, details);
  }
  const entries = await exportService.exportAsJson(parsed.data);
  success(res, entries);
});

module.exports = { createLog, getLogById, getLogs, verifyLog, exportLogs };
