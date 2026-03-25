'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requireAuth }                   = require('./middleware/firebaseAuth');

const companiesRouter         = require('./routes/companies');
const productsRouter          = require('./routes/products');
const productCompanyUrlsRouter = require('./routes/productCompanyUrls');
const priceSnapshotsRouter    = require('./routes/priceSnapshots');
const syncRunsRouter          = require('./routes/syncRuns');
const scraperRouter           = require('./routes/scraper');
const discoveryRouter         = require('./routes/discovery');

const app = express();

// Disable ETags — prevents 304 "Not Modified" on JSON API responses
app.set('etag', false);

// ── Security & Parsing ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — explicit options so preflight OPTIONS always gets correct headers
app.use(cors({
  origin: true,           // reflect the request origin (allows all)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400,          // cache preflight result for 24h in browsers
}));
app.options('*', cors()); // handle preflight for ALL routes explicitly

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// No caching on any /api route — always return fresh data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

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

// ── API Routes (all protected by Firebase auth) ──────────────────
app.use('/api', requireAuth);
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
