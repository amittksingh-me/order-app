import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichItems, reLookup } from "../src/lib/enrich.js";
import { formatShoppingList } from "../src/lib/format.js";
import products from "../src/data/products.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "manual-input");

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };
  const txtFiles = readdirSync(dir).filter((f) => f.endsWith(".txt"));

  for (const txt of txtFiles) {
    const base = txt.replace(/\.txt$/, "");
    const input = readFileSync(join(dir, txt), "utf8");
    const expected = JSON.parse(readFileSync(join(dir, `${base}.expected.json`), "utf8"));
    let userMemory = {};
    try {
      userMemory = JSON.parse(readFileSync(join(dir, `${base}.memory.json`), "utf8"));
    } catch {}
    const lines = input.split("\n");
    const items = enrichItems(lines, products, userMemory);
    const finalList = formatShoppingList(items);
    const normalized = items.map((i) => i.normalized);
    const matched = {};
    const source = {};
    items.forEach((i) => { matched[i.normalized] = i.matched; source[i.normalized] = i.source; });

    const errors = [];
    if (JSON.stringify(normalized) !== JSON.stringify(expected.normalized))
      errors.push(`normalized: got ${JSON.stringify(normalized)} expected ${JSON.stringify(expected.normalized)}`);
    for (const [k, v] of Object.entries(expected.matched)) {
      if (matched[k] !== v) errors.push(`matched[${k}]: got ${matched[k]} expected ${v}`);
    }
    if (expected.source) {
      for (const [k, v] of Object.entries(expected.source)) {
        if (source[k] !== v) errors.push(`source[${k}]: got ${source[k]} expected ${v}`);
      }
    }
    if (finalList !== expected.finalList)
      errors.push(`finalList mismatch:\n--- got ---\n${finalList}\n--- expected ---\n${expected.finalList}`);

    if (errors.length === 0) { pass++; console.log(`✓ ${base}`); }
    else { fail++; console.log(`✗ ${base}`); errors.forEach((e) => console.log(`   ${e}`)); }
  }

  // reLookup edge cases (use "bread" — keyword for "Breakfast Slice Bread")
  const unit = { input: "bread", normalized: "bread", matched: true, source: "builtin", fuzzy: false };

  let r = reLookup(unit, products, {});
  ok(r.matched, "reLookup keeps match");
  ok(r.product === "Breakfast Slice Bread", "reLookup fills product");

  r = reLookup({ ...unit, input: "xyzzy" }, products, {});
  ok(r && r.matched === false, "reLookup unknown item");

  // reLookup with preferredProduct uses that as lookup key
  r = reLookup({ ...unit, preferredProduct: "Bread Slice", input: "xyzzy" }, products, {});
  ok(r.matched, "reLookup matches via preferredProduct");
  ok(r.product === "Breakfast Slice Bread", "reLookup uses preferredProduct");

  return { pass, fail };
}
