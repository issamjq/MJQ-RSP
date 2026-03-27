'use strict';

const db = require('../db');
const { parsePagination } = require('../utils/helpers');

/**
 * Save a new price snapshot.
 */
async function create({
  product_id, company_id, product_company_url_id,
  title_found, price, original_price, currency, availability,
  raw_price_text, raw_availability_text,
  scrape_status, error_message,
  checked_at,
}) {
  const { rows } = await db.query(
    `INSERT INTO price_snapshots
       (product_id, company_id, product_company_url_id,
        title_found, price, original_price, currency, availability,
        raw_price_text, raw_availability_text,
        scrape_status, error_message, checked_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      product_id, company_id, product_company_url_id,
      title_found    || null,
      price          !== undefined ? price : null,
      original_price !== undefined ? original_price : null,
      currency       || 'AED',
      availability   || 'unknown',
      raw_price_text        || null,
      raw_availability_text || null,
      scrape_status  || 'success',
      error_message  || null,
      checked_at     || new Date(),
    ]
  );
  return rows[0];
}

/**
 * Get snapshots with filters. Returns paginated results.
 */
async function getAll(query = {}) {
  const { limit, offset } = parsePagination(query);
  const filters = [];
  const params  = [];

  if (query.product_id) {
    params.push(parseInt(query.product_id));
    filters.push(`ps.product_id = $${params.length}`);
  }
  if (query.company_id) {
    params.push(parseInt(query.company_id));
    filters.push(`ps.company_id = $${params.length}`);
  }
  if (query.product_company_url_id) {
    params.push(parseInt(query.product_company_url_id));
    filters.push(`ps.product_company_url_id = $${params.length}`);
  }
  if (query.scrape_status) {
    params.push(query.scrape_status);
    filters.push(`ps.scrape_status = $${params.length}`);
  }
  if (query.from) {
    params.push(query.from);
    filters.push(`ps.checked_at >= $${params.length}`);
  }
  if (query.to) {
    params.push(query.to);
    filters.push(`ps.checked_at <= $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM price_snapshots ps ${where}`,
    params
  );

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT ps.*,
            p.internal_name,
            c.name AS company_name,
            pcu.image_url,
            pcu.product_url
     FROM   price_snapshots ps
     JOIN   products p   ON p.id  = ps.product_id
     JOIN   companies c  ON c.id  = ps.company_id
     LEFT JOIN product_company_urls pcu ON pcu.id = ps.product_company_url_id
     ${where}
     ORDER  BY ps.checked_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data:  rows,
    total: parseInt(countRows[0].count, 10),
    limit,
    offset,
  };
}

/**
 * Get the latest snapshot for each (product, company) pair.
 * Useful for the "current prices" dashboard view.
 */
async function getLatestPrices(query = {}) {
  const filters = ['ps.scrape_status = \'success\''];
  const params  = [];

  if (query.product_id) {
    params.push(parseInt(query.product_id));
    filters.push(`ps.product_id = $${params.length}`);
  }
  if (query.company_id) {
    params.push(parseInt(query.company_id));
    filters.push(`ps.company_id = $${params.length}`);
  }

  const where = `WHERE ${filters.join(' AND ')}`;

  const { rows } = await db.query(
    `SELECT DISTINCT ON (ps.product_id, ps.company_id)
            ps.*,
            p.internal_name,
            p.internal_sku,
            p.brand,
            p.category,
            c.name AS company_name,
            c.slug AS company_slug,
            pcu.image_url,
            pcu.product_url
     FROM   price_snapshots ps
     JOIN   products p   ON p.id  = ps.product_id
     JOIN   companies c  ON c.id  = ps.company_id
     LEFT JOIN product_company_urls pcu ON pcu.id = ps.product_company_url_id
     ${where}
     ORDER  BY ps.product_id, ps.company_id, ps.checked_at DESC`,
    params
  );
  return rows;
}

/**
 * Get price history for a specific (product, company) pair.
 * Used for trend charts in the frontend.
 */
async function getPriceHistory(productId, companyId, days = 30) {
  const { rows } = await db.query(
    `SELECT price, currency, availability, checked_at, scrape_status
     FROM   price_snapshots
     WHERE  product_id  = $1
       AND  company_id  = $2
       AND  scrape_status = 'success'
       AND  checked_at >= NOW() - INTERVAL '${parseInt(days)} days'
     ORDER  BY checked_at ASC`,
    [productId, companyId]
  );
  return rows;
}

/**
 * Delete a snapshot by ID.
 */
async function remove(id) {
  const { rows } = await db.query(
    `DELETE FROM price_snapshots WHERE id = $1 RETURNING id`,
    [parseInt(id)]
  );
  return rows[0] || null;
}

/**
 * Delete multiple snapshots by IDs.
 */
async function removeMany(ids) {
  if (!ids || ids.length === 0) return 0;
  const cleaned = ids.map(Number).filter(Boolean);
  const { rowCount } = await db.query(
    `DELETE FROM price_snapshots WHERE id = ANY($1::int[])`,
    [cleaned]
  );
  return rowCount;
}

module.exports = { create, getAll, getLatestPrices, getPriceHistory, remove, removeMany };
