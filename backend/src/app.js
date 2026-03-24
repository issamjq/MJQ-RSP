'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const companiesRouter         = require('./routes/companies');
const productsRouter          = require('./routes/products');
const productCompanyUrlsRouter = require('./routes/productCompanyUrls');
const priceSnapshotsRouter    = require('./routes/priceSnapshots');
const syncRunsRouter          = require('./routes/syncRuns');
const scraperRouter           = require('./routes/scraper');
const discoveryRouter         = require('./routes/discovery');

const app = express();

// ── Security & Parsing ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    env:     process.env.NODE_ENV,
    time:    new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/companies',            companiesRouter);
app.use('/api/products',             productsRouter);
app.use('/api/product-company-urls', productCompanyUrlsRouter);
app.use('/api/price-snapshots',      priceSnapshotsRouter);
app.use('/api/sync-runs',            syncRunsRouter);
app.use('/api/scraper',              scraperRouter);
app.use('/api/discovery',            discoveryRouter);

// ── Error handling (must be last) ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
