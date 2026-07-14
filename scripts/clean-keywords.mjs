// Download the Google Sheet CSV, apply permutation-syntax cleanups to keywords,
// and write the result to products.csv (root level, gitignored).
// Run: node scripts/clean-keywords.mjs

import { writeFileSync } from "node:fs";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeqQBp7FYdB6BzQ20Y3Q-rFDuQemV50OpQIetw7LDI0hVBM4NEGYwyLm58s77UEWyp89ygXRixzVTI/pub?gid=0&single=true&output=csv";

// Keyword patterns to compress into permutation syntax.
// convert(keywords[]) => newKeywordString or null to keep unchanged.
const RULES = [
  { brandMatch: "BB Royal", productMatch: "Fried Bengal Gram Split", kw: "[bhuna,roasted,fried][chana,gram,channa]" },
  { brandMatch: "Fresho", productMatch: "Green Chilli Small", kw: "[green,hari,small][chilli,chili,mirch,mirchi]; mirchi" },
  { brandMatch: "Safe Harvest", productMatch: "Roasted Sooji", kw: "[sooji,suji,rava,rawa]; [roasted][sooji,suji,rava,rawa]" },
  { brandMatch: "Tata Sampann", productMatch: "Masoor Dal", kw: "[masoor,masur][dal,daal]" },
  { brandMatch: "Tata Sampann", productMatch: "Unpolished Chana Dal", kw: "[chana,channa][dal,daal]" },
  { brandMatch: "Tata Sampann", productMatch: "Unpolished Toor Dal", kw: "[toor,tur,arhar,tuvar][dal,daal]; dal; daal" },
  { brandMatch: "Nandini", productMatch: "Shubham Milk", kw: "milk; doodh; dudh" },
  { brandMatch: "Everest", productMatch: "Coriander Powder", kw: "dhania powder; coriander powder; dhaniya powder" },
  { brandMatch: "bb Popular", productMatch: "Black Pepper Whole", kw: "black pepper; pepper; kali mirch; kaali mirch; whole pepper; sabut kali mirch" },
  { brandMatch: "Maggi", productMatch: "Rich Tomato Ketchup", kw: "sauce; ketchup; tomato sauce" },
  { brandMatch: "Parachute", productMatch: "Pure Coconut Oil", kw: "[coconut,nariyal,narial] [oil,tel]" },
  { brandMatch: "Vijay Gold", productMatch: "Sabudana", kw: "sabudana; sago; tapioca pearls" },
];

function csvEscape(val) {
  if (!val) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  const { parseCsv } = await import("../src/lib/sheets.js");
  const rows = parseCsv(text);

  const header = "brand,product,size,quantity,category,keywords";
  const lines = [header];
  let changed = 0;

  for (const row of rows) {
    let kw = row.keywords || "";

    for (const rule of RULES) {
      if (
        row.brand && row.brand.toLowerCase() === rule.brandMatch.toLowerCase() &&
        row.product && row.product.toLowerCase() === rule.productMatch.toLowerCase()
      ) {
        kw = rule.kw;
        changed++;
        break;
      }
    }

    const out = [
      csvEscape(row.brand || ""),
      csvEscape(row.product),
      csvEscape(row.size || ""),
      row.qty || row.defaultQty || "1",
      csvEscape(row.category || ""),
      csvEscape(kw),
    ];
    lines.push(out.join(","));
  }

  const output = lines.join("\n") + "\n";
  writeFileSync("products.csv", output);
  console.log(`Wrote products.csv (${rows.length} rows, ${changed} keyword rows updated)`);
  console.log("Review the file then upload to Google Sheet.");
}

main().catch(console.error);
