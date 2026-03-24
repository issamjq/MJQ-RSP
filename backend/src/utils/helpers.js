'use strict';

/**
 * Run async tasks with a concurrency limit.
 * @param {Array} items
 * @param {number} concurrency
 * @param {Function} taskFn - async fn(item) => result
 * @returns {Promise<Array>} results in same order as items
 */
async function pLimit(items, concurrency, taskFn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await taskFn(items[current]);
      } catch (err) {
        results[current] = { error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Convert a string to a URL-safe slug.
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Safe integer parse with fallback.
 */
function toInt(val, fallback = 0) {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Build a simple pagination object from query params.
 */
function parsePagination(query) {
  const page  = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(200, Math.max(1, toInt(query.limit, 50)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { pLimit, slugify, toInt, parsePagination };
