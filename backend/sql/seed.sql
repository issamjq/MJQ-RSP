-- =============================================================
-- RSP Price Monitoring — Seed Data
-- Run via: node scripts/seed.js
-- =============================================================

-- -------------------------------------------------------
-- COMPANIES
-- -------------------------------------------------------
INSERT INTO companies (name, slug, base_url, is_active) VALUES
  ('Amazon AE',       'amazon-ae',      'https://www.amazon.ae',            true),
  ('Noon',            'noon',           'https://www.noon.com',             true),
  ('Carrefour UAE',   'carrefour-uae',  'https://www.carrefouruae.com',     true),
  ('Spinneys',        'spinneys',       'https://www.spinneys.com',         true),
  ('Union Coop',      'union-coop',     'https://www.unioncoop.ae',         true),
  ('Lulu Hypermarket','lulu',           'https://www.luluhypermarket.com',  true),
  ('Kibsons',         'kibsons',        'https://kibsons.com',              true),
  ('Grandiose',       'grandiose',      'https://www.grandiose.ae',         false)
ON CONFLICT (slug) DO NOTHING;

-- -------------------------------------------------------
-- COMPANY CONFIGS (default CSS selectors per company)
-- These are tried in order — first match wins
-- -------------------------------------------------------
INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '[".a-price-whole", ".a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice", ".a-price .a-offscreen", "span[data-a-color=price] .a-offscreen"]'::jsonb,
  '["#productTitle", "h1.product-title-word-break", "h1#title"]'::jsonb,
  '["#availability span", "#availability .a-color-success", "#availability .a-color-price", "#outOfStock"]'::jsonb,
  '#productTitle',
  '{"waitUntil": "domcontentloaded"}'::jsonb,
  'Amazon AE — standard product pages'
FROM companies c WHERE c.slug = 'amazon-ae'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '["[data-qa=price-amount]", ".price .amount", ".sc-價格 .price", "[class*=price_][class*=amount]", "[class*=sellingPrice]", "[data-testid=price]"]'::jsonb,
  '["h1[data-qa=pdp-name]", "h1.name", "[data-qa=pdp-product-name]", "h1[class*=name]"]'::jsonb,
  '["[data-qa=add-to-cart]", "[class*=availability]", "[class*=stock-status]"]'::jsonb,
  'h1[data-qa=pdp-name]',
  '{"waitUntil": "networkidle"}'::jsonb,
  'Noon.com UAE product pages'
FROM companies c WHERE c.slug = 'noon'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '["[class*=css-price]", "[data-testid=final-price]", ".css-y8idp5", "[class*=PriceTag]", ".price-value", ".priceCnt"]'::jsonb,
  '["h1[class*=product-title]", "h1[data-testid=product-name]", ".product-name h1", "h1.css-title"]'::jsonb,
  '["[class*=stock-indicator]", "[data-testid=stock-status]", "[class*=availability]", ".add-to-cart-btn"]'::jsonb,
  'h1',
  '{"waitUntil": "domcontentloaded"}'::jsonb,
  'Carrefour UAE — may need session / geolocation'
FROM companies c WHERE c.slug = 'carrefour-uae'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '[".price-box .price", ".regular-price .price", "[data-price-amount]", ".product-info-price .price"]'::jsonb,
  '["h1.page-title", "h1.product-name", ".product-info-main h1"]'::jsonb,
  '["[title*=stock]", ".stock.available", ".stock.unavailable", "[class*=availability]"]'::jsonb,
  'h1.page-title',
  '{"waitUntil": "domcontentloaded"}'::jsonb,
  'Spinneys — Magento-based storefront'
FROM companies c WHERE c.slug = 'spinneys'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '[".product-price", ".price-value", ".final-price", "[class*=price]"]'::jsonb,
  '["h1.product-title", "h1.page-title", ".product-name"]'::jsonb,
  '["[class*=availability]", "[class*=stock]", ".add-to-cart"]'::jsonb,
  'h1',
  '{"waitUntil": "domcontentloaded"}'::jsonb,
  'Union Coop'
FROM companies c WHERE c.slug = 'union-coop'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_configs (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
SELECT
  c.id,
  '[".price-box .price", "[data-price-type=finalPrice]", ".product-info-price .price", ".regular-price"]'::jsonb,
  '["h1.page-title span", "h1.product-name", ".product-info-main h1"]'::jsonb,
  '["[title=Availability]", ".stock.available span", ".stock.unavailable span"]'::jsonb,
  'h1',
  '{"waitUntil": "domcontentloaded"}'::jsonb,
  'Lulu Hypermarket'
FROM companies c WHERE c.slug = 'lulu'
ON CONFLICT (company_id) DO NOTHING;

-- -------------------------------------------------------
-- PRODUCTS (sample internal catalog)
-- -------------------------------------------------------
INSERT INTO products (internal_name, internal_sku, barcode, brand, category, is_active) VALUES
  ('Nescafe Classic 200g',       'RSP-001', '6001087013052', 'Nescafe',  'Beverages',   true),
  ('Pampers Baby Dry Size 4 54s','RSP-002', '4015400687641', 'Pampers',  'Baby Care',   true),
  ('Lipton Yellow Label 100 bags','RSP-003','0070177009350', 'Lipton',   'Beverages',   true),
  ('Ariel Laundry Powder 2.5kg', 'RSP-004', '4084500587427', 'Ariel',    'Home Care',   true),
  ('Dettol Handwash 250ml',      'RSP-005', '6281006484218', 'Dettol',   'Personal Care',true)
ON CONFLICT (internal_sku) DO NOTHING;

-- -------------------------------------------------------
-- PRODUCT COMPANY URLS (sample mappings)
-- Amazon AE product URLs for our sample products
-- -------------------------------------------------------
INSERT INTO product_company_urls (product_id, company_id, product_url, currency, is_active)
SELECT
  p.id,
  c.id,
  'https://www.amazon.ae/dp/B07FNS3HJF',
  'AED',
  true
FROM products p, companies c
WHERE p.internal_sku = 'RSP-001' AND c.slug = 'amazon-ae'
ON CONFLICT (product_id, company_id) DO NOTHING;

INSERT INTO product_company_urls (product_id, company_id, product_url, currency, is_active)
SELECT
  p.id,
  c.id,
  'https://www.amazon.ae/dp/B076TQXNBP',
  'AED',
  true
FROM products p, companies c
WHERE p.internal_sku = 'RSP-002' AND c.slug = 'amazon-ae'
ON CONFLICT (product_id, company_id) DO NOTHING;

INSERT INTO product_company_urls (product_id, company_id, product_url, currency, is_active)
SELECT
  p.id,
  c.id,
  'https://www.amazon.ae/dp/B07N9TZN8N',
  'AED',
  true
FROM products p, companies c
WHERE p.internal_sku = 'RSP-003' AND c.slug = 'amazon-ae'
ON CONFLICT (product_id, company_id) DO NOTHING;

-- Noon URLs
INSERT INTO product_company_urls (product_id, company_id, product_url, currency, is_active)
SELECT
  p.id,
  c.id,
  'https://www.noon.com/uae-en/nescafe-classic-instant-coffee-200g/N30099085A/p/',
  'AED',
  true
FROM products p, companies c
WHERE p.internal_sku = 'RSP-001' AND c.slug = 'noon'
ON CONFLICT (product_id, company_id) DO NOTHING;
