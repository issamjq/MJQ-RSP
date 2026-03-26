'use strict';

/**
 * discoveryService.js
 *
 * Claude-powered Auto-Discover:
 *   1. Load the company's search/brand page with Playwright
 *   2. Extract ALL anchor links from the page (no hardcoded selectors)
 *   3. Send links + internal catalog to Claude in one call
 *   4. Claude intelligently identifies product links and matches them to the catalog
 *   5. Immediately visit each matched product page and extract price/image (one shot)
 *   6. Fall back to fuzzy matching if no API key
 */

const { query }                             = require('../db');
const ScraperEngine                         = require('../scraper/engine');
const { getSearchConfig }                   = require('../scraper/searchConfigs');
const { fuzzyMatch }                        = require('./matchingService');
const { extractWithVision, extractImageUrl }= require('../scraper/aiScraper');
const logger                                = require('../utils/logger');

// ── Website Probe (auto-detect search URL) ────────────────────────────────────

const SEARCH_PATTERNS = [
  '/search?q={query}',
  '/search/?q={query}',
  '/catalogsearch/result/?q={query}',
  '/en/catalogsearch/result/?q={query}',
  '/en/search?q={query}',
  '/?s={query}&post_type=product',
  '/search?keyword={query}',
  '/search?text={query}',
  '/search-results?q={query}',
];

/**
 * Try loading a URL and return how many product-like links were found.
 */
async function trySearchPattern(engine, url) {
  const context = await engine.browser.newContext({
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale:     'en-AE',
    timezoneId: 'Asia/Dubai',
    viewport:   { width: 1366, height: 768 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
  await context.route('**/*', (route) => {
    if (['image', 'font', 'media'].includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        href: a.href,
      }))
    ).catch(() => []);

    // Filter to links that look like product pages
    const seen     = new Set();
    const products = [];
    for (const l of links) {
      if (!l.text || l.text.length < 4)   continue;
      if (!l.href || !l.href.startsWith('http')) continue;
      if (l.href.includes('#'))             continue;
      try {
        const u     = new URL(l.href);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length < 1) continue;
        // Skip obvious nav/category links
        const p = u.pathname.toLowerCase();
        if (p.match(/\/(login|signup|cart|checkout|account|wishlist|category|categories|blog|contact|about|policy|faq|deals|offer)\b/)) continue;
        const key = u.origin + u.pathname;
        if (seen.has(key)) continue;
        seen.add(key);
        products.push({ name: l.text.slice(0, 120), url: key });
      } catch { continue; }
    }

    // Guess product URL pattern from sample links
    let productUrlPattern = null;
    if (products.length > 0) {
      const patternCounts = {};
      const KNOWN = ['/products/', '/product/', '/p/', '/dp/', '/buy-', '/item/', '.html'];
      for (const prod of products) {
        for (const pat of KNOWN) {
          if (prod.url.includes(pat)) {
            patternCounts[pat] = (patternCounts[pat] || 0) + 1;
          }
        }
      }
      const best = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
      productUrlPattern = best ? best[0] : null;
    }

    return { found: products.length, sample: products.slice(0, 5), productUrlPattern };
  } finally {
    await context.close();
  }
}

/**
 * Probe a website to auto-detect its search URL pattern.
 * Tries common patterns and returns the first one that finds products.
 *
 * @param {string} baseUrl - e.g. "https://www.example.com"
 * @param {string} testQuery - search term to test with (e.g. "shampoo")
 */
