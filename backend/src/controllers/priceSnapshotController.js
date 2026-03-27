'use strict';

const snapshotService = require('../services/snapshotService');

async function list(req, res, next) {
  try {
    const result = await snapshotService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getLatest(req, res, next) {
  try {
    const rows = await snapshotService.getLatestPrices(req.query);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function getHistory(req, res, next) {
  try {
    const { product_id, company_id, days } = req.query;
    if (!product_id || !company_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'product_id and company_id are required', code: 'VALIDATION_ERROR' },
      });
    }
    const rows = await snapshotService.getPriceHistory(
      parseInt(product_id),
      parseInt(company_id),
      parseInt(days) || 30
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await snapshotService.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Snapshot not found', code: 'NOT_FOUND' } });
    }
    res.json({ success: true, message: 'Snapshot deleted' });
  } catch (err) { next(err); }
}

async function bulkRemove(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'ids array required', code: 'VALIDATION_ERROR' } });
    }
    const count = await snapshotService.removeMany(ids);
    res.json({ success: true, deleted: count });
  } catch (err) { next(err); }
}

module.exports = { list, getLatest, getHistory, remove, bulkRemove };
