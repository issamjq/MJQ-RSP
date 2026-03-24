'use strict';

const { createError } = require('./errorHandler');

/**
 * Validate that required fields are present and non-empty in req.body.
 * Usage: validate(['name', 'slug'])
 */
function requireBody(fields) {
  return (req, res, next) => {
    const missing = fields.filter(
      (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length) {
      return next(createError(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }
    next();
  };
}

/**
 * Validate that req.params.id is a positive integer.
 */
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    return next(createError('Invalid ID parameter', 400, 'INVALID_ID'));
  }
  req.params.id = id;
  next();
}

module.exports = { requireBody, validateId };
