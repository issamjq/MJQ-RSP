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

module.exports = { list, getLatest, getHistory };
