'use strict';

const { Pool } = require('pg');

// Single shared connection pool for the entire app
// Neon requires ?sslmode=require in the connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon serverless Postgres needs SSL
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  max: 10,               // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized SQL query.
 * @param {string} text - SQL string with $1, $2... placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] query (${duration}ms) rows=${result.rowCount}`, text.slice(0, 80));
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nSQL:', text.slice(0, 200));
    throw err;
  }
}

/**
 * Get a dedicated client from the pool (for transactions).
 * Caller MUST call client.release() when done.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run callback inside a transaction.
 * Automatically commits on success, rolls back on error.
 * @param {Function} callback - async fn(client) => result
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, getClient, withTransaction, pool };
