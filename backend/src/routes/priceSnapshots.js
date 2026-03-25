'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/priceSnapshotController');

// GET /api/price-snapshots           — all snapshots (paginated, filtered)
router.get('/',         ctrl.list);

// GET /api/price-snapshots/latest    — one latest snapshot per (product, company)
router.get('/latest',   ctrl.getLatest);

// GET /api/price-snapshots/history?product_id=&company_id=&days=30
router.get('/history',  ctrl.getHistory);

// DELETE /api/price-snapshots/:id
router.delete('/:id',   ctrl.remove);

module.exports = router;
