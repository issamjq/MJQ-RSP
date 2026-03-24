'use strict';

/**
 * matchingService.js
 *
 * Smart product name matching with two strategies:
 *   1. Fuzzy  — always available, uses token-overlap (Jaccard similarity)
 *   2. AI     — optional, requires ANTHROPIC_API_KEY; falls back to fuzzy on error
 */

// ── Normalisation ───────────────────────────────────────────────────────────

/**
 * Lowercase, strip punctuation, normalise size units, collapse spaces.
 *
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    // Normalise "75 mL" / "75ML" / "120 ml" / "85g" / "1.5kg" / "3oz" → "75ml" etc.
    .replace(/(\d+(?:\.\d+)?)\s*(ml|mL|ML|g|kg|oz)\b/g, (_, n, unit) => `${n}${unit.toLowerCase()}`)
    // Strip punctuation
    .replace(/[,.'!?:;]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a normalised size token from a product name (e.g. "75ml", "120ml").
 *
 * @param {string} str
 * @returns {string|null}
 */
function extractSize(str) {
  const norm  = normalize(str);
  const match = norm.match(/\d+(?:\.\d+)?\s*(?:ml|g|kg|oz)\b/);
  if (!match) return null;
  // Remove any internal space so "75 ml" → "75ml"
  return match[0].replace(/\s+/g, '');
}

// ── Token Overlap ────────────────────────────────────────────────────────────

/**
 * Jaccard similarity over word tokens.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} 0–1
 */
function tokenScore(a, b) {
  const tokensA = new Set(normalize(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalize(b).split(' ').filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Fuzzy Match ──────────────────────────────────────────────────────────────

/**
 * Find the best matching internal product for a single candidate name.
 *
 * @param {string}   candidateName - Product name found on the retailer's site
 * @param {Array<{id: number, internal_name: string}>} catalog - Internal products
 * @returns {{ product: object, confidence: number }|null}
 */
function fuzzyMatch(candidateName, catalog) {
  const candidateSize = extractSize(candidateName);
  let best     = null;
  let bestScore = 0;

  for (const product of catalog) {
    let score = tokenScore(candidateName, product.internal_name);

    // Penalise mismatched sizes — cap at 0.55
    if (candidateSize !== null) {
      const productSize = extractSize(product.internal_name);
      if (productSize !== null && productSize !== candidateSize) {
        score = Math.min(score, 0.55);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best      = product;
    }
  }

  if (bestScore >= 0.45 && best) {
    return { product: best, confidence: bestScore };
  }
  return null;
}

// ── AI Match ─────────────────────────────────────────────────────────────────

/**
 * Match an array of found candidates against the internal catalog using Claude.
 * Falls back to fuzzyMatch per candidate if no API key or on any error.
 *
 * @param {Array<{name: string, url: string}>} candidates
 * @param {Array<{id: number, internal_name: string}>} catalog
 * @returns {Promise<Array<{found: object, match: object|null, method: string}>>}
 */
async function aiMatch(candidates, catalog) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key → fall back to fuzzy for every candidate
  if (!apiKey) {
    return candidates.map((found) => ({
      found,
      match:  fuzzyMatch(found.name, catalog),
      method: 'fuzzy',
    }));
  }

  try {
    // Build a compact catalog string: "1: Marvis Classic Mint 75ml\n2: ..."
    const catalogLines = catalog
      .map((p) => `${p.id}: ${p.internal_name}`)
      .join('\n');

    // Build a compact candidates string: "0: Marvis Classic Mint Toothpaste 75ml\n1: ..."
    const candidateLines = candidates
      .map((c, i) => `${i}: ${c.name}`)
      .join('\n');

    const prompt =
      `You are a product matching assistant for a UAE retail price monitoring system.\n\n` +
      `Internal product catalog (id: name):\n${catalogLines}\n\n` +
      `Products found on a retailer website (index: name):\n${candidateLines}\n\n` +
      `Match each found product to the best catalog entry. ` +
      `Return ONLY a JSON array with no extra text, like:\n` +
      `[{"i": 0, "id": 5, "confidence": 0.95}]\n\n` +
      `Rules:\n` +
      `- "i" is the found-product index (0-based)\n` +
      `- "id" is the internal catalog product id\n` +
      `- "confidence" is 0–1\n` +
      `- Only include matches with confidence > 0.5\n` +
      `- If a found product has no good match, omit it from the array`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data       = await response.json();
    const rawContent = data?.content?.[0]?.text || '[]';

    // Extract the JSON array from the response (tolerant of surrounding text)
    const jsonMatch  = rawContent.match(/\[[\s\S]*\]/);
    const parsed     = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Build a lookup: candidate index → { id, confidence }
    const aiLookup = {};
    for (const entry of parsed) {
      if (typeof entry.i === 'number' && typeof entry.id === 'number') {
        aiLookup[entry.i] = { id: entry.id, confidence: entry.confidence || 0 };
      }
    }

    // Map each candidate to its result
    return candidates.map((found, i) => {
      const aiEntry = aiLookup[i];
      if (aiEntry) {
        const product = catalog.find((p) => p.id === aiEntry.id) || null;
        return {
          found,
          match:  product ? { product, confidence: aiEntry.confidence } : null,
          method: 'ai',
        };
      }
      // Not matched by AI → try fuzzy as fallback for this one
      return {
        found,
        match:  fuzzyMatch(found.name, catalog),
        method: 'ai',
      };
    });

  } catch (err) {
    // Any error → fall back to fuzzy for all candidates
    return candidates.map((found) => ({
      found,
      match:  fuzzyMatch(found.name, catalog),
      method: 'fuzzy',
    }));
  }
}

module.exports = { aiMatch, fuzzyMatch, normalize };
