'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/scraperController');

// Scrape a single URL (sync — waits for result)
// Body: { url_id: number }
router.post('/run-one',     ctrl.runOne);

// Scrape all active URLs for one company (async — returns immediately)
// Body: { company_id: number }
router.post('/run-company', ctrl.runCompany);

// Scrape a selected set of URL IDs (async)
// Body: { url_ids: number[] }
router.post('/run-many',    ctrl.runMany);

// Scrape all active URLs across all companies (async)
router.post('/run-all',     ctrl.runAll);

module.exports = router;
