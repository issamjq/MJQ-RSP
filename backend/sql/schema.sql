-- =============================================================
-- RSP Price Monitoring System — Full PostgreSQL / Neon Schema
-- Run via: node scripts/migrate.js
-- =============================================================

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TABLE: companies
-- Stores each marketplace / retail company being monitored
-- =============================================================
CREATE TABLE IF NOT EXISTS companies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,        -- e.g. "amazon-ae"
  base_url    VARCHAR(500),                        -- e.g. "https://www.amazon.ae"
  logo_url    VARCHAR(500),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug      ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

CREATE OR REPLACE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- TABLE: products
-- Internal product catalog
-- =============================================================
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  internal_name VARCHAR(255) NOT NULL,
  internal_sku  VARCHAR(100) UNIQUE,
  barcode       VARCHAR(100),
  brand         VARCHAR(100),
  category      VARCHAR(100),
  image_url     VARCHAR(500),
  initial_rsp   NUMERIC(10,2),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add initial_rsp to existing deployments
ALTER TABLE products ADD COLUMN IF NOT EXISTS initial_rsp NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_products_sku        ON products(internal_sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode    ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active  ON products(is_active);

CREATE OR REPLACE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- TABLE: company_configs
-- Default CSS selectors for each company (one row per company)
-- Individual product URLs can override these selectors
-- =============================================================
CREATE TABLE IF NOT EXISTS company_configs (
  id                    SERIAL PRIMARY KEY,
  company_id            INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Arrays of CSS selectors tried in order until one succeeds
  price_selectors       JSONB NOT NULL DEFAULT '[]',
  title_selectors       JSONB NOT NULL DEFAULT '[]',
  availability_selectors JSONB NOT NULL DEFAULT '[]',
  -- Optional: wait for this selector before extracting (for JS-rendered pages)
  wait_for_selector     VARCHAR(500),
  -- Extra Playwright options as JSON (e.g. {"waitUntil": "networkidle"})
  page_options          JSONB NOT NULL DEFAULT '{}',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_company_configs_company UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_configs_company_id ON company_configs(company_id);

CREATE OR REPLACE TRIGGER set_company_configs_updated_at
  BEFORE UPDATE ON company_configs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- TABLE: product_company_urls
-- One row per (product, company) pair — stores the product URL
-- and optional per-product selector overrides
-- =============================================================
CREATE TABLE IF NOT EXISTS product_company_urls (
  id                    SERIAL PRIMARY KEY,
  product_id            INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id            INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_url           TEXT NOT NULL,
  -- Metadata discovered from scraping or entered manually
  external_title        VARCHAR(500),
  external_sku          VARCHAR(100),
  external_barcode      VARCHAR(100),
  -- Per-product selector overrides (null = use company_configs defaults)
  selector_price        TEXT,               -- single CSS selector override
  selector_title        TEXT,
  selector_availability TEXT,
  -- Override arrays (JSONB) if multiple selectors needed per field
  price_selectors       JSONB,
  title_selectors       JSONB,
  availability_selectors JSONB,
  currency              VARCHAR(10) NOT NULL DEFAULT 'AED',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_status           VARCHAR(50),        -- 'success' | 'error' | 'timeout'
  last_checked_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_company UNIQUE (product_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_pcu_product_id   ON product_company_urls(product_id);
CREATE INDEX IF NOT EXISTS idx_pcu_company_id   ON product_company_urls(company_id);
CREATE INDEX IF NOT EXISTS idx_pcu_is_active    ON product_company_urls(is_active);
CREATE INDEX IF NOT EXISTS idx_pcu_last_status  ON product_company_urls(last_status);

CREATE OR REPLACE TRIGGER set_pcu_updated_at
  BEFORE UPDATE ON product_company_urls
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- TABLE: price_snapshots
-- Historical record of every price check
-- =============================================================
CREATE TABLE IF NOT EXISTS price_snapshots (
  id                      SERIAL PRIMARY KEY,
  product_id              INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id              INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_company_url_id  INTEGER REFERENCES product_company_urls(id) ON DELETE SET NULL,
  -- Extracted data
  title_found             VARCHAR(500),
  price                   NUMERIC(12, 2),
  currency                VARCHAR(10) DEFAULT 'AED',
  availability            VARCHAR(100),   -- 'in_stock' | 'out_of_stock' | 'unknown' | raw text
  -- Raw text for debugging
  raw_price_text          TEXT,
  raw_availability_text   TEXT,
  -- Scrape result
  scrape_status           VARCHAR(50) NOT NULL DEFAULT 'success',  -- 'success' | 'error' | 'timeout' | 'no_price'
  error_message           TEXT,
  -- When was this price checked
  checked_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_product_id     ON price_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_company_id     ON price_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_pcu_id         ON price_snapshots(product_company_url_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_checked_at     ON price_snapshots(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_scrape_status  ON price_snapshots(scrape_status);
-- Composite for "latest price per product per company"
CREATE INDEX IF NOT EXISTS idx_snapshots_product_company_checked
  ON price_snapshots(product_id, company_id, checked_at DESC);

-- =============================================================
-- TABLE: sync_runs
-- Tracks each sync execution (manual or scheduled)
-- =============================================================
CREATE TABLE IF NOT EXISTS sync_runs (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  run_type        VARCHAR(50) NOT NULL,    -- 'single_url' | 'company_batch' | 'full_batch'
  status          VARCHAR(50) NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed' | 'partial'
  triggered_by    VARCHAR(100) DEFAULT 'manual',           -- 'manual' | 'scheduler' | 'api'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  total_checked   INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  fail_count      INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  meta            JSONB NOT NULL DEFAULT '{}',  -- extra info (e.g. url_id for single_url runs)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_company_id  ON sync_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status      ON sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at  ON sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_run_type    ON sync_runs(run_type);
