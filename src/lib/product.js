// Builds the enriched display name from its structured parts.
// Order: brand + product + size  (e.g. "BB Royal Organic Bay Leaf 50 g").
export function buildDisplayName(brand, product, size) {
  return [brand, product, size].filter(Boolean).join(" ").trim();
}
