'use strict';

const db             = require('../db');
const pcuService     = require('./productCompanyUrlService');
const scrapingService = require('./scrapingService');
const ScraperEngine  = require('../scraper/engine');
const { pLimit }     = require('../utils/helpers');
const logger         = require('../utils/logger');

// ── Sync Run CRUD ─────────────────────────────────────────────────

async function createRun({ company_id = null, run_type, triggered_by = 'manual', meta = {} }) {
  const { rows } = await db.query(
    `INSERT INTO sync_runs (company_id, run_type, status, triggered_by, meta)
     VALUES ($1, $2, 'running', $3, $4)
     RETURNING *`,
    [company_id || null, run_type, triggered_by, JSON.stringify(meta)]
  );
  return rows[0];
}

async function updateRun(id, { status, finished_at, total_checked, success_count, fail_count, error_message }) {
  const { rows } = await db.query(
    `UPDATE sync_runs
     SET status        = COALESCE($2, status),
         finished_at   = COALESCE($3, finished_at),
         total_checked = COALESCE($4, total_checked),
         success_count = COALESCE($5, success_count),
         fail_count    = COALESCE($6, fail_count),
         error_message = COALESCE($7, error_message)
     WHERE id = $1
     RETURNING *`,
    [id, status, finished_at || null, total_checked, success_count, fail_count, error_message || null]
  );
  return rows[0];
}

async function getAll(query = {}) {
  const limit  = Math.min(100, parseInt(query.limit) || 20);
  const offset = Math.max(0, parseInt(query.offset) || 0);
  const filters = [];
  const params  = [];

  if (query.status) {
    params.push(query.status);
    filters.push(`status = $${params.length}`);
  }
  if (query.run_type) {
    params.push(query.run_type);
    filters.push(`run_type = $${params.length}`);
  }
  if (query.company_id) {
    params.push(parseInt(query.company_id));
    filters.push(`company_id = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT sr.*,
            c.name AS company_name
     FROM   sync_runs sr
     LEFT JOIN companies c ON c.id = sr.company_id
     ${where}
     ORDER BY sr.started_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function getById(id) {
  const { rows } = await db.query(
    `SELECT sr.*, c.name AS company_name
     FROM   sync_runs sr
     LEFT JOIN companies c ON c.id = sr.company_id
     WHERE  sr.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// ── Sync Execution ────────────────────────────────────────────────

/**
 * Run a scrape for a single product_company_url by its ID.
 */
async function runOne(urlId) {
  // Get the URL record with company slug
  const { rows } = await db.query(
    `SELECT pcu.*, c.slug AS company_slug
     FROM   product_company_urls pcu
     JOIN   companies c ON c.id = pcu.company_id
     WHERE  pcu.id = $1`,
    [urlId]
  );
  const urlRecord = rows[0];
  if (!urlRecord) throw new Error(`URL record not found: ${urlId}`);

  const run = await createRun({
    company_id:  urlRecord.company_id,
    run_type:    'single_url',
    triggered_by:'api',
    meta:        { url_id: urlId, url: urlRecord.product_url },
  });

  const engine = new ScraperEngine();
  let success = 0;
  let fail    = 0;

  try {
    await engine.launch();
    const { scrapeResult } = await scrapingService.scrapeAndSave(urlRecord, engine);
    if (scrapeResult.success && scrapeResult.price !== null) {
      success = 1;
    } else {
      fail = 1;
    }
  } catch (err) {
    fail = 1;
    logger.error('[SyncService] runOne error', { urlId, error: err.message });
    await updateRun(run.id, {
      status:        'failed',
      finished_at:   new Date(),
      total_checked: 1,
      success_count: 0,
      fail_count:    1,
      error_message: err.message,
    });
    await engine.close();
    throw err;
  }

  await engine.close();
  const finalRun = await updateRun(run.id, {
    status:        fail > 0 ? 'partial' : 'completed',
    finished_at:   new Date(),
    total_checked: 1,
    success_count: success,
    fail_count:    fail,
  });

  return finalRun;
}

/**
 * Run scrapes for all active URLs of a specific company.
 */
async function runCompany(companyId) {
  const urls = await pcuService.getActiveUrls(companyId);
  if (!urls.length) throw new Error(`No active URLs found for company ${companyId}`);

  const run = await createRun({
    company_id:   companyId,
    run_type:     'company_batch',
    triggered_by: 'api',
    meta:         { company_id: companyId, url_count: urls.length },
  });

  return _executeBatch(run, urls);
}

/**
 * Run scrapes for ALL active URLs across all companies.
 */
async function runAll() {
  const urls = await pcuService.getActiveUrls();
  if (!urls.length) throw new Error('No active URLs found');

  const run = await createRun({
    run_type:     'full_batch',
    triggered_by: 'api',
    meta:         { url_count: urls.length },
  });

  return _executeBatch(run, urls);
}

/**
 * Internal: execute a batch of URL scrapes with concurrency limit.
 */
async function _executeBatch(run, urls) {
  const concurrency = parseInt(process.env.SCRAPER_CONCURRENCY) || 3;
  const engine = new ScraperEngine();
  let success = 0;
  let fail    = 0;

  try {
    await engine.launch();

    await pLimit(urls, concurrency, async (urlRecord) => {
      try {
        const { scrapeResult } = await scrapingService.scrapeAndSave(urlRecord, engine);
        if (scrapeResult.scrapeStatus === 'success') {
          success++;
        } else {
          fail++;
        }
      } catch (err) {
        fail++;
        logger.error('[SyncService] batch item error', { id: urlRecord.id, error: err.message });
      }
    });

  } catch (err) {
    logger.error('[SyncService] batch fatal error', { runId: run.id, error: err.message });
    await updateRun(run.id, {
      status:        'failed',
      finished_at:   new Date(),
      total_checked: success + fail,
      success_count: success,
      fail_count:    fail,
      error_message: err.message,
    });
    await engine.close();
    throw err;
  }

  await engine.close();

  const finalStatus = fail === 0 ? 'completed' : (success === 0 ? 'failed' : 'partial');
  const finalRun = await updateRun(run.id, {
    status:        finalStatus,
    finished_at:   new Date(),
    total_checked: success + fail,
    success_count: success,
    fail_count:    fail,
  });

  logger.info('[SyncService] Batch done', {
    runId: run.id,
    total: success + fail,
    success,
    fail,
    status: finalStatus,
  });

  return finalRun;
}

module.exports = { createRun, updateRun, getAll, getById, runOne, runCompany, runAll };
