'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/discoveryController');

// Search a retailer for products and get AI/fuzzy match suggestions
// Body: { company_id: number, query?: string }
router.post('/search', ctrl.search);

// Confirm and persist selected product→URL mappings
// Body: { company_id: number, mappings: Array<{ product_id: number, url: string }> }
router.post('/confirm', ctrl.confirm);

module.exports = router;
