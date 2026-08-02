'use strict';
const secrets = require('../../config/secrets');

/**
 * Global error handler — catches anything passed to next(err).
 * Always returns the standard { success, error: { code, message } } shape.
 * Never leaks stack traces in production.
 */
function errorHandler(err, req, res, _next) {
  if (secrets.nodeEnv !== 'production') {
    console.error('[ERROR]', err);
  }

  const status = err.status ?? err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message =
    secrets.nodeEnv === 'production' && status === 500
      ? 'An unexpected error occurred'
      : err.message ?? 'An unexpected error occurred';

  res.status(status).json({ success: false, error: { code, message } });
}

module.exports = { errorHandler };
