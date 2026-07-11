// Enrichment engine: combines normalize, duplicate detection and lookup
// into the internal data model used by the UI.

import { normalizeItem } from "./normalize.js";
import { detectDuplicates } from "./duplicate.js";
import { lookupProduct } from "./lookup.js";
import { buildDisplayName } from "./product.js";
import { parseTranscript } from "./voice.js";

let counter = 0;
function nextId() {
  counter += 1;
  return `item-${counter}-${Date.now()}`;
}

// Flatten input lines: lines that don't match are fed through parseTranscript
// to split into sub-phrases. This ensures dedup happens AFTER splitting.
function expandLines(lines, builtin, userMemory) {
  const brands = collectBrands(builtin, userMemory);
  const sizeWords = collectSizeWords(builtin, userMemory);
  const out = [];
  for (const line of lines) {
    const key = normalizeItem(line);
    if (!key) continue;
    if (lookupProduct(key, builtin, userMemory).matched) {
      out.push(line);
    } else if (isNoise(key, brands, sizeWords)) {
      continue;
    } else {
      const splits = parseTranscript(line, builtin, userMemory);
      if (splits.length > 1) {
        const clean = splits.filter((s) => {
          const k = normalizeItem(s);
          return k && !isNoise(k, brands, sizeWords);
        });
        if (clean.length > 0) {
          const compressed = clean.length > 1
            ? compressToMatch(clean, builtin, userMemory)
            : null;
          if (compressed) {
            out.push(compressed);
          } else {
            const anyMatch = clean.some((s) =>
              lookupProduct(normalizeItem(s), builtin, userMemory).matched
            );
            if (anyMatch) {
              out.push(...clean);
            } else {
              out.push(line);
            }
          }
        }
      } else {
        out.push(line);
      }
    }
  }
  return out;
}

function collectBrands(builtin, userMemory) {
  const brands = new Set();
  for (const v of Object.values(builtin)) {
    if (v.brand) {
      const n = normalizeItem(v.brand);
      if (n) { brands.add(n); n.split(/\s+/).forEach((w) => brands.add(w)); }
    }
  }
  for (const v of Object.values(userMemory)) {
    if (v.brand) {
      const n = normalizeItem(v.brand);
      if (n) { brands.add(n); n.split(/\s+/).forEach((w) => brands.add(w)); }
    }
  }
  return brands;
}

function collectSizeWords(builtin, userMemory) {
  const sizes = new Set();
  const collect = (v) => {
    if (v.size) {
      const n = normalizeItem(v.size);
      if (n) {
        n.split(/\s+/).forEach((p) => {
          if (p && !/^\d+(\.\d+)?$/.test(p)) sizes.add(p);
        });
      }
    }
  };
  Object.values(builtin).forEach(collect);
  Object.values(userMemory).forEach(collect);
  return sizes;
}

function isNoise(key, brands, sizeWords) {
  if (/^\d+(\.\d+)?$/.test(key)) return true;
  if (sizeWords.has(key)) return true;
  if (key.endsWith("s") && key.length > 2) {
    const singular = key.slice(0, -1);
    if (sizeWords.has(singular)) return true;
  }
  if (brands.has(key)) return true;
  return false;
}

function compressToMatch(clean, builtin, userMemory) {
  const normalized = clean.map((w) => ({ raw: w, key: normalizeItem(w) }));
  for (const { raw, key } of normalized) {
    const look = lookupProduct(key, builtin, userMemory);
    if (look.matched) {
      const prodName = normalizeItem(look.product.product || "");
      if (!prodName) continue;
      const others = normalized.filter((n) => n.raw !== raw);
      if (others.every((n) => prodName.includes(n.key))) return raw;
    }
  }
  return null;
}

// lines: string[] (raw input, one per line)
// builtin: products.json object
// userMemory: object keyed by normalized key
export function enrichItems(lines, builtin, userMemory) {
  const expanded = expandLines(lines, builtin, userMemory);
  const groups = detectDuplicates(expanded);
  const result = [];
  groups.forEach((g) => {
    const look = lookupProduct(g.key, builtin, userMemory);
    const base = {
      id: nextId(),
      input: g.originals[0] || g.key,
      normalized: g.key,
      quantity: g.count > 1 ? g.count : look.matched && look.product.defaultQty ? look.product.defaultQty : g.count,
      matched: look.matched,
      source: look.matched ? look.source : "unknown",
      fuzzy: !!look.fuzzy,
      product: look.matched ? look.product.product : "",
      preferredProduct: look.matched
        ? buildDisplayName(look.product.brand, look.product.product, look.product.size)
        : g.key,
      brand: look.matched ? look.product.brand : "",
      size: look.matched ? look.product.size : "",
      alternatives: look.matched ? look.product.alternatives || [] : [],
      category: look.matched ? look.product.category : "",
      editable: true,
    };
    result.push(base);
  });
  return sortItems(result);
}

function sortItems(items) {
  return items.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? 1 : -1;
    const cmp = (x, y) => x < y ? -1 : x > y ? 1 : 0;
    return (
      cmp((a.brand || "").toLowerCase(), (b.brand || "").toLowerCase()) ||
      cmp((a.product || "").toLowerCase(), (b.product || "").toLowerCase()) ||
      cmp((a.size || "").toLowerCase(), (b.size || "").toLowerCase())
    );
  });
}

// Re-run enrichment for one item after the user edits it.
export function reLookup(item, builtin, userMemory) {
  const key = normalizeItem(item.preferredProduct || item.input);
  const look = lookupProduct(key, builtin, userMemory);
  if (look.matched) {
    return {
      ...item,
      normalized: key,
      matched: true,
      source: look.source,
      fuzzy: !!look.fuzzy,
      product: look.product.product,
      preferredProduct: buildDisplayName(look.product.brand, look.product.product, look.product.size),
      brand: look.product.brand,
      size: look.product.size,
      alternatives: look.product.alternatives || [],
      category: look.product.category,
    };
  }
  return {
    ...item,
    normalized: key,
    matched: false,
    source: "unknown",
    preferredProduct: item.preferredProduct || item.input,
  };
}
