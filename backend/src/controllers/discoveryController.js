'use strict';

const { discoverProducts, confirmMappings, probeWebsite } = require('../services/discoveryService');
const { createError }                       = require('../middleware/errorHandler');
const logger                                = require('../utils/logger');

/**
 * POST /api/discovery/search
 * Body: { company_id: number, query?: string }
 *
 * Searches a retailer's website for products and returns AI/fuzzy match suggestions.
 */
async function search(req, res, next) {
  try {
    const companyId = parseInt(req.body.company_id);
    if (!companyId || isNaN(companyId)) {
      return next(createError('company_id is required and must be an integer', 400, 'VALIDATION_ERROR'));
    }

    const searchQuery = (req.body.query || 'marvis').toString().trim();

    logger.info('[DiscoveryCtrl] search', { companyId, searchQuery });

    const result = await discoverProducts(companyId, searchQuery);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/discovery/confirm
 * Body: { company_id: number, mappings: Array<{ product_id: number, url: string }> }
 *
 * Persists the confirmed product→URL mappings to the database.
 */
async function confirm(req, res, next) {
  try {
    const companyId = parseInt(req.body.company_id);
    if (!companyId || isNaN(companyId)) {
      return next(createError('company_id is required and must be an integer', 400, 'VALIDATION_ERROR'));
    }

    const mappings = req.body.mappings;
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return next(createError('mappings must be a non-empty array', 400, 'VALIDATION_ERROR'));
    }

    for (const m of mappings) {
      if (!m.product_id || !m.url) {
        return next(createError('Each mapping must have product_id and url', 400, 'VALIDATION_ERROR'));
      }
    }

    logger.info('[DiscoveryCtrl] confirm', { companyId, count: mappings.length });

    const result = await confirmMappings(companyId, mappings);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/discovery/probe
 * Body: { url: string, query?: string }
 *
 * Auto-detects the search URL pattern for a website.
 * Returns the working search URL template and sample products found.
 */
async function probe(req, res, next) {
  try {
    const url = (req.body.url || '').trim();
    if (!url || !url.startsWith('http')) {
      return next(createError('url is required and must start with http', 400, 'VALIDATION_ERROR'));
    }
    const testQuery = (req.body.query || 'shampoo').toString().trim();
    logger.info('[DiscoveryCtrl] probe', { url, testQuery });
    const result = await probeWebsite(url, testQuery);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, confirm, probe };
