'use strict';

/**
 * Default scraper configs per company slug.
 *
 * Each config has:
 *   priceSelectors       - CSS selectors tried in order; first non-empty text wins
 *   titleSelectors       - same, for product title
 *   availabilitySelectors - same, for stock status
 *   waitForSelector      - wait for this element to appear before extracting
 *   pageOptions          - Playwright page.goto() options
 *   currency             - default currency for this store
 *   blockResources       - resource types to block (images, fonts) to speed up load
 *
 * These are the fallback configs. The DB company_configs table can override them
 * at runtime — see scrapingService.resolveSelectors().
 */

const configs = {
  'amazon-ae': {
    priceSelectors: [
      '.a-price .a-offscreen',           // primary structured price
      '.a-price-whole',                  // integer part only (less accurate)
      '#priceblock_ourprice',            // legacy
      '#priceblock_dealprice',           // deal price
      'span[data-a-color="price"] .a-offscreen',
      '.apexPriceToPay .a-offscreen',
    ],
    titleSelectors: [
      '#productTitle',
      'h1.product-title-word-break',
      'h1#title span',
    ],
    availabilitySelectors: [
      '#availability span',
      '#availability .a-color-success',
      '#availability .a-color-price',
      '#outOfStock',
    ],
    waitForSelector: '#productTitle',
    pageOptions: { waitUntil: 'domcontentloaded' },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  'noon': {
    priceSelectors: [
      '[data-qa="price-amount"]',
      '[class*="priceNow"]',
      '[class*="sellingPrice"]',
      '[class*="price_"] span',
      '[data-testid="price"]',
      '.sc-bwzfXH .price',
    ],
    titleSelectors: [
      'h1[data-qa="pdp-name"]',
      '[data-qa="pdp-product-name"]',
      'h1[class*="name"]',
      '.product-title h1',
    ],
    availabilitySelectors: [
      '[data-qa="add-to-cart"]',
      '[class*="availability"]',
      '[class*="stock-status"]',
      '[class*="outOfStock"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'networkidle' },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  'carrefour-uae': {
    priceSelectors: [
      // Carrefour UAE — Next.js app, price split across child divs (AED + integer + decimal)
      // PDP price uses "items-baseline force-ltr"; carousel prices use "items-center force-ltr"
      // Using items-baseline to avoid picking up related-product carousel prices
      'div.items-baseline.force-ltr',
    ],
    titleSelectors: [
      // h1 wraps a <span> with the product name
      'h1 span',
      'h1',
    ],
    availabilitySelectors: [
      // Shown when OOS: "Out of stock" / "Only N left!" in red
      '.text-red-500',
      '.text-c4red-500',
    ],
    waitForSelector: 'h1',
    // 'load' waits for window.onload — enough for Next.js SSR pages
    pageOptions: { waitUntil: 'load', timeout: 60000 },
    currency: 'AED',
    // Do NOT block resources — Carrefour detects missing assets as bot behaviour
    blockResources: ['font'],
  },

  'spinneys': {
    priceSelectors: [
      // Magento stores the raw price in data-price-amount attribute — exact float, no font/OCR issues.
      // data-price-type="finalPrice" targets the actual selling price, not min/max/per-unit variants.
      '[data-price-type="finalPrice"]',
      '[data-price-amount]',
      '.price-box .price',
      '.regular-price .price',
      '.product-info-price .price',
      '.product-info-price .wee-price',
    ],
    titleSelectors: [
      'h1.page-title span',
      'h1.product-name',
      '.product-info-main h1',
    ],
    availabilitySelectors: [
      '[title*="stock"]',
      '.stock.available span',
      '.stock.unavailable span',
      '[class*="availability"]',
    ],
    // Spinneys is a JS-rendered site — price loads after hydration, not at domcontentloaded.
    // Wait for the price element itself before extracting.
    waitForSelector: '.wee-price, .price-box .price, [data-price-amount]',
    pageOptions: { waitUntil: 'networkidle' },
    currency: 'AED',
    blockResources: ['font', 'media'],  // keep images so networkidle settles correctly
    // Spinneys uses a custom "Ð" currency symbol rendered via a special font.
    // Claude Vision (Haiku) misreads it as a digit, corrupting the first digit of the price.
    // Force selector-first so [data-price-amount] is read directly from the DOM attribute.
    preferSelectors: true,
  },

  'union-coop': {
    priceSelectors: [
      '.product-price',
      '.price-value',
      '.final-price',
      '.price-box .price',
      '[class*="price"] .amount',
    ],
    titleSelectors: [
      'h1.product-title',
      'h1.page-title',
      '.product-name h1',
    ],
    availabilitySelectors: [
      '[class*="availability"]',
      '[class*="stock"]',
      '.add-to-cart-btn',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'domcontentloaded' },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  'lulu': {
    priceSelectors: [
      '[data-price-type="finalPrice"] .price',
      '.price-box .price',
      '.regular-price .price',
      '.product-info-price .price',
    ],
    titleSelectors: [
      'h1.page-title span',
      'h1.product-name',
      '.product-info-main h1',
    ],
    availabilitySelectors: [
      '[title="Availability"]',
      '.stock.available span',
      '.stock.unavailable span',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'domcontentloaded' },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  'kibsons': {
    priceSelectors: [
      '.price ins .amount',
      '.price .woocommerce-Price-amount',
      '.summary .price .amount',
    ],
    titleSelectors: [
      'h1.product_title',
      'h1.entry-title',
    ],
    availabilitySelectors: [
      '.stock',
      '[class*="availability"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'domcontentloaded' },
    currency: 'AED',
    blockResources: ['image', 'font'],
  },

  // Grandiose UAE — Magento, product URLs: /slug{id} (no .html)
  'grandiose': {
    priceSelectors: [
      '.price-box .price',
      '[data-price-type="finalPrice"] .price',
      '.special-price .price',
      '.regular-price .price',
      '[itemprop="price"]',
    ],
    titleSelectors: [
      'h1.page-title span',
      'h1[itemprop="name"]',
      'h1',
    ],
    availabilitySelectors: [
      '.stock.available',
      '.stock.unavailable',
      '[class*="in-stock"]',
      '[class*="out-of-stock"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'networkidle', timeout: 40000 },
    currency: 'AED',
    blockResources: ['font', 'media'],
  },

  // Bin Sina — Magento
  'bin-sina': {
    priceSelectors: [
      '.price-box .price',
      '[data-price-type="finalPrice"] .price',
      '.special-price .price',
      '.regular-price .price',
      '[itemprop="price"]',
    ],
    titleSelectors: [
      'h1.page-title span',
      'h1.product-name',
      'h1[itemprop="name"]',
      'h1',
    ],
    availabilitySelectors: [
      '.stock.available',
      '.stock.unavailable',
      '[title="In stock"]',
      '[title="Out of stock"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'networkidle', timeout: 40000 },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  // Med7 Online — Shopify
  'med7': {
    priceSelectors: [
      '.price__current',
      '.product__price',
      '[data-product-price]',
      '.price-item--sale',
      '.price-item--regular',
    ],
    titleSelectors: [
      'h1.product__title',
      'h1.product-single__title',
      'h1',
    ],
    availabilitySelectors: [
      '[data-add-to-cart]',
      '.product-form__cart-submit',
      '[class*="sold-out"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'domcontentloaded', timeout: 30000 },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },

  'life-pharmacy': {
    priceSelectors: [
      '[class*="price"] span',
      '[class*="Price"] span',
      '[data-testid*="price"]',
      '[class*="selling-price"]',
      '[class*="current-price"]',
      'meta[property="product:price:amount"]',
    ],
    titleSelectors: [
      'h1[class*="product"]',
      'h1[class*="name"]',
      'h1[class*="title"]',
      'h1',
    ],
    availabilitySelectors: [
      '[class*="stock"]',
      '[class*="availability"]',
      '[data-testid*="stock"]',
      'button[class*="add-to-cart"]',
    ],
    waitForSelector: 'h1',
    pageOptions: { waitUntil: 'networkidle', timeout: 40000 },
    currency: 'AED',
    blockResources: ['font', 'media'],
  },

  // Generic fallback — used when no slug-specific config exists
  _default: {
    priceSelectors: [
      '[class*="price"]',
      '[id*="price"]',
      '[data-price]',
      '[itemprop="price"]',
      'meta[itemprop="price"]',
    ],
    titleSelectors: [
      'h1',
      '[itemprop="name"]',
      '[class*="product-name"]',
      '[class*="product-title"]',
    ],
    availabilitySelectors: [
      '[itemprop="availability"]',
      '[class*="stock"]',
      '[class*="availability"]',
    ],
    waitForSelector: null,
    pageOptions: { waitUntil: 'domcontentloaded' },
    currency: 'AED',
    blockResources: ['image', 'font', 'media'],
  },
};

/**
 * Get config for a company slug, falling back to _default.
 * @param {string} slug
 * @returns {object}
 */
function getConfig(slug) {
  return configs[slug] || configs._default;
}

module.exports = { configs, getConfig };
