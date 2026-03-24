'use strict';

/**
 * Seed script — inserts sample data using sql/seed.sql.
 * Usage: node scripts/seed.js
 *
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 */

require('dotenv').config();

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');
  const sql      = fs.readFileSync(seedPath, 'utf8');

  console.log('🔗 Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...');
    await client.query(sql);

    // Print summary
    const { rows: companies } = await client.query('SELECT COUNT(*) FROM companies');
    const { rows: products  } = await client.query('SELECT COUNT(*) FROM products');
    const { rows: urls      } = await client.query('SELECT COUNT(*) FROM product_company_urls');
    const { rows: configs   } = await client.query('SELECT COUNT(*) FROM company_configs');

    console.log('✅ Seed complete!');
    console.log(`   companies:             ${companies[0].count}`);
    console.log(`   products:              ${products[0].count}`);
    console.log(`   product_company_urls:  ${urls[0].count}`);
    console.log(`   company_configs:       ${configs[0].count}`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
