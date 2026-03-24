'use strict';

/**
 * AI-powered scraper using Claude Vision.
 * Takes a screenshot of the product page and sends it to Claude
 * to extract price, title, availability — no CSS selectors needed.
 */

const logger = require('../utils/logger');

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

/**
 * Extract product data from a page using Claude Vision.
 * @param {import('playwright').Page} page - Playwright page (already navigated)
 * @param {string} currency - Expected currency fallback
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<{price, currency, title, availability, rawPriceText, rawTitleText, rawAvailabilityText}>}
 */
async function extractWithVision(page, currency = 'AED', apiKey) {
  if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');

  // Scroll to top to make sure product info is visible
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  // Take viewport screenshot (fast, focused on main product area)
  const screenshotBuffer = await page.screenshot({
    type:     'jpeg',
    quality:  75,
    fullPage: false,
    clip:     { x: 0, y: 0, width: 1366, height: 768 },
  });
  const base64Image = screenshotBuffer.toString('base64');

  // Also get the page URL for context
  const pageUrl = page.url();

  const prompt = `You are analyzing a product page screenshot from an e-commerce website (${pageUrl}).

Extract the following fields from what you see on screen and return ONLY a JSON object:

{
  "price": <number or null — the selling/discounted price as a number, e.g. 49.25>,
  "currency": "<3-letter currency code, e.g. AED, USD — default to ${currency} if unclear>",
  "title": "<full product name as shown on page, or null>",
  "availability": "<one of: in_stock, out_of_stock, unknown>"
}

Rules:
- price: use the FINAL price (after discount if any), not the crossed-out original price
- title: the main product heading, include size/variant (e.g. "Marvis Classic Strong Mint 75ml")
- availability: "in_stock" if Add to Cart / Buy Now is active, "out_of_stock" if sold out, else "unknown"
- Return ONLY the JSON object, no explanation, no markdown`;

  const response = await fetch(CLAUDE_API, {
    method:  'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role:    'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`Claude Vision API ${response.status}: ${err}`);
  }

  const data    = await response.json();
  const rawText = data?.content?.[0]?.text || '{}';

  // Parse JSON from Claude response
  let parsed = {};
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.warn('[AI Scraper] Failed to parse Claude Vision response', { rawText });
  }

  logger.info('[AI Scraper] Vision extraction result', {
    url: pageUrl,
    price: parsed.price,
    title: parsed.title,
    availability: parsed.availability,
  });

  return {
    price:               parsed.price     ?? null,
    currency:            parsed.currency  || currency,
    title:               parsed.title     || null,
    availability:        mapAvailability(parsed.availability),
    rawPriceText:        parsed.price     ? String(parsed.price) : null,
    rawTitleText:        parsed.title     || null,
    rawAvailabilityText: parsed.availability || null,
  };
}

/**
 * Extract the main product image URL from page HTML.
 * Tries site-specific patterns then falls back to og:image.
 */
async function extractImageUrl(page) {
  return page.evaluate(() => {
    const get = (el) => el
      ? (el.getAttribute('data-old-hires') || el.getAttribute('data-src') ||
         el.getAttribute('data-lazy-src')  || el.getAttribute('src') || null)
      : null;

    // Amazon
    const amz = document.querySelector('#landingImage, #imgTagWrapperId img');
    if (amz && get(amz) && !get(amz).includes('transparent-pixel')) return get(amz);

    // Noon (f.nooncdn.com/p/ path = product images, not icons)
    const noon = Array.from(document.querySelectorAll('img')).find(img => {
      const s = get(img) || '';
      return s.includes('f.nooncdn.com/p/') && !s.includes('/icons/') && !s.endsWith('.svg');
    });
    if (noon) return get(noon);

    // Talabat (talabat.dhmedia.io)
    const tal = Array.from(document.querySelectorAll('img')).find(img => {
      const s = get(img) || '';
      return s.includes('dhmedia.io') || s.includes('talabat-cdn');
    });
    if (tal) return get(tal);

    // Carrefour (mafrservices CDN)
    const crf = document.querySelector('img[src*="mafrservices"], img[data-src*="mafrservices"]');
    if (crf && get(crf)) return get(crf);

    // Chemist Warehouse / Magento / WooCommerce
    const mag = document.querySelector('.fotorama__img, .MagicZoomPlus img, .woocommerce-product-gallery__image img');
    if (mag && get(mag)) return get(mag);

    // og:image (last resort — sometimes it's the brand logo, not the product)
    const og = document.querySelector('meta[property="og:image"]');
    if (og?.getAttribute('content')) return og.getAttribute('content');

    return null;
  }).catch(() => null);
}

function mapAvailability(raw) {
  if (!raw) return 'unknown';
  const r = raw.toLowerCase();
  if (r === 'in_stock' || r === 'in stock') return 'In Stock';
  if (r === 'out_of_stock' || r === 'out of stock') return 'Out of Stock';
  return 'unknown';
}

module.exports = { extractWithVision, extractImageUrl };