async function probeWebsite(baseUrl, testQuery = 'shampoo') {
  const base   = baseUrl.replace(/\/$/, '');
  const engine = new ScraperEngine();

  try {
    await engine.launch();

    for (const pattern of SEARCH_PATTERNS) {
      const url = base + pattern.replace('{query}', encodeURIComponent(testQuery));
      logger.info('[Probe] Trying pattern', { pattern, url });

      try {
        const result = await trySearchPattern(engine, url);
        logger.info('[Probe] Pattern result', { pattern, found: result.found });

        if (result.found >= 3) {
          return {
            success:            true,
            search_url_template: base + pattern,
            pattern,
            products_found:     result.found,
            product_url_pattern: result.productUrlPattern,
            sample:             result.sample,
          };
        }
      } catch (err) {
        logger.debug('[Probe] Pattern failed', { pattern, error: err.message });
      }
    }

    return {
      success: false,
      message: 'Could not detect a working search URL. The site may require JavaScript interaction or use a non-standard search system.',
    };
  } finally {
    await engine.close();
  }
}

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
async function claudeExtractAndMatch(pageLinks, catalog, apiKey, companyName, productUrlPattern, screenshotBase64 = null) {
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
    `Your task: Match each product link to the correct catalog entry.\n\n` +
    `━━━ STRICT MATCHING RULES ━━━\n\n` +
    `SIZE/VOLUME — must be identical after unit conversion:\n` +
    `  • ml matches: 75ml = 75mL = 75 ml = 2.5oz = 2.5 fl oz\n` +
    `  • oz→ml reference: 0.85oz≈25ml | 2.5oz≈75ml | 2.8oz≈85ml | 3.4oz≈100ml | 4.2oz≈125ml | 4.5oz≈133ml\n` +
    `  • "4.5 oz" does NOT match "75ml" (133ml ≠ 75ml) — this is a disqualifying mismatch\n` +
    `  • "85ml" does NOT match "75ml" — this is a disqualifying mismatch\n` +
    `  • If size is absent in the link text, check the URL path (e.g. "75ml" or "75-ml" in slug)\n` +
    `  • If size cannot be confirmed from text OR URL → set confidence ≤ 0.55 (do not include)\n\n` +
    `FLAVOR/VARIANT — must be identical:\n` +
    `  • "Classic" ≠ "Whitening" ≠ "Amarelli Licorice" ≠ "Aquatic Mint" ≠ "Ginger"\n` +
    `  • Same brand + different flavour = NO match\n\n` +
    `PRODUCT TYPE — must match:\n` +
    `  • Toothpaste ≠ Mouthwash ≠ Toothbrush ≠ Whitening Kit\n\n` +
    `CONFIDENCE THRESHOLDS:\n` +
    `  • 0.93–1.0: brand + flavour + size all confirmed identical\n` +
    `  • 0.85–0.92: brand + flavour confirmed, size inferred from URL (not text)\n` +
    `  • < 0.85: any uncertainty about size or flavour → DO NOT INCLUDE\n\n` +
    `GOLDEN RULE: A missed match is far better than a wrong match. If you are not ≥85% sure, output null.\n\n` +
    `Return ONLY a JSON array (no explanation, no markdown):\n` +
    `[{"i": 0, "catalog_id": 5, "confidence": 0.95}]\n\n` +
    `- "i" = link index\n` +
    `- "catalog_id" = internal product id (null if no match)\n` +
    `- "confidence" = 0.0–1.0, only include entries where confidence ≥ 0.85\n` +
    `- One link maps to at most one catalog entry; one catalog entry maps to at most one link`;

  // Build message content — include screenshot if available for visual verification
  const messageContent = screenshotBase64
    ? [
        {
          type:   'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: screenshotBase64 },
        },
        {
          type: 'text',
          text: `The image above is a screenshot of the ${companyName} search results page.\n` +
                `Use it to visually verify product names, sizes, and variants before matching.\n\n` + prompt,
        },
      ]
    : prompt;

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
      messages:   [{ role: 'user', content: messageContent }],
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

// ── scrapeProductPrices ───────────────────────────────────────────────────────

/**
 * For each matched result, open the product page in the same browser and extract
 * price + image using Claude Vision. Runs with concurrency=3 to keep it fast.
 *
 * Mutates and returns matchResults with found.price / found.currency /
 * found.availability / found.imageUrl / found.original_price filled in.
 */
async function scrapeProductPrices(engine, matchResults, currency, apiKey) {
  const toScrape = matchResults.filter((r) => r.match && r.found && r.found.url);
  if (toScrape.length === 0) return matchResults;

  logger.info('[Discovery] Scraping product pages for prices', { count: toScrape.length });

  const CONCURRENCY = 3;
  const enriched    = new Map(matchResults.map((r, i) => [r.found.url, i]));
  const out         = matchResults.map((r) => ({ ...r, found: { ...r.found } }));

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    await Promise.all(
      toScrape.slice(i, i + CONCURRENCY).map(async (r) => {
        const context = await engine.browser.newContext({
          userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          locale:     'en-AE',
          timezoneId: 'Asia/Dubai',
          viewport:   { width: 1366, height: 768 },
        });
        const page = await context.newPage();
        try {
          await page
            .goto(r.found.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            .catch(() => {});
          await page.waitForTimeout(1500);

          const [priceData, imageUrl] = await Promise.all([
            apiKey ? extractWithVision(page, currency, apiKey).catch(() => null) : Promise.resolve(null),
            extractImageUrl(page).catch(() => null),
          ]);

          const idx = enriched.get(r.found.url);
          if (idx !== undefined) {
            out[idx].found.imageUrl       = imageUrl   || null;
            out[idx].found.price          = priceData?.price          ?? null;
            out[idx].found.original_price = priceData?.originalPrice  ?? null;
            out[idx].found.currency       = priceData?.currency       || currency;
            out[idx].found.availability   = priceData?.availability   || 'unknown';
          }
        } catch (err) {
          logger.warn('[Discovery] Product page scrape failed', { url: r.found.url, error: err.message });
        } finally {
          await context.close();
        }
      })
    );
  }

  return out;
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

  // Check if a custom search URL template was saved via probe
  const { rows: cfgRows } = await query(
    `SELECT page_options FROM company_configs WHERE company_id = $1`, [companyId]
  ).catch(() => ({ rows: [] }));
  const savedPageOptions     = cfgRows[0]?.page_options || {};
  const customSearchTemplate = savedPageOptions.search_url_template;

  const searchUrl = typeof config.resolveUrl === 'function'
    ? config.resolveUrl(searchQuery)
    : (customSearchTemplate || config.searchUrl)
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
        // Take a screenshot so Claude Vision can visually verify product names/sizes
        const screenshotBase64 = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false })
          .then(buf => buf.toString('base64'))
          .catch(() => null);

        if (screenshotBase64) {
          logger.info('[Discovery] Screenshot captured for Vision-assisted matching');
        }

        matchResults = await claudeExtractAndMatch(pageLinks, catalog, apiKey, company.name, pattern, screenshotBase64);
      }

    } else {
      // ── 5b. FUZZY PATH: use hardcoded selectors + token matching ──────────
      logger.info('[Discovery] No API key — using fuzzy matching');
      matchResults = await fuzzyExtractAndMatch(page, config, catalog);
    }

    await context.close();

    // ── 6. Scrape each matched product page for price + image ──────────────
    if (matchResults.some((r) => r.match)) {
      matchResults = await scrapeProductPrices(engine, matchResults, 'AED', apiKey);
    }

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
  for (const { product_id, url, image_url, price, original_price, currency, availability } of mappings) {
    // Upsert URL mapping, return the row id
    const { rows } = await query(
      `INSERT INTO product_company_urls (product_id, company_id, product_url, image_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (product_id, company_id)
       DO UPDATE SET product_url = EXCLUDED.product_url,
                     image_url   = COALESCE(EXCLUDED.image_url, product_company_urls.image_url),
                     is_active   = true
       RETURNING id`,
      [product_id, companyId, url, image_url || null]
    );

    const urlId = rows[0]?.id;

    // If we already have a price from discovery, save it as the initial snapshot
    if (urlId && price != null) {
      await query(
        `INSERT INTO price_snapshots
           (product_id, company_id, product_company_url_id,
            price, original_price, currency, availability,
            raw_price_text, scrape_status, checked_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'success',NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        [
          product_id, companyId, urlId,
          price,
          original_price || null,
          currency || 'AED',
          availability || 'unknown',
          String(price),
        ]
      ).catch((err) => logger.warn('[Discovery] Snapshot insert failed', { err: err.message }));
    }

    added++;
  }
  logger.info('[Discovery] Confirmed mappings', { companyId, added });
  return { added };
}

module.exports = { discoverProducts, confirmMappings, probeWebsite };
