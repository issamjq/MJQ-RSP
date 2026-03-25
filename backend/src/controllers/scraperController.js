'use strict';

const syncService   = require('../services/syncService');
const { createError } = require('../middleware/errorHandler');
const logger        = require('../utils/logger');

/**
 * POST /api/scraper/run-one
 * Body: { url_id: number }
 *
 * Scrapes a single product_company_url and returns the sync run record.
 * Runs synchronously (waits for result before responding).
 */
async function runOne(req, res, next) {
  try {
    const urlId = parseInt(req.body.url_id);
    if (!urlId || isNaN(urlId)) {
      return next(createError('url_id is required and must be a number', 400, 'VALIDATION_ERROR'));
    }
    logger.info('[ScraperCtrl] runOne', { urlId });
    const run = await syncService.runOne(urlId);
    res.json({ success: true, data: run });
  } catch (err) { next(err); }
}

/**
 * POST /api/scraper/run-company
 * Body: { company_id: number }
 *
 * Scrapes all active URLs for a company.
 * Starts asynchronously and returns the sync run ID immediately.
 * Poll GET /api/sync-runs/:id to track progress.
 */
async function runCompany(req, res, next) {
  try {
    const companyId = parseInt(req.body.company_id);
    if (!companyId || isNaN(companyId)) {
      return next(createError('company_id is required', 400, 'VALIDATION_ERROR'));
    }
    logger.info('[ScraperCtrl] runCompany', { companyId });

    // Start async — don't await, return run ID immediately
    syncService.runCompany(companyId).catch((err) => {
      logger.error('[ScraperCtrl] runCompany background error', { companyId, error: err.message });
    });

    res.json({
      success: true,
      message: `Sync started for company ${companyId}. Poll /api/sync-runs for status.`,
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/scraper/run-all
 *
 * Scrapes all active URLs across all companies.
 * Starts asynchronously.
 */
async function runAll(req, res, next) {
  try {
    logger.info('[ScraperCtrl] runAll triggered');

    syncService.runAll().catch((err) => {
      logger.error('[ScraperCtrl] runAll background error', { error: err.message });
    });

    res.json({
      success: true,
      message: 'Full sync started. Poll /api/sync-runs for status.',
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/scraper/run-many
 * Body: { url_ids: number[] }
 *
 * Scrapes a specific selection of URLs. Starts asynchronously.
 */
async function runMany(req, res, next) {
  try {
    const urlIds = req.body.url_ids;
    if (!Array.isArray(urlIds) || urlIds.length === 0) {
      return next(createError('url_ids array is required', 400, 'VALIDATION_ERROR'));
    }
    logger.info('[ScraperCtrl] runMany', { count: urlIds.length });

    syncService.runMany(urlIds.map(Number)).catch((err) => {
      logger.error('[ScraperCtrl] runMany background error', { error: err.message });
    });

    res.json({ success: true, message: `Scraping ${urlIds.length} URL(s) started.` });
  } catch (err) { next(err); }
}

/**
 * POST /api/scraper/run-one-sync
 * Same as run-one but WAITS for the result (useful for single-item manual triggers).
 */
async function runOneSync(req, res, next) {
  return runOne(req, res, next);
}

module.exports = { runOne, runCompany, runMany, runAll, runOneSync };
