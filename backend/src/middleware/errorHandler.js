'use strict';

const logger = require('../utils/logger');

/**
 * Centralized error handler — must be registered LAST in Express.
 * Formats all thrown errors into a consistent JSON response.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;

  logger.error(err.message, {
    status,
    method: req.method,
    url:    req.originalUrl,
    stack:  process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code:    err.code || 'INTERNAL_ERROR',
      // Only expose stack trace in development
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler — register BEFORE errorHandler but AFTER all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}

/**
 * Helper to create a typed API error.
 */
function createError(message, status = 400, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, notFoundHandler, createError };
