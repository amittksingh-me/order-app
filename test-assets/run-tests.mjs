// Regression test runner for the enrichment engine.
// Usage: node test-assets/run-tests.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichItems } from "../src/lib/enrich.js";
import { formatShoppingList } from "../src/lib/format.js";
import products from "../src/data/products.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "manual-input");

const txtFiles = readdirSync(dir).filter((f) => f.endsWith(".txt"));
let pass = 0;
let fail = 0;

for (const txt of txtFiles) {
  const base = txt.replace(/\.txt$/, "");
  const input = readFileSync(join(dir, txt), "utf8");
  const expected = JSON.parse(readFileSync(join(dir, `${base}.expected.json`), "utf8"));
  const memoryPath = join(dir, `${base}.memory.json`);
  let userMemory = {};
  try {
    userMemory = JSON.parse(readFileSync(memoryPath, "utf8"));
  } catch {
    userMemory = {};
  }

  const lines = input.split("\n");
  const items = enrichItems(lines, products, userMemory);
  const finalList = formatShoppingList(items);
  const normalized = items.map((i) => i.normalized);
  const matched = {};
  const source = {};
  items.forEach((i) => {
    matched[i.normalized] = i.matched;
    source[i.normalized] = i.source;
  });

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

  if (errors.length === 0) {
    pass += 1;
    console.log(`✓ ${base}`);
  } else {
    fail += 1;
    console.log(`✗ ${base}`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
