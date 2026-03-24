'use strict';

const pcuService    = require('../services/productCompanyUrlService');
const { createError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const result = await pcuService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const record = await pcuService.getById(req.params.id);
    if (!record) return next(createError('URL record not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const record = await pcuService.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === '23505') return next(createError('URL already mapped for this product+company', 409, 'DUPLICATE'));
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const record = await pcuService.update(req.params.id, req.body);
    if (!record) return next(createError('URL record not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await pcuService.remove(req.params.id);
    if (!deleted) return next(createError('URL record not found', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'URL record deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove };
