// Product lookup strategy.
// Order: User Memory -> Built-in exact -> Built-in alias -> fuzzy -> unknown.

import { normalizeItem } from "./normalize.js";

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array(n + 1);
  const curr = Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return curr[n];
}

function buildKeywordIndex(builtin) {
  // keyword/alias string -> entry key
  const index = new Map();
  for (const [key, entry] of Object.entries(builtin)) {
    index.set(key, key);
    (entry.keywords || []).forEach((kw) => index.set(normalizeItem(kw), key));
  }
  return index;
}

function fuzzyMatch(key, builtin) {
  let best = null;
  let bestDist = Infinity;
  for (const [k, entry] of Object.entries(builtin)) {
    const candidates = [k, ...(entry.keywords || [])].map(normalizeItem);
    for (const c of candidates) {
      const dist = levenshtein(key, c);
      // only consider close matches
      const threshold = Math.min(2, Math.max(1, Math.floor(c.length / 4)));
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        best = { key: k, entry, distance: dist };
      }
    }
  }
  return best;
}

// builtin: imported products.json object
// userMemory: object keyed by normalized key -> product shape
export function lookupProduct(key, builtin, userMemory) {
  if (!key) return { matched: false, normalized: key };

  // 1. User Memory exact key match
  if (userMemory && userMemory[key]) {
    return { matched: true, source: "user-memory", product: userMemory[key], normalized: key };
  }

  // 2. User Memory keyword match
  if (userMemory) {
    for (const entry of Object.values(userMemory)) {
      if (entry.keywords && entry.keywords.some((kw) => normalizeItem(kw) === key)) {
        return { matched: true, source: "user-memory", product: entry, normalized: key };
      }
    }
  }

  // 3 & 4. Built-in exact + keyword index
  const index = buildKeywordIndex(builtin);
  if (index.has(key)) {
    const entryKey = index.get(key);
    return { matched: true, source: "builtin", product: builtin[entryKey], normalized: key };
  }

  // 5. Fuzzy match (built-in only)
  const fuzzy = fuzzyMatch(key, builtin);
  if (fuzzy) {
    return { matched: true, source: "builtin", product: fuzzy.entry, normalized: key, fuzzy: true };
  }

  // 6. Unknown
  return { matched: false, normalized: key };
}
