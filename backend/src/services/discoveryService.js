'use strict';

/**
 * discoveryService.js
 *
 * Claude-powered Auto-Discover:
 *   1. Load the company's search/brand page with Playwright
 *   2. Extract ALL anchor links from the page (no hardcoded selectors)
 *   3. Send links + internal catalog to Claude in one call
 *   4. Claude intelligently identifies product links and matches them to the catalog
 *   5. Fall back to fuzzy matching if no API key
 */

const { query }          = require('../db');
const ScraperEngine      = require('../scraper/engine');
const { getSearchConfig }= require('../scraper/searchConfigs');
const { fuzzyMatch }     = require('./matchingService');
const logger             = require('../utils/logger');

// ── Claude extraction + matching ──────────────────────────────────────────────

/**
 * Send product-like page links + catalog to Claude.
 * Claude identifies which links are products and matches them to the catalog in one shot.
 *
 * @param {Array<{text: string, href: string}>} pageLinks - All links scraped from the page
 * @param {Array<{id: number, internal_name: string, internal_sku: string}>} catalog
 * @param {string} apiKey - Anthropic API key
 * @param {string} companyName - Used for context in the prompt
 * @param {RegExp|null} productUrlPattern - If set, only links matching this pattern are sent
 * @returns {Promise<Array<{found: object, match: object|null, method: string}>>}
 */
