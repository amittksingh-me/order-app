import { normalizeItem } from "./normalize.js";
import { putMemory, getAllMemory } from "./memory.js";

export async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values.length) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase()] = (values[idx] || "").trim();
    });
    if (!row.product) continue;
    row.defaultQty = parseInt(row.defaultQty || row.qty || "1", 10) || 1;
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQ = true;
      } else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result;
}

export async function syncSheet(csvUrl) {
  const text = await fetchCsv(csvUrl);
  const rows = parseCsv(text);

  let count = 0;
  for (const row of rows) {
    const key = normalizeItem(
      `${row.brand || ""} ${row.product} ${row.size || ""} ${row.category || ""}`
    );
    if (!key) continue;
    const keywords = row.keywords
      ? row.keywords.split(";").map((k) => k.trim()).filter(Boolean)
      : [];

    const record = {
      product: row.product,
      brand: row.brand || "",
      size: row.size || "",
      defaultQty: row.defaultQty || 1,
      category: row.category || "",
      keywords,
    };
    await putMemory(key, record);
    count++;
  }

  const memory = await getAllMemory();
  return { count, memory };
}
