'use strict';

/**
 * Per-company search configurations for the Auto-Discover feature.
 * Each config defines how to search a retailer's website and extract product results.
 */

const searchConfigs = {
  'carrefour-uae': {
    // For known brands, use their brand/category page (much faster than search).
    // Brand category pages are server-rendered and don't require JS to show products.
    brandPages: {
      marvis: 'https://www.carrefouruae.com/mafuae/en/c/16302',
    },
    searchUrl:        'https://www.carrefouruae.com/mafuae/en/search?query={query}',
    // Use commit (first byte received) — extract after waiting for selector
    pageOptions:      { waitUntil: 'commit', timeout: 30000 },
    blockResources:   ['font', 'image', 'media'],
    waitForSelector:  'a[href*="/p/"]',
    productUrlPattern: /\/p\/\d+/,

    // Override URL resolution: prefer brand page over search
    resolveUrl(query) {
      const q = query.toLowerCase().trim();
      return this.brandPages[q]
        || this.searchUrl.replace('{query}', encodeURIComponent(query));
    },

    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/p/"]'));
        const seen    = new Set();
        const results = [];

        for (const a of anchors) {
          const rawHref = a.href || '';
          const url     = rawHref.split('?')[0];
          if (!url || seen.has(url)) continue;
          seen.add(url);

          let name = '';
          const lineClamp = a.querySelector('[class*="line-clamp"]');
          if (lineClamp) {
            name = lineClamp.textContent.trim();
          } else {
            const firstSpan = a.querySelector('span');
            const firstDiv  = a.querySelector('div');
            name = (firstSpan || firstDiv || a).textContent.trim();
          }

          if (name && url) {
            results.push({ name, url });
          }
        }

        return results;
      });
    },
  },

  'amazon-ae': {
    searchUrl:        'https://www.amazon.ae/s?k={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  '[data-component-type="s-search-result"]',
    productUrlPattern: /\/dp\/[A-Z0-9]{5,}/,

    async extractProducts(page) {
      return page.evaluate(() => {
        const cards   = Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'));
        const results = [];

        for (const card of cards) {
          // Extract title
          const titleEl  = card.querySelector('h2 .a-link-normal span') || card.querySelector('h2 span');
          const name     = titleEl ? titleEl.textContent.trim() : '';

          // Extract ASIN and build canonical /dp/ URL
          const asin     = card.getAttribute('data-asin') || '';
          const url      = asin ? `https://www.amazon.ae/dp/${asin}` : '';

          if (name && url) {
            results.push({ name, url });
          }
        }

        return results;
      });
    },
  },

  'noon': {
    // Noon React SPA. Products load dynamically but /p/ links are present after JS renders.
    // URL structure: /uae-en/{slug}/{ID}/p/ — ID comes BEFORE /p/, not after.
    searchUrl:        'https://www.noon.com/uae-en/search/?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['font', 'media'],
    waitForSelector:  'a[href*="/p/"]',
    productUrlPattern: /\/p\//,

    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/p/"]'));
        const seen    = new Set();
        const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue;
          const path = new URL(url).pathname;
          if (path.split('/').filter(Boolean).length < 3) continue;
          seen.add(url);
          // Strip CSS @keyframes noise that Noon injects into anchor text
          const rawText = a.textContent || '';
          const name = rawText.replace(/@keyframes[\s\S]*?\}(\s*\})?/g, '').replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Lulu Hypermarket — BLOCKED (Cloudflare 522, origin unreachable)
  'lulu': {
    searchUrl:        'https://www.luluhypermarket.com/en/search?q={query}',
    pageOptions:      { waitUntil: 'commit', timeout: 10000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  null,
    productUrlPattern: /\/p\/\d+/,
    async extractProducts() { return []; },
  },

  // Spinneys UAE — BLOCKED (Azure Application Gateway 403)
  'spinneys': {
    searchUrl:        'https://www.spinneys.com/en-ae/search/?q={query}',
    pageOptions:      { waitUntil: 'commit', timeout: 10000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  null,
    productUrlPattern: /\/en-ae\/.*\.html$/,
    async extractProducts() { return []; },
  },

  // Union Coop — BLOCKED (Varnish 405 on all search URL variants)
  'union-coop': {
    searchUrl:        'https://www.unioncoop.ae/catalogsearch/result/?q={query}',
    pageOptions:      { waitUntil: 'commit', timeout: 10000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  null,
    productUrlPattern: /unioncoop\.ae\/.*\.html$/,
    async extractProducts() { return []; },
  },

  // Kibsons — WooCommerce
  'kibsons': {
    searchUrl:        'https://kibsons.com/?s={query}&post_type=product',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/product/"]',
    productUrlPattern: /\/product\//,

    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/product/"]'));
        const seen    = new Set();
        const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue;
          seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Grandiose UAE — similar to Carrefour (SAP Hybris/Next.js)
  'grandiose': {
    searchUrl:        'https://www.grandiose.ae/en/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/p/"], a[href*="/product/"]',
    productUrlPattern: /\/p\/\d+|\/product\//,

    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const seen    = new Set();
        const results = [];
        for (const a of anchors) {
          const href = a.href || '';
          if (!href.match(/\/p\/\d+|\/product\//)) continue;
          const url = href.split('?')[0];
          if (!url || seen.has(url)) continue;
          seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // ── Pharmacies & New Companies ───────────────────────────────────────────────

  // Life Pharmacy UAE — custom Magento-like platform
  'life-pharmacy': {
    searchUrl:        'https://www.lifepharmacy.com/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"]',
    productUrlPattern: /lifepharmacy\.com\/products\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/products/"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Bin Sina Pharmacy UAE
  'bin-sina': {
    searchUrl:        'https://www.binsina.ae/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"], a[href*="/product/"]',
    productUrlPattern: /binsina\.ae\/(products|product)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/product"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Chemist Warehouse UAE
  'chemist-warehouse': {
    searchUrl:        'https://www.chemistwarehouse.ae/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"], a[href*="/buy/"]',
    productUrlPattern: /chemistwarehouse\.ae\/(products|buy)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/products/"], a[href*="/buy/"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Dr.Nutrition UAE — WooCommerce / custom
  'dr-nutrition': {
    searchUrl:        'https://www.drnutrition.com/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"], a[href*="/product/"]',
    productUrlPattern: /drnutrition\.com\/(products|product)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/product"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Supercare Pharmacy UAE
  'supercare': {
    searchUrl:        'https://www.supercarepharmacy.com/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"], a[href*="/product/"]',
    productUrlPattern: /supercarepharmacy\.com\/(products|product)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/product"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Monoprix UAE — Magento
  'monoprix': {
    searchUrl:        'https://www.monoprix.ae/en/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*=".html"]',
    productUrlPattern: /monoprix\.ae\/en\/.*\.html$/,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href$=".html"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const href = a.href || '';
          if (href.includes('/en/search') || href.includes('/en/c/') || href.includes('/catalogsearch/')) continue;
          const url = href.split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Geant UAE
  'geant': {
    searchUrl:        'https://www.geant.ae/en/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/p/"], a[href*="/products/"]',
    productUrlPattern: /geant\.ae\/(en\/)?(p|products)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/products/"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Waitrose UAE
  'waitrose': {
    searchUrl:        'https://www.waitrose.ae/en/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/p/"], a[href*=".html"]',
    productUrlPattern: /waitrose\.ae\/.*(\/p\/\d+|\.html)$/,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href$=".html"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  // Earth Supermarket UAE
  'earth-supermarket': {
    searchUrl:        'https://www.earth.ae/search?q={query}',
    pageOptions:      { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:   ['image', 'font', 'media'],
    waitForSelector:  'a[href*="/products/"], a[href*="/product/"]',
    productUrlPattern: /earth\.ae\/(products|product)\//,
    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/product"]'));
        const seen = new Set(); const results = [];
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue; seen.add(url);
          const name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name && url) results.push({ name, url });
        }
        return results;
      });
    },
  },

  'talabat': {
    // Talabat Mart — SPA, search triggered by typing into search box
    searchUrl:       'https://www.talabat.com/uae/grocery/600398/talabat-mart?aid=1244',
    pageOptions:     { waitUntil: 'domcontentloaded', timeout: 35000 },
    blockResources:  ['font', 'media'],
    waitForSelector: 'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]',
    productUrlPattern: /\/item\/\d+/,

    // Type the search query into Talabat's search box and wait for results
    async postLoad(page, _url, searchQuery) {
      const searchBox = await page.$('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
      if (!searchBox) return;
      await searchBox.click();
      await searchBox.fill(searchQuery || 'marvis');
      await page.waitForTimeout(3000);
      await page.waitForSelector('a[href*="/item/"]', { timeout: 10000 }).catch(() => {});
    },

    async extractProducts(page) {
      return page.evaluate(() => {
        const results = [];
        const seen = new Set();
        const anchors = Array.from(document.querySelectorAll('a[href*="/item/"]'));
        for (const a of anchors) {
          const url = (a.href || '').split('?')[0];
          if (!url || seen.has(url)) continue;
          if (!/\/item\/\d+/.test(url)) continue;
          seen.add(url);
          const nameEl = a.querySelector('[class*="name"], [class*="title"], p, span');
          const name = (nameEl?.textContent || a.textContent || '').replace(/\s+/g, ' ').trim();
          if (name.length > 3) results.push({ name, url });
        }
        return results;
      });
    },
  },
};

/**
 * Generic fallback config for companies without a specific config.
 * Uses the company's website_url as the search base.
 *
 * @param {string} websiteUrl - The company's website_url from the DB
 */
function genericConfig(websiteUrl) {
  return {
    searchUrl:       `${websiteUrl || ''}/search?q={query}`,
    pageOptions:     { waitUntil: 'domcontentloaded', timeout: 30000 },
    blockResources:  ['image', 'font', 'media'],
    waitForSelector: null,

    async extractProducts(page) {
      return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const seen    = new Set();
        const results = [];

        for (const a of anchors) {
          const href = a.href || '';
          // Only include links that look like product URLs
          if (!href.includes('product') && !href.match(/\/p\/|\/dp\/|\/item\//)) continue;
          const url = href.split('?')[0];
          if (!url || seen.has(url)) continue;
          seen.add(url);

          const name = a.textContent.trim();
          if (name && url) {
            results.push({ name, url });
          }
        }

        return results;
      });
    },
  };
}

/**
 * Returns the search config for a company slug, or the generic fallback.
 *
 * @param {string} slug       - Company slug (e.g. 'carrefour-uae')
 * @param {string} websiteUrl - Company's website_url, used by the generic fallback
 * @returns {object}
 */
function getSearchConfig(slug, websiteUrl) {
  return searchConfigs[slug] || genericConfig(websiteUrl);
}

module.exports = { searchConfigs, getSearchConfig };
