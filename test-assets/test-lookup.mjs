import { lookupProduct, prefixMatchUserMemory } from "../src/lib/lookup.js";
import products from "../src/data/products.json" with { type: "json" };

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  const userMemory = {
    "milk": { product: "My Milk", brand: "Local", size: "1 L", keywords: ["milk", "doodh"], category: "Dairy" }
  };

  ok(lookupProduct("milk", products, userMemory).matched && lookupProduct("milk", products, userMemory).source === "user-memory", "user memory exact match");
  ok(lookupProduct("doodh", products, userMemory).matched, "user memory keyword match");
  ok(lookupProduct("sugar pure hygienic fine grain natural sulphur free", products, {}).matched, "builtin exact match");
  ok(lookupProduct("sugar", products, {}).matched, "builtin keyword match");
  ok(lookupProduct("chini", products, {}).matched, "builtin keyword chini");
  ok(lookupProduct("tomatoo", products, {}).matched, "fuzzy match tomatoo");
  ok(lookupProduct("tomato", products, {}).matched, "keyword match tomato");
  ok(!lookupProduct("xyzzy", products, {}).matched, "unknown product");

  ok(lookupProduct("milk", products, { "milk": { product: "My Milk", brand: "Local", size: "1 L", keywords: ["milk"] } }).source === "user-memory", "user memory wins over builtin");

  ok(prefixMatchUserMemory("milk", { "milk powder": { product: "Milk Powder" } }) !== null, "prefix match found");
  ok(prefixMatchUserMemory("milkr", { "milk powder": { product: "Milk Powder" } }) === null, "prefix match not found");
  ok(prefixMatchUserMemory("", { "milk": { product: "Milk" } }) === null, "prefix match empty key");

  return { pass, fail };
}