async function claudeExtractAndMatch(pageLinks, catalog, apiKey, companyName, productUrlPattern) {
  // Build compact catalog string
  const catalogText = catalog
    .map((p) => `${p.id}: ${p.internal_name}`)
    .join('\n');

  // Pre-filter: must have text, be an https URL, and match the product URL pattern if provided
  const usefulLinks = pageLinks
    .filter((l) => {
      if (!l.text || l.text.length < 4) return false;
      if (!l.href || !l.href.startsWith('http')) return false;
      if (productUrlPattern && !productUrlPattern.test(l.href)) return false;
      return true;
    })
    .slice(0, 400); // stay well within Claude's context

  if (usefulLinks.length === 0) return [];

  const linksText = usefulLinks
    .map((l, i) => `${i}: "${l.text}" → ${l.href}`)
    .join('\n');

  const patternHint = productUrlPattern
    ? `\nNOTE: All links below already match the product URL pattern (${productUrlPattern.source}). Every link is a candidate product page.\n`
    : '';

  const prompt =
    `You are matching product links scraped from ${companyName} to an internal product catalog.\n\n` +
    `Internal catalog (id: name):\n${catalogText}\n\n` +
    `Product links found on the page (index: "text" → URL):${patternHint}\n${linksText}\n\n` +
    `Your task:\n` +
    `1. Each link above is a product page URL — match it to the best catalog entry\n` +
    `2. Skip links that are clearly duplicates of the same product\n` +
    `3. Be smart about name differences:\n` +
    `   - "75ml" = "75 mL" = "75ML"\n` +
    `   - Missing commas, different word order\n` +
    `   - Abbreviated brand names ("Marvis WM" = "Marvis Whitening Mint")\n` +
    `   - SIZE MUST MATCH: 25ml ≠ 75ml even if same flavor\n\n` +
    `Return ONLY a JSON array, no explanation:\n` +
    `[{"i": 0, "catalog_id": 5, "confidence": 0.95}]\n\n` +
    `Rules:\n` +
    `- "i" is the link index from the list above\n` +
    `- "catalog_id" is the internal product id (or null if no good match)\n` +
    `- "confidence" is 0-1, only include entries > 0.6\n` +
    `- One product page can match at most one catalog entry`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${response.statusText}`);
  }

  const data      = await response.json();
  const rawText   = data?.content?.[0]?.text || '[]';
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const matches    = JSON.parse(jsonMatch[0]);
  const idToProduct = Object.fromEntries(catalog.map((p) => [p.id, p]));

  return matches
    .filter((m) => typeof m.i === 'number' && usefulLinks[m.i])
    .map((m) => {
      const link    = usefulLinks[m.i];
      const product = m.catalog_id ? idToProduct[m.catalog_id] : null;
      return {
        found:  { name: link.text, url: link.href.split('?')[0] },
        match:  product ? { product, confidence: m.confidence } : null,
        method: 'ai',
      };
    });
}

/**
 * Fuzzy-only fallback: run the config's extractProducts selector logic,
 * then fuzzy-match each result against the catalog.
 */
async function fuzzyExtractAndMatch(page, config, catalog) {
  const extracted = await config.extractProducts(page);
  return extracted.map((found) => ({
    found,
    match:  fuzzyMatch(found.name, catalog),
    method: 'fuzzy',
  }));
}

// ── loadPage ──────────────────────────────────────────────────────────────────

/**
 * Launch a Playwright context with full stealth, navigate to URL,
 * and return the page (caller must close context).
 */
async function loadPage(engine, url, config) {
  const context = await engine.browser.newContext({
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale:     'en-AE',
    timezoneId: 'Asia/Dubai',
    viewport:   { width: 1366, height: 768 },
    extraHTTPHeaders: {
      'Accept-Language':           'en-AE,en-US;q=0.9,en;q=0.8',
      'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding':           'gzip, deflate, br',
      'Cache-Control':             'no-cache',
      'Sec-Ch-Ua':                 '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile':          '?0',
      'Sec-Ch-Ua-Platform':        '"Windows"',
      'Sec-Fetch-Dest':            'document',
      'Sec-Fetch-Mode':            'navigate',
      'Sec-Fetch-Site':            'none',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver',           { get: () => false });
    Object.defineProperty(navigator, 'plugins',             { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages',           { get: () => ['en-AE', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    window.chrome = { runtime: {} };
  });

  if (config.blockResources?.length) {
    await context.route('**/*', (route) => {
      if (config.blockResources.includes(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  const page = await context.newPage();

  await page
    .goto(url, config.pageOptions || { waitUntil: 'domcontentloaded', timeout: 30000 })
    .catch((err) => logger.debug('[Discovery] goto timed out, extracting anyway', { error: err.message }));

  if (config.waitForSelector) {
    await page
      .waitForSelector(config.waitForSelector, { timeout: 20000 })
      .catch(() => logger.debug('[Discovery] waitForSelector timed out', { selector: config.waitForSelector }));
  }

  // Allow config to interact with the page after load (e.g. type in search box)
  if (typeof config.postLoad === 'function') {
    await config.postLoad(page, url, config._searchQuery).catch((err) =>
      logger.debug('[Discovery] postLoad failed', { error: err.message })
    );
  }

  return { page, context };
}

// ── discoverProducts ──────────────────────────────────────────────────────────

async function discoverProducts(companyId, searchQuery = 'marvis') {
  // ── 1. Load company ────────────────────────────────────────────────────────
  const { rows: compRows } = await query(
    `SELECT id, name, slug, base_url, is_active FROM companies WHERE id = $1`,
    [companyId]
  );
  if (!compRows.length) {
    const err = new Error(`Company ${companyId} not found`);
    err.status = 404;
    throw err;
  }
  const company = compRows[0];

  // ── 2. Load active catalog ─────────────────────────────────────────────────
  const { rows: catalog } = await query(
    `SELECT id, internal_name, internal_sku, brand
     FROM products WHERE is_active = true ORDER BY internal_name`
  );

  // ── 3. Resolve the URL to load ─────────────────────────────────────────────
  const config    = getSearchConfig(company.slug, company.base_url);
  config._searchQuery = searchQuery; // make query available to postLoad
  const searchUrl = typeof config.resolveUrl === 'function'
    ? config.resolveUrl(searchQuery)
    : config.searchUrl
        .replace('{query}',        encodeURIComponent(searchQuery))
        .replace('{website_url}',  company.base_url || '');

  logger.info('[Discovery] Loading page', { company: company.name, url: searchUrl });

  // ── 4. Launch browser, load page ──────────────────────────────────────────
  const engine = new ScraperEngine();
  let matchResults = [];

  try {
    await engine.launch();
    const { page, context } = await loadPage(engine, searchUrl, config);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // ── 5a. CLAUDE PATH: extract all links, let Claude do the work ─────────
      logger.info('[Discovery] Using Claude AI for extraction + matching');

      const pageLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map((a) => ({
          text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          href: a.href,
        }))
      ).catch((err) => {
        logger.debug('[Discovery] page.evaluate failed (likely redirect/bot block)', { error: err.message });
        return [];
      });

      logger.info('[Discovery] Total links on page', { count: pageLinks.length });

      // Pre-check: if no links will survive the productUrlPattern filter, skip Claude entirely
      const pattern = config.productUrlPattern || null;
      const preFiltered = pageLinks.filter((l) =>
        l.text && l.text.length >= 4 &&
        l.href && l.href.startsWith('http') &&
        (!pattern || pattern.test(l.href))
      );

      if (preFiltered.length === 0) {
        logger.info('[Discovery] No product links matched pattern — skipping Claude call', { company: company.name });
      } else {
        matchResults = await claudeExtractAndMatch(pageLinks, catalog, apiKey, company.name, pattern);
      }

    } else {
      // ── 5b. FUZZY PATH: use hardcoded selectors + token matching ──────────
      logger.info('[Discovery] No API key — using fuzzy matching');
      matchResults = await fuzzyExtractAndMatch(page, config, catalog);
    }

    await context.close();
  } finally {
    await engine.close();
  }

  // ── 6. Check already-tracked URLs ─────────────────────────────────────────
  let trackedSet = new Set();
  if (matchResults.length > 0) {
    const urls = matchResults.map((r) => r.found.url);
    const { rows } = await query(
      `SELECT product_url FROM product_company_urls
       WHERE company_id = $1 AND product_url = ANY($2::text[])`,
      [companyId, urls]
    );
    trackedSet = new Set(rows.map((r) => r.product_url));
  }

  const results = matchResults.map((r) => ({
    ...r,
    already_tracked: trackedSet.has(r.found.url),
  }));

  logger.info('[Discovery] Done', {
    company:  company.name,
    found:    results.length,
    matched:  results.filter((r) => r.match).length,
  });

  return {
    company,
    results,
    total_found: results.length,
    query:       searchQuery,
  };
}

// ── confirmMappings ───────────────────────────────────────────────────────────

async function confirmMappings(companyId, mappings) {
  let added = 0;
  for (const { product_id, url, image_url } of mappings) {
    await query(
      `INSERT INTO product_company_urls (product_id, company_id, product_url, image_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (product_id, company_id)
       DO UPDATE SET product_url = EXCLUDED.product_url,
                     image_url   = COALESCE(EXCLUDED.image_url, product_company_urls.image_url),
                     is_active   = true`,
      [product_id, companyId, url, image_url || null]
    );
    added++;
  }
  logger.info('[Discovery] Confirmed mappings', { companyId, added });
  return { added };
}

module.exports = { discoverProducts, confirmMappings };
