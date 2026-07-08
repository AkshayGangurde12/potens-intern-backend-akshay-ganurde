'use strict';

/**
 * @file src/middlewares/validate.middleware.js
 *
 * Factory that creates an Express middleware validating req.body against a
 * Zod schema. Responds 422 with field-level details on failure.
 *
 * @module middlewares/validate
 */

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate req.body against.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/log', validateBody(CreateLogSchema), createLog);
 */
function validateBody(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        error: 'Validation Error',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Replace req.body with the parsed (and potentially coerced) value
    req.body = result.data;
    return next();
  };
}

module.exports = { validateBody };
