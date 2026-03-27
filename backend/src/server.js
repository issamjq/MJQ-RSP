'use strict';

require('dotenv').config();

const app    = require('./app');
const logger = require('./utils/logger');
const { pool } = require('./db');

const PORT = parseInt(process.env.PORT) || 4000;

async function runMigrations() {
  const migrations = [
    // Add original_price column for discount tracking
    `ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2)`,
    // Add initial_rsp to products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS initial_rsp NUMERIC(10,2)`,
  ];
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      logger.info('Migration OK', { sql: sql.slice(0, 60) });
    } catch (err) {
      logger.warn('Migration skipped/failed', { error: err.message });
    }
  }
}

async function start() {
  // Verify DB connection on startup
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection OK');
  } catch (err) {
    logger.error('Database connection FAILED', { error: err.message });
    process.exit(1);
  }

  // Run auto-migrations
  await runMigrations();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      env:  process.env.NODE_ENV,
      port: PORT,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await pool.end();
      logger.info('Server and DB pool closed');
      process.exit(0);
    });
    // Force exit after 10s if something hangs
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();
