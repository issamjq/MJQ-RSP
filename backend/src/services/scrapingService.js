'use strict';

const ScraperEngine      = require('../scraper/engine');
const { getConfig }      = require('../scraper/companyConfigs');
const snapshotService    = require('./snapshotService');
const pcuService         = require('./productCompanyUrlService');
const db                 = require('../db');
const logger             = require('../utils/logger');

/**
 * Resolve the final selector config to use for a given URL record.
 *
 * Priority order (highest first):
 *   1. Per-URL JSONB selectors (price_selectors, title_selectors, ...)
 *   2. Per-URL single-string overrides (selector_price, selector_title, ...)
 *   3. DB company_configs row
 *   4. Hardcoded companyConfigs.js defaults
 */
async function resolveSelectors(urlRecord) {
  const { company_slug } = urlRecord;

  // 1 & 2 — per-URL overrides
  const priceList  = urlRecord.price_selectors        // JSONB array
    || (urlRecord.selector_price ? [urlRecord.selector_price] : null);
  const titleList  = urlRecord.title_selectors
    || (urlRecord.selector_title ? [urlRecord.selector_title] : null);
  const availList  = urlRecord.availability_selectors
    || (urlRecord.selector_availability ? [urlRecord.selector_availability] : null);

  // 3 — DB company_configs (already joined in getActiveUrls queries if needed)
  let dbConfig = null;
  if (!priceList || !titleList || !availList) {
    const { rows } = await db.query(
      `SELECT cc.*
       FROM   company_configs cc
       JOIN   companies c ON c.id = cc.company_id
       WHERE  c.slug = $1`,
      [company_slug]
    );
    dbConfig = rows[0] || null;
  }

  // 4 — hardcoded fallback
  const fallback = getConfig(company_slug);

  return {
    price: priceList
      || (dbConfig?.price_selectors)
      || fallback.priceSelectors,

    title: titleList
      || (dbConfig?.title_selectors)
      || fallback.titleSelectors,

    availability: availList
      || (dbConfig?.availability_selectors)
      || fallback.availabilitySelectors,

    waitFor: dbConfig?.wait_for_selector || fallback.waitForSelector || null,

    pageOptions:    dbConfig?.page_options    || fallback.pageOptions    || {},
    blockResources: fallback.blockResources   || ['image', 'font', 'media'],
    currency:       urlRecord.currency        || fallback.currency       || 'AED',
  };
}

/**
 * Scrape a single product_company_url record and save a snapshot.
 *
 * @param {object}        urlRecord  - Row from product_company_urls (with company_slug)
 * @param {ScraperEngine} engine     - Shared browser instance
 * @returns {Promise<object>}        - The saved price_snapshot row
 */
async function scrapeAndSave(urlRecord, engine) {
  const selectors = await resolveSelectors(urlRecord);

  logger.info('[ScrapeService] Scraping', {
    id:  urlRecord.id,
    url: urlRecord.product_url,
  });

  const result = await engine.scrape(
    urlRecord.product_url,
    selectors,
    {
      timeout:        parseInt(process.env.SCRAPER_TIMEOUT_MS) || 30000,
      currency:       selectors.currency,
      pageOptions:    selectors.pageOptions,
      blockResources: selectors.blockResources,
    }
  );

  // Save snapshot
  const snapshot = await snapshotService.create({
    product_id:             urlRecord.product_id,
    company_id:             urlRecord.company_id,
    product_company_url_id: urlRecord.id,
    title_found:            result.title,
    price:                  result.price,
    currency:               result.currency,
    availability:           result.availability,
    raw_price_text:         result.rawPriceText,
    raw_availability_text:  result.rawAvailabilityText,
    scrape_status:          result.scrapeStatus,
    error_message:          result.errorMessage,
    checked_at:             new Date(),
  });

  // Update last_status and last_checked_at on the URL record
  await pcuService.update(urlRecord.id, {
    last_status:     result.scrapeStatus,
    last_checked_at: new Date(),
    // Backfill external_title if we found one and don't have one yet
    ...(result.title    && !urlRecord.external_title ? { external_title: result.title    } : {}),
    // Always update image_url if scraper found one (og:image is more reliable than discovery thumbnails)
    ...(result.imageUrl ? { image_url: result.imageUrl } : {}),
  });

  return { snapshot, scrapeResult: result };
}

module.exports = { resolveSelectors, scrapeAndSave };
