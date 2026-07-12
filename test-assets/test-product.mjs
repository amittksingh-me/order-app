import { buildDisplayName, mergeDatabase } from "../src/lib/product.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  ok(buildDisplayName("Brand", "Product", "Size") === "Brand Product Size", "full");
  ok(buildDisplayName("", "Product", "Size") === "Product Size", "no brand");
  ok(buildDisplayName("Brand", "Product", "") === "Brand Product", "no size");
  ok(buildDisplayName("", "Product", "") === "Product", "product only");
  ok(buildDisplayName("", "", "") === "", "all empty");

  const builtin = {
    "milk": { product: "Milk", brand: "Brand", size: "1 L", keywords: ["milk"], category: "Dairy" }
  };
  const memory = { "milk": { product: "My Milk", brand: "Local" } };
  const merged = mergeDatabase(builtin, memory);
  ok(merged["milk"].product === "My Milk", "memory overrides product");
  ok(merged["milk"].brand === "Local", "memory overrides brand");
  ok(merged["milk"].keywords.length > 0, "keywords preserved after merge");
  ok(merged["milk"].size === "1 L", "builtin fields preserved when not overridden");

  const memory2 = { "custom": { product: "Custom", brand: "X", size: "1", keywords: ["custom"] } };
  const merged2 = mergeDatabase(builtin, memory2);
  ok(merged2["custom"].product === "Custom", "memory-only key added");

  return { pass, fail };
}
