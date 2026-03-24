'use strict';
require('dotenv/config');

const { query } = require('../src/db');

const products = [
  // 75ml toothpastes
  { sku: 'MRV-001', barcode: '8004395112425', name: 'Marvis Sensitive Gums Gentle Mint 75ml' },
  { sku: 'MRV-002', barcode: '8004395110155', name: 'Marvis Whitening Mint 75ml' },
  { sku: 'MRV-003', barcode: '8003190127016', name: 'Marvis Classic Strong Mint 75ml' },
  { sku: 'MRV-004', barcode: '8004395110124', name: 'Marvis Ginger Mint 75ml' },
  { sku: 'MRV-005', barcode: '8004395110148', name: 'Marvis Jasmine Mint 75ml' },
  { sku: 'MRV-006', barcode: '8004395110117', name: 'Marvis Aquatic Mint 75ml' },
  { sku: 'MRV-007', barcode: '8004395110506', name: 'Marvis Cinnamon Mint 75ml' },
  { sku: 'MRV-008', barcode: '8004395110513', name: 'Marvis Amarelli Licorice 75ml' },
  // 25ml toothpastes
  { sku: 'MRV-009', barcode: '8004395111381', name: 'Marvis Smokers Whitening Mint 25ml' },
  { sku: 'MRV-010', barcode: '8004395110322', name: 'Marvis Whitening Mint 25ml' },
  { sku: 'MRV-011', barcode: '8004395110063', name: 'Marvis Classic Strong Mint 25ml' },
  { sku: 'MRV-012', barcode: '8004395110292', name: 'Marvis Jasmine Mint 25ml' },
  { sku: 'MRV-013', barcode: '8004395110421', name: 'Marvis Amarelli Licorice 25ml' },
  { sku: 'MRV-014', barcode: '8004395110315', name: 'Marvis Aquatic Mint 25ml' },
  { sku: 'MRV-015', barcode: '8004395110414', name: 'Marvis Cinnamon Mint 25ml' },
  // 85ml
  { sku: 'MRV-016', barcode: '8004395111817', name: 'Marvis Smokers Whitening Mint 85ml' },
  // Mouthwash
  { sku: 'MRV-017', barcode: '8004395111572', name: 'Marvis Mouthwash Spearmint 120ml' },
  { sku: 'MRV-018', barcode: '8004395155781', name: 'Marvis Mouthwash Strong Mint 120ml' },
  { sku: 'MRV-019', barcode: '411056',         name: 'Marvis Mint Mouthwash 30ml' },
  // Toothbrushes
  { sku: 'MRV-020', barcode: '8004395110742', name: 'Marvis Toothbrush Soft' },
  { sku: 'MRV-021', barcode: '8004395110087', name: 'Marvis Toothbrush Medium' },
  // Gift set
  { sku: 'MRV-022', barcode: '8004395280001', name: 'Marvis Gift Set of 5' },
];

async function run() {
  let inserted = 0;
  for (const p of products) {
    const { rows } = await query(
      `INSERT INTO products (internal_name, internal_sku, barcode, brand, category, is_active)
       VALUES ($1, $2, $3, 'Marvis', 'Oral Care', true)
       ON CONFLICT (internal_sku) DO UPDATE SET
         internal_name = EXCLUDED.internal_name,
         barcode       = EXCLUDED.barcode,
         is_active     = true
       RETURNING id`,
      [p.name, p.sku, p.barcode]
    );
    console.log(`✓ [${rows[0].id}] ${p.name}`);
    inserted++;
  }
  console.log(`\nDone — ${inserted} products inserted/updated.`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
