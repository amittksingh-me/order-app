import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = join(__dirname, "..", "src", "data", "products.json");

function stripPunctuation(s) {
  if (!s) return "";
  return String(s)
    .replace(/[.,/#!$%^&*;:{}=\-_~()`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanProducts() {
  const raw = JSON.parse(readFileSync(productsPath, "utf8"));
  const cleaned = {};

  for (const [key, entry] of Object.entries(raw)) {
    cleaned[key] = {
      ...entry,
      product: stripPunctuation(entry.product),
      brand: stripPunctuation(entry.brand),
    };
  }

  writeFileSync(productsPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");
  console.log(`Cleaned ${Object.keys(cleaned).length} products`);
}

cleanProducts();
