'use strict';

/**
 * Add Life Pharmacy UAE as a company in the Price Monitor.
 * Run: node scripts/add-life-pharmacy.js
 */

require('dotenv').config();
const { query } = require('../src/db');

async function main() {
  // Insert company
  const { rows } = await query(
    `INSERT INTO companies (name, slug, base_url, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (slug) DO UPDATE
       SET name     = EXCLUDED.name,
           base_url = EXCLUDED.base_url,
           is_active = true
     RETURNING id, name, slug`,
    ['Life Pharmacy', 'life-pharmacy', 'https://www.lifepharmacy.com']
  );

  const company = rows[0];
  console.log(`Company upserted: [${company.id}] ${company.name} (${company.slug})`);

  // Insert company_config with selectors for the scraper
  await query(
    `INSERT INTO company_configs
       (company_id, price_selectors, title_selectors, availability_selectors,
        wait_for_selector, page_options, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id) DO UPDATE
       SET price_selectors        = EXCLUDED.price_selectors,
           title_selectors        = EXCLUDED.title_selectors,
           availability_selectors = EXCLUDED.availability_selectors,
           wait_for_selector      = EXCLUDED.wait_for_selector,
           page_options           = EXCLUDED.page_options,
           notes                  = EXCLUDED.notes`,
    [
      company.id,
      JSON.stringify([
        '[class*="price"] span',
        '[class*="Price"] span',
        '[data-testid*="price"]',
        '[class*="selling-price"]',
        '[class*="current-price"]',
        'meta[property="product:price:amount"]',
      ]),
      JSON.stringify([
        'h1[class*="product"]',
        'h1[class*="name"]',
        'h1[class*="title"]',
        'h1',
      ]),
      JSON.stringify([
        '[class*="stock"]',
        '[class*="availability"]',
        'button[class*="add-to-cart"]',
      ]),
      'h1',
      JSON.stringify({ waitUntil: 'networkidle', timeout: 40000 }),
      'React SPA — networkidle wait. AI Vision used for extraction.',
    ]
  );

  console.log('Company config upserted.');
  console.log('\nDone! Life Pharmacy is ready for Auto Discover and scraping.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
