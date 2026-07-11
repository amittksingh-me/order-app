// Enrichment engine: combines normalize, duplicate detection and lookup
// into the internal data model used by the UI.

import { normalizeItem } from "./normalize.js";
import { detectDuplicates } from "./duplicate.js";
import { lookupProduct } from "./lookup.js";
import { buildDisplayName } from "./product.js";

let counter = 0;
function nextId() {
  counter += 1;
  return `item-${counter}-${Date.now()}`;
}

// lines: string[] (raw input, one per line)
// builtin: products.json object
// userMemory: object keyed by normalized key
export function enrichItems(lines, builtin, userMemory) {
  const groups = detectDuplicates(lines);
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
  return result;
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
