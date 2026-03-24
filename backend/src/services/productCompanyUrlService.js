'use strict';

const db = require('../db');
const { parsePagination } = require('../utils/helpers');

async function getAll(query = {}) {
  const { limit, offset } = parsePagination(query);
  const filters = [];
  const params  = [];

  if (query.product_id) {
    params.push(parseInt(query.product_id));
    filters.push(`pcu.product_id = $${params.length}`);
  }
  if (query.company_id) {
    params.push(parseInt(query.company_id));
    filters.push(`pcu.company_id = $${params.length}`);
  }
  if (query.is_active !== undefined) {
    params.push(query.is_active === 'true' || query.is_active === true);
    filters.push(`pcu.is_active = $${params.length}`);
  }
  if (query.last_status) {
    params.push(query.last_status);
    filters.push(`pcu.last_status = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM product_company_urls pcu ${where}`,
    params
  );

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT pcu.*,
            p.internal_name,
            p.internal_sku,
            c.name  AS company_name,
            c.slug  AS company_slug
     FROM   product_company_urls pcu
     JOIN   products p  ON p.id  = pcu.product_id
     JOIN   companies c ON c.id  = pcu.company_id
     ${where}
     ORDER  BY p.internal_name ASC, c.name ASC
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

async function getById(id) {
  const { rows } = await db.query(
    `SELECT pcu.*,
            p.internal_name,
            p.internal_sku,
            p.brand,
            p.category,
            c.name  AS company_name,
            c.slug  AS company_slug,
            c.base_url
     FROM   product_company_urls pcu
     JOIN   products p  ON p.id  = pcu.product_id
     JOIN   companies c ON c.id  = pcu.company_id
     WHERE  pcu.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Get all active URLs ready for scraping, optionally filtered by company.
 */
async function getActiveUrls(companyId = null) {
  const params  = [];
  const filters = ['pcu.is_active = true', 'c.is_active = true', 'p.is_active = true'];

  if (companyId) {
    params.push(companyId);
    filters.push(`pcu.company_id = $${params.length}`);
  }

  const { rows } = await db.query(
    `SELECT pcu.*,
            c.slug  AS company_slug,
            c.name  AS company_name,
            p.internal_name
     FROM   product_company_urls pcu
     JOIN   companies c ON c.id  = pcu.company_id
     JOIN   products p  ON p.id  = pcu.product_id
     WHERE  ${filters.join(' AND ')}
     ORDER  BY pcu.id ASC`,
    params
  );
  return rows;
}

async function create({
  product_id, company_id, product_url,
  external_title, external_sku, external_barcode,
  selector_price, selector_title, selector_availability,
  price_selectors, title_selectors, availability_selectors,
  currency = 'AED', is_active = true,
}) {
  const { rows } = await db.query(
    `INSERT INTO product_company_urls
       (product_id, company_id, product_url,
        external_title, external_sku, external_barcode,
        selector_price, selector_title, selector_availability,
        price_selectors, title_selectors, availability_selectors,
        currency, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      product_id, company_id, product_url,
      external_title || null, external_sku || null, external_barcode || null,
      selector_price || null, selector_title || null, selector_availability || null,
      price_selectors        ? JSON.stringify(price_selectors)        : null,
      title_selectors        ? JSON.stringify(title_selectors)        : null,
      availability_selectors ? JSON.stringify(availability_selectors) : null,
      currency, is_active,
    ]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowed = [
    'product_url', 'external_title', 'external_sku', 'external_barcode',
    'selector_price', 'selector_title', 'selector_availability',
    'price_selectors', 'title_selectors', 'availability_selectors',
    'currency', 'is_active', 'last_status', 'last_checked_at', 'image_url',
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return getById(id);

  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => {
    // Serialize JSONB fields
    if (['price_selectors', 'title_selectors', 'availability_selectors'].includes(k)) {
      return fields[k] ? JSON.stringify(fields[k]) : null;
    }
    return fields[k];
  });

  const { rows } = await db.query(
    `UPDATE product_company_urls SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM product_company_urls WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { getAll, getById, getActiveUrls, create, update, remove };
