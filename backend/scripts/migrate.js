'use strict';

/**
 * Migration script — runs sql/schema.sql against the Neon database.
 * Usage: node scripts/migrate.js
 */

require('dotenv').config();

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const sql        = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔗 Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('📦 Running schema migration...');
    await client.query(sql);
    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
