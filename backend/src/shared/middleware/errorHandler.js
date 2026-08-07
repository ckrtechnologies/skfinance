'use strict';
const { sendError } = require('../utils/response');

/**
 * Global error handler — must be registered as the LAST app.use().
 * Catches any error thrown or passed to next(err) from a route.
 */
function errorHandler(err, req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.errors },
    });
  }

  // Known application errors thrown with a status code
  if (err.statusCode) {
    return sendError(res, err.statusCode, err.code || 'APP_ERROR', err.message);
  }

  // Supabase / DB errors that bubble up with a message
  if (err.message) {
    // Parse our Postgres RAISE EXCEPTION codes
    const pgMatch = err.message.match(/^([A-Z_]+): (.+)$/);
    if (pgMatch) {
      const code = pgMatch[1];
      const msg  = pgMatch[2];
      const statusMap = {
        NOT_FOUND:             404,
        APPLICATION_TERMINAL:  409,
        WRONG_STAGE:           409,
        LIMIT_BLOCKED_90D:     409,
        VALIDATION_ERROR:      400,
        FORBIDDEN:             403,
      };
      return sendError(res, statusMap[code] || 400, code, msg);
    }
  }

  console.error('[errorHandler] Unhandled error:', err);
  const detailMsg = err.message || 'An unexpected error occurred';
  return sendError(res, 500, 'INTERNAL_ERROR', detailMsg);
}

module.exports = { errorHandler };
