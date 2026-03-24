'use strict';

/**
 * Reset script — clears all product/URL/snapshot/sync data,
 * then inserts the 22 Marvis products from the product catalog.
 *
 * Companies and company_configs are kept (still valid).
 *
 * Usage: node scripts/resetAndSeedMarvis.js
 */

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Marvis product catalog ─────────────────────────────────────────
const MARVIS_PRODUCTS = [
  // 75 ML Toothpastes
  { sku: 'MRV-001', barcode: '8004395112425', name: 'Sensitive Gums Gentle Mint 75 ML',  category: 'Toothpaste' },
  { sku: 'MRV-002', barcode: '8004395110155', name: 'Whitening Mint 75 ML',               category: 'Toothpaste' },
  { sku: 'MRV-003', barcode: '8003190127016', name: 'Classic Strong Mint 75 ML',          category: 'Toothpaste' },
  { sku: 'MRV-004', barcode: '8004395110124', name: 'Ginger Mint 75 ML',                  category: 'Toothpaste' },
  { sku: 'MRV-005', barcode: '8004395110148', name: 'Jasmine Mint 75 ML',                 category: 'Toothpaste' },
  { sku: 'MRV-006', barcode: '8004395110117', name: 'Aquatic Mint 75 ML',                 category: 'Toothpaste' },
  { sku: 'MRV-007', barcode: '8004395110506', name: 'Cinnamon Mint 75 ML',                category: 'Toothpaste' },
  { sku: 'MRV-008', barcode: '8004395110513', name: 'Amareli Licorice 75 ML',             category: 'Toothpaste' },
  // 25 ML Toothpastes
  { sku: 'MRV-009', barcode: '8004395111381', name: 'Smokers Whitening Mint 25 ML',       category: 'Toothpaste' },
  { sku: 'MRV-010', barcode: '8004395110322', name: 'Whitening Mint 25 ML',               category: 'Toothpaste' },
  { sku: 'MRV-011', barcode: '8004395110063', name: 'Classic Strong Mint 25 ML',          category: 'Toothpaste' },
  { sku: 'MRV-012', barcode: '8004395110292', name: 'Jasmine Mint 25 ML',                 category: 'Toothpaste' },
  { sku: 'MRV-013', barcode: '8004395110421', name: 'Amareli Licorice 25 ML',             category: 'Toothpaste' },
  { sku: 'MRV-014', barcode: '8004395110315', name: 'Aquatic Mint 25 ML',                 category: 'Toothpaste' },
  { sku: 'MRV-015', barcode: '8004395110414', name: 'Cinnamon Mint 25 ML',                category: 'Toothpaste' },
  // 85 ML
  { sku: 'MRV-016', barcode: '8004395111817', name: 'Smokers Whitening Mint 85 ML',       category: 'Toothpaste' },
  // Mouthwashes
  { sku: 'MRV-017', barcode: '8004395111572', name: 'Mouthwash Spearmint 120 ML',         category: 'Mouthwash'  },
  { sku: 'MRV-018', barcode: '8004395155781', name: 'Mouth Wash Strong Mint 120 ML',      category: 'Mouthwash'  },
  { sku: 'MRV-019', barcode: '411056',         name: 'Marvis Mint Mouthwash 30 ML',        category: 'Mouthwash'  },
  // Toothbrushes
  { sku: 'MRV-020', barcode: '8004395110742', name: 'Marvis Toothbrush Soft',             category: 'Toothbrush' },
  { sku: 'MRV-021', barcode: '8004395110087', name: 'Marvis Toothbrush Medium',           category: 'Toothbrush' },
  // Gift Set
  { sku: 'MRV-022', barcode: '8004395280001', name: 'MARVIS Gift Set of 5',               category: 'Gift Set'   },
];

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🗑️  Clearing existing data...');

    // Order matters due to foreign keys
    await client.query('DELETE FROM price_snapshots');
    console.log('   ✓ price_snapshots cleared');

    await client.query('DELETE FROM sync_runs');
    console.log('   ✓ sync_runs cleared');

    await client.query('DELETE FROM product_company_urls');
    console.log('   ✓ product_company_urls cleared');

    await client.query('DELETE FROM products');
    console.log('   ✓ products cleared');

    // Reset sequences so IDs start from 1
    await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE product_company_urls_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE price_snapshots_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE sync_runs_id_seq RESTART WITH 1');

    console.log('\n🌱 Inserting Marvis products...');

    for (const p of MARVIS_PRODUCTS) {
      await client.query(
        `INSERT INTO products (internal_name, internal_sku, barcode, brand, category, is_active)
         VALUES ($1, $2, $3, 'Marvis', $4, true)`,
        [p.name, p.sku, p.barcode, p.category]
      );
      console.log(`   ✓ ${p.sku}  ${p.name}`);
    }

    await client.query('COMMIT');

    // Summary
    const { rows } = await client.query('SELECT COUNT(*) FROM products');
    console.log(`\n✅ Done! ${rows[0].count} Marvis products in database.`);
    console.log('   Companies and configs were kept intact.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
