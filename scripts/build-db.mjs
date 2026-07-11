// Builds src/data/products.json from BigBasket order exports in order_jsons/.
// Run: node scripts/build-db.mjs
//
// Strategy (per user): replace existing DB entirely; defaultQty = purchased qty.
// On key collisions (same product desc across orders) the most recent order wins,
// and previously-seen variants are collected as alternatives.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ordersDir = join(root, "order_jsons");
const outPath = join(root, "src", "data", "products.json");

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // crude singular
    .replace(/ies$/, "y")
    .replace(/([^s])s$/, "$1");
}

const files = readdirSync(ordersDir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("."))
  .sort(); // 1.json < 2.json ... so later orders overwrite earlier

const db = {}; // key -> entry

for (const file of files) {
  const order = JSON.parse(readFileSync(join(ordersDir, file), "utf8"));
  const categories = order?.order?.items || [];
  for (const cat of categories) {
    for (const li of cat.line_items || []) {
      const desc = li.desc;
      const invoiceDesc = (li.invoice_desc || "").trim();
      const brand = li.brand || "";
      const size = li.weight || "";
      const qty = Number(li.quantity) || 1;
      const category = cat.tlc_name || li.tlc_n || "";

      const key = normalizeKey(desc);
      if (!key) continue;

      const product = desc || invoiceDesc;
      const defaultQty = Math.max(1, Math.round(qty));
      const firstWord = key.split(" ")[0];
      const kwSet = new Set([key, normalizeKey(`${brand} ${desc}`)]);
      if (firstWord && firstWord !== key) kwSet.add(firstWord);

      if (db[key]) {
        // keep previous variant as an alternative
        const alt = db[key].product;
        if (alt && alt !== product && !db[key].alternatives.includes(alt)) {
          db[key].alternatives.unshift(alt);
        }
        // overwrite with more recent occurrence
        db[key] = {
          product,
          brand,
          size,
          defaultQty,
          alternatives: db[key].alternatives.slice(0, 4),
          keywords: Array.from(kwSet),
          category,
        };
      } else {
        db[key] = {
          product,
          brand,
          size,
          defaultQty,
          alternatives: [],
          keywords: Array.from(kwSet),
          category,
        };
      }
    }
  }
}

// pretty print, keys in alphabetical order for stable diffs
const sorted = {};
Object.keys(db)
  .sort()
  .forEach((k) => (sorted[k] = db[k]));

writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
console.log(`Wrote ${Object.keys(sorted).length} products to ${outPath}`);
