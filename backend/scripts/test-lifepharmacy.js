'use strict';

/**
 * Test script: search Life Pharmacy for "marvis" and print all product links found.
 * Run: node scripts/test-lifepharmacy.js
 */

const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
    viewport: { width: 1366, height: 768 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  console.log('Navigating to Life Pharmacy search...');
  await page.goto('https://www.lifepharmacy.com/search?q=marvis', {
    waitUntil: 'networkidle',
    timeout: 40000,
  }).catch(err => console.log('goto note:', err.message));

  // Wait a bit for JS rendering
  await page.waitForTimeout(3000);

  // Take a screenshot so we can see what's on the page
  await page.screenshot({ path: 'scripts/lifepharmacy-search.jpg', type: 'jpeg', quality: 75, fullPage: false });
  console.log('Screenshot saved: scripts/lifepharmacy-search.jpg');

  // Grab the page title
  const title = await page.title();
  console.log('Page title:', title);

  // Extract all anchor links
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      href: a.href,
    }))
  );

  // Filter to product-looking links
  const productLinks = links.filter(l =>
    l.href.includes('lifepharmacy.com') &&
    l.text.length > 3 &&
    !l.href.includes('#') &&
    (l.href.includes('/product') || l.href.includes('/p/') || l.text.toLowerCase().includes('marvis'))
  );

  console.log(`\nTotal links on page: ${links.length}`);
  console.log(`Product-looking links: ${productLinks.length}\n`);

  if (productLinks.length > 0) {
    productLinks.forEach((l, i) => {
      console.log(`[${i}] "${l.text}" → ${l.href}`);
    });
  } else {
    // Print all unique link patterns to help identify URL structure
    console.log('No product links found. Showing all unique link patterns:');
    const unique = [...new Set(links.map(l => {
      try { return new URL(l.href).pathname.split('/').slice(0, 3).join('/'); } catch { return l.href; }
    }))].filter(p => p.length > 1);
    unique.forEach(p => console.log(' ', p));
  }

  await browser.close();
}

main().catch(console.error);
