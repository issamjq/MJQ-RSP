'use strict';

const { chromium } = require('playwright');
const { parsePrice, parseAvailability } = require('./priceParser');
const { extractWithVision, extractImageUrl } = require('./aiScraper');
const logger = require('../utils/logger');

/**
 * ScraperEngine
 *
 * Manages a single Playwright browser instance.
 * Call launch() before scraping and close() when done.
 * Designed to be used per-sync-run so the browser is reused
 * across multiple URLs in the same run, then discarded.
 *
 * Usage:
 *   const engine = new ScraperEngine();
 *   await engine.launch();
 *   const result = await engine.scrape(url, selectors, options);
 *   await engine.close();
 */
class ScraperEngine {
  constructor() {
    this.browser = null;
  }

  async launch() {
    if (this.browser) return; // already running
    logger.info('[Scraper] Launching browser...');
    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    logger.info('[Scraper] Browser ready');
  }

  async close() {
    if (this.browser) {
      logger.info('[Scraper] Closing browser');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape a single URL.
   *
   * @param {string} url - Product page URL
   * @param {object} selectors
   *   @param {string[]} selectors.price        - CSS selector list for price
   *   @param {string[]} selectors.title        - CSS selector list for title
   *   @param {string[]} selectors.availability - CSS selector list for stock
   *   @param {string|null} selectors.waitFor   - Wait for this selector before extracting
   * @param {object} options
   *   @param {number}   options.timeout        - ms timeout per page (default 30000)
   *   @param {string}   options.currency       - Fallback currency (default 'AED')
   *   @param {object}   options.pageOptions    - Playwright goto() options
   *   @param {string[]} options.blockResources - Resource types to block
   *
   * @returns {Promise<ScrapeResult>}
   */
  async scrape(url, selectors = {}, options = {}) {
    if (!this.browser) {
      throw new Error('Engine not launched. Call engine.launch() first.');
    }

    const timeout        = options.timeout || parseInt(process.env.SCRAPER_TIMEOUT_MS) || 30000;
    const currency       = options.currency || 'AED';
    const pageOptions    = { waitUntil: 'domcontentloaded', timeout, ...(options.pageOptions || {}) };
    const blockResources = options.blockResources || ['image', 'font', 'media'];

    const priceSelectors        = selectors.price        || [];
    const titleSelectors        = selectors.title        || [];
    const availabilitySelectors = selectors.availability || [];
    const waitForSelector       = selectors.waitFor      || null;

    let context;
    let page;

    try {
      const userAgent = this._randomUserAgent();
      context = await this.browser.newContext({
        userAgent,
        locale:     'en-AE',
        timezoneId: 'Asia/Dubai',
        viewport:   { width: 1366, height: 768 },
        // Stealth headers — makes the request look like a real Chrome browser
        extraHTTPHeaders: {
          'Accept-Language':           'en-AE,en-US;q=0.9,en;q=0.8',
          'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding':           'gzip, deflate, br',
          'Cache-Control':             'no-cache',
          'Pragma':                    'no-cache',
          'Sec-Ch-Ua':                 '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile':          '?0',
          'Sec-Ch-Ua-Platform':        '"Windows"',
          'Sec-Fetch-Dest':            'document',
          'Sec-Fetch-Mode':            'navigate',
          'Sec-Fetch-Site':            'none',
          'Sec-Fetch-User':            '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      // Stealth: override navigator properties to pass bot detection (Akamai, Cloudflare, etc.)
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver',           { get: () => false });
        Object.defineProperty(navigator, 'plugins',             { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages',           { get: () => ['en-AE', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory',        { get: () => 8 });
        Object.defineProperty(navigator, 'platform',            { get: () => 'Win32' });
        window.chrome = {
          runtime: {},
          loadTimes: function(){},
          csi: function(){},
          app: {},
        };
        // Prevent detection via Notification.permission
        if (window.Notification) {
          Object.defineProperty(Notification, 'permission', { get: () => 'default' });
        }
      });

      const aiApiKey = process.env.ANTHROPIC_API_KEY;

      // For AI vision: allow images to load (don't block them)
      // For selector mode: block images for speed
      const resourcesToBlock = aiApiKey
        ? blockResources.filter(r => r !== 'image')
        : blockResources;

      await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (resourcesToBlock.includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      page = await context.newPage();

      logger.debug('[Scraper] Navigating', { url, mode: aiApiKey ? 'AI Vision' : 'Selectors' });
      await page.goto(url, pageOptions).catch((err) => {
        logger.debug('[Scraper] goto timed out, extracting anyway', { url, error: err.message });
      });

      // Wait for key element
      if (waitForSelector) {
        await page
          .waitForSelector(waitForSelector, { timeout: 10000 })
          .catch(() => {
            logger.debug('[Scraper] waitForSelector timed out, continuing anyway', { waitForSelector });
          });
      }

      // ── Extract fields ────────────────────────────────────────────────────
      let rawTitleText, rawPriceText, rawAvailabilityText, price, originalPrice, detectedCurrency, availability;

      const preferSelectors = selectors.preferSelectors || false;

      if (aiApiKey && !preferSelectors) {
        // ── AI Vision path: Claude looks at screenshot, extracts everything ──
        logger.info('[Scraper] Using Claude Vision for extraction', { url });
        const aiResult = await extractWithVision(page, currency, aiApiKey).catch((err) => {
          logger.warn('[Scraper] Vision failed, falling back to selectors', { error: err.message });
          return null;
        });

        if (aiResult && aiResult.price !== null) {
          rawPriceText        = aiResult.rawPriceText;
          rawTitleText        = aiResult.rawTitleText;
          rawAvailabilityText = aiResult.rawAvailabilityText;
          price               = aiResult.price;
          originalPrice       = aiResult.originalPrice ?? null;
          detectedCurrency    = aiResult.currency;
          availability        = aiResult.availability;
        } else {
          // Fallback to selectors if AI failed
          rawTitleText        = await this._extractFirst(page, titleSelectors);
          rawPriceText        = await this._extractFirst(page, priceSelectors);
          rawAvailabilityText = await this._extractFirst(page, availabilitySelectors);
          const parsed        = parsePrice(rawPriceText, currency);
          price               = parsed.price;
          originalPrice       = null;
          detectedCurrency    = parsed.currency;
          availability        = parseAvailability(rawAvailabilityText);
        }
      } else {
        // ── Selector path (no API key, or preferSelectors flag set) ───────
        if (preferSelectors) logger.info('[Scraper] Using selectors (preferSelectors=true)', { url });
        rawTitleText        = await this._extractFirst(page, titleSelectors);
        rawPriceText        = await this._extractFirst(page, priceSelectors);
        rawAvailabilityText = await this._extractFirst(page, availabilitySelectors);
        const parsed        = parsePrice(rawPriceText, currency);
        price               = parsed.price;
        originalPrice       = null;
        detectedCurrency    = parsed.currency;
        availability        = parseAvailability(rawAvailabilityText);

        // If selectors got nothing and AI is available, try Vision as fallback
        if (price === null && aiApiKey) {
          logger.info('[Scraper] Selectors found no price, trying Claude Vision fallback', { url });
          const aiResult = await extractWithVision(page, currency, aiApiKey).catch(() => null);
          if (aiResult && aiResult.price !== null) {
            rawPriceText        = aiResult.rawPriceText;
            rawTitleText        = aiResult.rawTitleText        || rawTitleText;
            rawAvailabilityText = aiResult.rawAvailabilityText || rawAvailabilityText;
            price               = aiResult.price;
            originalPrice       = aiResult.originalPrice ?? null;
            detectedCurrency    = aiResult.currency;
            availability        = aiResult.availability        || availability;
          }
        }
      }

      // ── Extract image URL (always from page HTML, AI can't return URLs) ──
      const imageUrl = await extractImageUrl(page);

      await context.close();

      const result = {
        success:              true,
        title:                rawTitleText ? rawTitleText.trim().slice(0, 500) : null,
        price,
        originalPrice:        originalPrice || null,
        currency:             detectedCurrency,
        availability,
        imageUrl:             imageUrl || null,
        rawPriceText:         rawPriceText || null,
        rawAvailabilityText:  rawAvailabilityText || null,
        scrapeStatus:         price !== null ? 'success' : 'no_price',
        errorMessage:         price === null ? 'Price selector found no value' : null,
      };

      logger.info('[Scraper] Done', { url, price, currency: detectedCurrency, availability });
      return result;

    } catch (err) {
      logger.error('[Scraper] Failed', { url, error: err.message });
      if (context) {
        await context.close().catch(() => {});
      }
      return {
        success:             false,
        title:               null,
        price:               null,
        currency,
        availability:        'unknown',
        rawPriceText:        null,
        rawAvailabilityText: null,
        scrapeStatus:        err.name === 'TimeoutError' ? 'timeout' : 'error',
        errorMessage:        err.message,
      };
    }
  }

  /**
   * Try each CSS selector in order, return the first non-empty text found.
   * Handles both regular elements and <meta content="..."> tags.
   *
   * @param {import('playwright').Page} page
   * @param {string[]} selectors
   * @returns {Promise<string|null>}
   */
  async _extractFirst(page, selectors) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (!element) continue;

        // Check for meta[content] or input[value] attributes first
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
        let text;

        if (tagName === 'meta') {
          text = await element.getAttribute('content');
        } else if (tagName === 'input') {
          text = await element.getAttribute('value');
        } else {
          // For data-price-* attribute selectors (e.g. [data-price-amount],
          // [data-price-type="finalPrice"]), read data-price-amount directly —
          // it contains the raw decimal number without the custom Ð currency glyph.
          // For all other selectors (class, element, itemprop…) use textContent
          // so we don't accidentally pick up a wrong data-price-amount from an
          // unrelated element that happens to share the matched element.
          if (/\[data-price-/.test(selector)) {
            const attrVal = await element.getAttribute('data-price-amount');
            if (attrVal && attrVal.trim()) {
              text = attrVal.trim();
            }
          }
          // Fall back to visible text content
          if (!text || !text.trim()) {
            text = await element.textContent();
          }
        }

        if (text && text.trim()) {
          return text.trim();
        }
      } catch {
        // Selector threw (e.g. stale element) — try the next one
        continue;
      }
    }
    return null;
  }

  /**
   * Rotate between a few common user agents to reduce bot detection.
   */
  _randomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }
}

module.exports = ScraperEngine;
