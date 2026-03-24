'use strict';

const syncService = require('../services/syncService');
const { createError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const rows = await syncService.getAll(req.query);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const run = await syncService.getById(req.params.id);
    if (!run) return next(createError('Sync run not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: run });
  } catch (err) { next(err); }
}

module.exports = { list, get };
