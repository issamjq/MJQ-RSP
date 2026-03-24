'use strict';

/**
 * Known currency symbols and codes found on UAE e-commerce sites.
 */
const CURRENCY_MAP = {
  'aed': 'AED',
  'د.إ': 'AED',
  'dhs': 'AED',
  'dh':  'AED',
  'aed.': 'AED',
  'usd': 'USD',
  '$':   'USD',
  'sar': 'SAR',
  '﷼':  'SAR',
};

/**
 * Parse a raw price string from a web page into a structured object.
 *
 * Examples handled:
 *   "AED 57.00"      → { price: 57.00, currency: 'AED' }
 *   "57.50 AED"      → { price: 57.50, currency: 'AED' }
 *   "د.إ 120"        → { price: 120.00, currency: 'AED' }
 *   "1,299.00"       → { price: 1299.00, currency: 'AED' (fallback) }
 *   "Price: AED 45"  → { price: 45.00, currency: 'AED' }
 *   ""               → { price: null, currency: fallbackCurrency }
 *
 * @param {string|null} rawText
 * @param {string} fallbackCurrency - used when no currency found in text
 * @returns {{ price: number|null, currency: string }}
 */
function parsePrice(rawText, fallbackCurrency = 'AED') {
  if (!rawText || typeof rawText !== 'string') {
    return { price: null, currency: fallbackCurrency };
  }

  const text = rawText.trim();

  // Detect currency from text
  let detectedCurrency = fallbackCurrency;
  const lowerText = text.toLowerCase();

  for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
    if (lowerText.includes(symbol)) {
      detectedCurrency = code;
      break;
    }
  }

  // Remove currency symbols, labels, whitespace
  let cleaned = text
    .replace(/aed\.?/gi,   '')
    .replace(/د\.إ/g,       '')
    .replace(/dhs?\.?/gi,   '')
    .replace(/usd/gi,       '')
    .replace(/sar/gi,       '')
    .replace(/\$/g,         '')
    .replace(/﷼/g,         '')
    .replace(/price[:\s]*/gi, '')
    .replace(/[^\d.,]/g,    '') // keep only digits, dots, commas
    .trim();

  // Remove thousands commas: "1,299.00" → "1299.00"
  // But careful: "1.299,00" (European) → "1299.00"
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    // Thousands comma format: 1,299.00
    cleaned = cleaned.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    // European format: 1.299,00
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Simple comma removal for partial cases
    cleaned = cleaned.replace(/,/g, '');
  }

  // Extract the first valid number
  const match = cleaned.match(/\d+(\.\d+)?/);
  if (!match) {
    return { price: null, currency: detectedCurrency };
  }

  const price = parseFloat(match[0]);
  if (isNaN(price) || price <= 0) {
    return { price: null, currency: detectedCurrency };
  }

  return { price: Math.round(price * 100) / 100, currency: detectedCurrency };
}

/**
 * Normalize availability text to a standard status.
 *
 * @param {string|null} rawText
 * @returns {'in_stock'|'out_of_stock'|'unknown'|string}
 */
function parseAvailability(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'unknown';

  const lower = rawText.toLowerCase().trim();

  const inStockPhrases = [
    'in stock', 'available', 'add to cart', 'add to basket',
    'buy now', 'متاح', 'متوفر', 'ships from',
  ];
  const outOfStockPhrases = [
    'out of stock', 'unavailable', 'sold out', 'not available',
    'currently unavailable', 'غير متاح', 'نفذ', 'out-of-stock',
  ];

  for (const phrase of inStockPhrases) {
    if (lower.includes(phrase)) return 'in_stock';
  }
  for (const phrase of outOfStockPhrases) {
    if (lower.includes(phrase)) return 'out_of_stock';
  }

  // Return cleaned original text capped at 100 chars if unrecognized
  return rawText.trim().slice(0, 100);
}

module.exports = { parsePrice, parseAvailability };
