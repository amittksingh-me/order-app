export function buildDisplayName(brand, product, size) {
  return [brand, product, size].filter(Boolean).join(" ").trim();
}

export function mergeDatabase(builtin, userMemory) {
  const out = {};
  for (const [key, v] of Object.entries(builtin)) {
    const ov = userMemory[key];
    if (ov) {
      const merged = { ...v, ...ov };
      merged.keywords = ov.keywords || v.keywords || [ov.product || v.product];
      out[key] = merged;
    } else {
      out[key] = v;
    }
  }
  for (const [key, v] of Object.entries(userMemory)) {
    if (!out[key]) {
      out[key] = { ...v, keywords: v.keywords || [v.product] };
    }
  }
  return out;
}
