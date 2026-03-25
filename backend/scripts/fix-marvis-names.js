'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/db');

async function main() {
  // Prepend "Marvis " to all Marvis products whose name doesn't already start with "Marvis"
  const { rowCount } = await db.query(
    `UPDATE products
     SET internal_name = 'Marvis ' || internal_name,
         updated_at    = NOW()
     WHERE brand = 'Marvis'
       AND internal_name NOT ILIKE 'Marvis%'`
  );
  console.log(`Updated ${rowCount} Marvis product(s).`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
