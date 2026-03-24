'use strict';

require('dotenv').config();
const { query } = require('../src/db');

async function upsertCompany(name, slug, baseUrl, priceSelectors, titleSelectors, availSelectors, waitFor, pageOptions, notes) {
  const { rows } = await query(
    `INSERT INTO companies (name, slug, base_url, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name, base_url = EXCLUDED.base_url, is_active = true
     RETURNING id, name, slug`,
    [name, slug, baseUrl]
  );
  const company = rows[0];
  console.log(`Upserted: [${company.id}] ${company.name} (${company.slug})`);

  await query(
    `INSERT INTO company_configs
       (company_id, price_selectors, title_selectors, availability_selectors, wait_for_selector, page_options, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id) DO UPDATE
       SET price_selectors        = EXCLUDED.price_selectors,
           title_selectors        = EXCLUDED.title_selectors,
           availability_selectors = EXCLUDED.availability_selectors,
           wait_for_selector      = EXCLUDED.wait_for_selector,
           page_options           = EXCLUDED.page_options,
           notes                  = EXCLUDED.notes`,
    [company.id, JSON.stringify(priceSelectors), JSON.stringify(titleSelectors),
     JSON.stringify(availSelectors), waitFor, JSON.stringify(pageOptions), notes]
  );
  console.log(`  Config saved.`);
}

async function main() {
  await upsertCompany(
    'Bin Sina Pharmacy', 'bin-sina', 'https://www.binsina.ae',
    [
      '.price-box .price',
      '[data-price-type="finalPrice"] .price',
      '.special-price .price',
      '.regular-price .price',
      '[itemprop="price"]',
    ],
    ['h1.page-title span', 'h1.product-name', 'h1[itemprop="name"]', 'h1'],
    ['.stock.available', '.stock.unavailable', '[title="In stock"]', '[title="Out of stock"]'],
    'h1',
    { waitUntil: 'networkidle', timeout: 40000 },
    'Magento. Product URLs: /en/buy-{slug}.html. Search: /en/catalogsearch/result/?q='
  );

  await upsertCompany(
    'Med7 Online', 'med7', 'https://www.med7online.com',
    [
      '.price__current',
      '.product__price',
      '[data-product-price]',
      '.price-item--sale',
      '.price-item--regular',
    ],
    ['h1.product__title', 'h1.product-single__title', 'h1'],
    ['[data-add-to-cart]', '.product-form__cart-submit', '[class*="sold-out"]'],
    'h1',
    { waitUntil: 'domcontentloaded', timeout: 30000 },
    'Shopify. Product URLs: /collections/.../products/{slug}. Server-rendered search.'
  );

  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
