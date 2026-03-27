'use strict';

const db = require('../db');
const { parsePagination } = require('../utils/helpers');

async function getAll(query = {}) {
  const { limit, offset } = parsePagination(query);
  const filters = [];
  const params  = [];

  if (query.is_active !== undefined) {
    params.push(query.is_active === 'true' || query.is_active === true);
    filters.push(`p.is_active = $${params.length}`);
  }
  if (query.category) {
    params.push(query.category);
    filters.push(`p.category = $${params.length}`);
  }
  if (query.brand) {
    params.push(query.brand);
    filters.push(`p.brand = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    filters.push(`(p.internal_name ILIKE $${params.length} OR p.internal_sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.brand ILIKE $${params.length})`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  // Count total
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM products p ${where}`,
    params
  );

  // Paginated results
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT p.*,
            COUNT(pcu.id) FILTER (WHERE pcu.is_active = true) AS url_count
     FROM   products p
     LEFT JOIN product_company_urls pcu ON pcu.product_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.internal_name ASC
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
    `SELECT p.*,
            json_agg(
              json_build_object(
                'id',          pcu.id,
                'company_id',  pcu.company_id,
                'company_name',c.name,
                'company_slug',c.slug,
                'product_url', pcu.product_url,
                'last_status', pcu.last_status,
                'last_checked_at', pcu.last_checked_at,
                'is_active',   pcu.is_active
              )
            ) FILTER (WHERE pcu.id IS NOT NULL) AS urls
     FROM   products p
     LEFT JOIN product_company_urls pcu ON pcu.product_id = p.id
     LEFT JOIN companies c ON c.id = pcu.company_id
     WHERE  p.id = $1
     GROUP BY p.id`,
    [id]
  );
  return rows[0] || null;
}

async function create({ internal_name, internal_sku, barcode, brand, category, image_url, initial_rsp, notes, is_active = true }) {
  const { rows } = await db.query(
    `INSERT INTO products (internal_name, internal_sku, barcode, brand, category, image_url, initial_rsp, notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [internal_name, internal_sku || null, barcode || null, brand || null,
     category || null, image_url || null, initial_rsp != null ? Number(initial_rsp) : null, notes || null, is_active]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowed = ['internal_name', 'internal_sku', 'barcode', 'brand', 'category', 'image_url', 'initial_rsp', 'notes', 'is_active'];
  const keys    = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return getById(id);

  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => fields[k]);

  const { rows } = await db.query(
    `UPDATE products SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

async function bulkImport(items) {
  let inserted = 0, updated = 0;
  for (const item of items) {
    if (!item.internal_name || !item.internal_sku) continue;
    const { rows } = await db.query(
      `INSERT INTO products (internal_name, internal_sku, barcode, brand, image_url, initial_rsp, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (internal_sku) DO UPDATE SET
         internal_name = EXCLUDED.internal_name,
         barcode       = EXCLUDED.barcode,
         brand         = EXCLUDED.brand,
         image_url     = EXCLUDED.image_url,
         initial_rsp   = EXCLUDED.initial_rsp,
         is_active     = EXCLUDED.is_active,
         updated_at    = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [item.internal_name, String(item.internal_sku),
       item.barcode || null, item.brand || null,
       item.image_url || null, item.initial_rsp != null ? Number(item.initial_rsp) : null, item.is_active ?? true]
    );
    if (rows[0]?.inserted) inserted++; else updated++;
  }
  return { inserted, updated, total: inserted + updated };
}

module.exports = { getAll, getById, create, update, remove, bulkImport };
