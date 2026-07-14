import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichItems, reLookup } from "../src/lib/enrich.js";
import { formatShoppingList } from "../src/lib/format.js";
import { normalizeItem } from "../src/lib/normalize.js";
import { parseCsv, expandKeywords } from "../src/lib/sheets.js";
import products from "../src/data/products.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "manual-input");

function buildMemoryFromCsv() {
  const text = readFileSync(join(__dirname, "csv", "products.csv"), "utf8");
  const rows = parseCsv(text);
  const mem = {};
  for (const row of rows) {
    if (!row.product) continue;
    const key = normalizeItem(`${row.brand || ""} ${row.product} ${row.size || ""}`);
    if (!key) continue;
    const keywords = row.keywords ? expandKeywords(row.keywords) : [];
    mem[key] = {
      product: row.product,
      brand: row.brand || "",
      size: row.size || "",
      defaultQty: row.defaultQty || 1,
      category: row.category || "",
      keywords,
    };
  }
  return mem;
}

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

  // --- Inline paste-cycle tests using CSV-built memory ---
  const csvMemory = buildMemoryFromCsv();

  // Grocery paste test: single-keyword items
  {
    const lines = ["milk", "eggs", "butter", "bread"];
    const items = enrichItems(lines, products, csvMemory);
    const normalized = items.map((i) => i.normalized);
    const matched = {};
    const source = {};
    items.forEach((i) => { matched[i.normalized] = i.matched; source[i.normalized] = i.source; });
    const finalList = formatShoppingList(items);

    const expectedNorm = [
      "amul pasteurised butter tub",
      "britannia breakfast slice bread",
      "fresho farm egg",
      "nandini shubham milk",
    ];
    ok(JSON.stringify(normalized) === JSON.stringify(expectedNorm), "grocery-paste: normalized");
    ok(items.every((i) => i.matched === true), "grocery-paste: all matched");
    ok(items.every((i) => i.source === "user-memory"), "grocery-paste: all user-memory source");
    const expectedFinal = "Amul Pasteurised Butter Tub 200 g, Britannia Breakfast Slice Bread 450 g, Fresho Farm Eggs 6 pcs, Nandini Shubham Milk 500 ml";
    ok(finalList === expectedFinal, "grocery-paste: finalList");
  }

  // Cleaning paste test: full product names from Cleaning & Household category
  {
    const lines = [
      "Lizol Disinfectant Surface Floor Cleaner Liquid Citrus 5 L",
      "Scotch Brite Premium Kitchen Towel 3 pcs",
      "Colgate Kids Toothbrush 1 pc",
    ];
    const items = enrichItems(lines, products, csvMemory);
    const normalized = items.map((i) => i.normalized);
    const matched = {};
    const source = {};
    items.forEach((i) => { matched[i.normalized] = i.matched; source[i.normalized] = i.source; });
    const finalList = formatShoppingList(items);

    const expectedNorm = [
      "colgate kid toothbrush",
      "lizol disinfectant surface floor cleaner liquid citrus",
      "scotch brite premium kitchen towel",
    ];
    ok(JSON.stringify(normalized) === JSON.stringify(expectedNorm), "cleaning-paste: normalized");
    ok(items.every((i) => i.matched === true), "cleaning-paste: all matched");
    const expectedFinal = "Colgate Kids Toothbrush 1 pc, Lizol Disinfectant Surface Floor Cleaner Liquid Citrus 5 L, Scotch Brite Premium Kitchen Towel 3 pcs";
    ok(finalList === expectedFinal, "cleaning-paste: finalList");
  }

  // Full paste-cycle: re-pasting cycle 1 output produces the same result
  {
    const c1Lines = [
      "Doodh Anda Paneer Noodles Maggi masala pasta Jeera Kali Mirch long Butter bread Dosa batter",
      "Haldi Dhaniya powder mills powder Cornflour Maida Aata Chawal Tod Daal bonvita",
    ];
    const c2Text = "mills, cornflour, tod, bonvita, Aashirvaad Whole Wheat Atta 5 kg, Amul Pasteurised Butter Tub 200 g, bb Popular Black Pepper Whole 50 g, BB Royal Cumin Jeera Whole 200 g, Borges Durum Wheat Macaroni Pasta 350 g, Britannia Breakfast Slice Bread 450 g, Ching's Secret Veg Hakka Noodles 140 g, Everest Coriander Powder 200 g, Everest Turmeric Powder 200 g, Fresho Farm Eggs 6 pcs, iD Idly Dosa Batter 1 kg, India Gate Gold Standard Classic Basmati Rice 5 kg, Maggi Masala Ae Magic Mixed Masala Powder 72 g, Milky Mist Paneer 200 g, Nandini Shubham Milk 500 ml, Organic Tattva Maida 500 g, Tata Sampann Clove Whole 50 g, Tata Sampann Unpolished Toor Dal 2 kg";

    const c1 = enrichItems(c1Lines, products, csvMemory);
    const c2 = enrichItems(c2Text.split(", "), products, csvMemory);

    ok(
      JSON.stringify(c1.map((i) => i.normalized)) === JSON.stringify(c2.map((i) => i.normalized)),
      "paste-cycle-roundtrip: normalized match"
    );
    ok(formatShoppingList(c1) === formatShoppingList(c2), "paste-cycle-roundtrip: finalList match");
    ok(c1.length === 22, "paste-cycle-roundtrip: 22 items");
    ok(c1.filter((i) => i.matched).length === 18, "paste-cycle-roundtrip: 18 matched");
    const unknownInputs = c1.filter((i) => !i.matched).map((i) => i.input);
    ok(
      ["mills", "cornflour", "tod", "bonvita"].every((u) => unknownInputs.includes(u)),
      "paste-cycle-roundtrip: 4 known unknowns"
    );
  }

  // Unknown item passes through with original text preserved
  {
    const lines = ["random thing 123"];
    const items = enrichItems(lines, products, csvMemory);
    ok(items.length === 1, "unknown-preserve: one item");
    ok(items[0].input === "random thing 123", "unknown-preserve: input preserved");
    ok(items[0].matched === false, "unknown-preserve: unmatched");
  }

  // Brand-word lines are filtered out as noise (words that don't prefix
  // any CSV key like 'popular', 'royal', 'mist')
  {
    const lines = ["popular", "royal"];
    const items = enrichItems(lines, products, csvMemory);
    ok(items.length === 0, "brand-noise: filtered out");
  }

  // Unit-only lines are filtered out (empty after normalization)
  {
    const lines = ["1 kg", "500 ml"];
    const items = enrichItems(lines, products, csvMemory);
    ok(items.length === 0, "unit-only: filtered out");
  }

  // Mixed known+unknown preserves both
  {
    const lines = ["milk", "xyzzy"];
    const items = enrichItems(lines, products, csvMemory);
    ok(items.length === 2, "mixed-known-unknown: 2 items");
    const milkItem = items.find((i) => i.input === "milk");
    const xyzzyItem = items.find((i) => i.input === "xyzzy");
    ok(milkItem && milkItem.matched, "mixed-known-unknown: milk matched");
    ok(xyzzyItem && !xyzzyItem.matched, "mixed-known-unknown: xyzzy unmatched");
  }

  // Multi-word line where some tokens match and some don't.
  // Exercises expandLines path where parseTranscript splits a line and
  // matched.length > 0 pushes all cleaned tokens as individual lines.
  {
    const mixedMemory = {
      milk: { product: "Milk", brand: "", size: "", defaultQty: 1, category: "", keywords: [] },
    };
    const lines = ["milk foobar"];
    const items = enrichItems(lines, {}, mixedMemory);
    ok(items.length === 2, "mixed-match-split: 2 items from line");
    const matched = items.find((i) => i.matched);
    const unknown = items.find((i) => !i.matched);
    ok(matched && matched.input === "milk", "mixed-match-split: milk matched");
    ok(unknown && unknown.input === "foobar", "mixed-match-split: foobar unknown");
  }

  // Multi-word line where no tokens match: original line preserved as-is.
  {
    const items = enrichItems(["foo bar"], {}, {});
    ok(items.length === 1, "mixed-match-none: 1 item from line");
    ok(items[0].input === "foo bar", "mixed-match-none: original line preserved");
    ok(!items[0].matched, "mixed-match-none: unmatched");
  }

  // Permutation keyword match: user-memory entry with [moong,mung][phali,fali]
  // should resolve all 3 variants to the same product (dedup merges them into 1)
  {
    const permMemory = {
      "test moongphali": {
        product: "Test Moongphali",
        brand: "",
        size: "1 kg",
        defaultQty: 1,
        category: "",
        keywords: ["test", "moongphali", "moong phali", "mungphali", "mung phali", "moongfali", "moong fali", "mungfali", "mung fali"],
      },
    };
    const lines = ["moongphali", "mung phali", "moong fali", "unknown thing"];
    const items = enrichItems(lines, products, permMemory);
    ok(items.length === 2, "perm-keywords: 2 items (dedup merged 3 matched into 1)");
    const matched = items.filter(i => i.matched);
    ok(matched.length === 1, "perm-keywords: 1 matched product");
    ok(matched[0].input === "moongphali", "perm-keywords: first variant preserved as input");
    const unknown = items.find(i => i.input === "unknown thing");
    ok(unknown && !unknown.matched, "perm-keywords: unknown unmatched");
  }

  return { pass, fail };
}
