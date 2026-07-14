import { normalizeItem } from "./normalize.js";
import { putMemory, getAllMemory } from "./memory.js";

function cartesian(sets) {
  return sets.reduce(
    (acc, set) => acc.flatMap(a => set.map(b => [...a, b])),
    [[]]
  );
}

export function expandKeywords(kw) {
  if (!kw) return [];
  const result = [];
  for (const token of kw.split(";").map(t => t.trim()).filter(Boolean)) {
    const groups = [...token.matchAll(/\[([^\]]+)\]/g)];
    if (groups.length === 0) { result.push(token); continue; }
    const altSets = groups.map(g =>
      g[1].split(",").map(a => a.trim()).filter(Boolean)
    );
    for (const combo of cartesian(altSets)) {
      result.push(combo.join(""));
      result.push(combo.join(" "));
    }
  }
  return [...new Set(result)];
}

export async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function parseCsv(text) {
  const all = text.trim();
  if (!all) return [];

  // Split into lines, handling quoted values that span multiple lines
  const lines = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < all.length; i++) {
    const ch = all[i];
    if (ch === '"') {
      if (inQ && i + 1 < all.length && all[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      cur += ch;
    } else if (ch === "\n" && !inQ) {
      lines.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);

  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values.length) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase()] = (values[idx] || "").replace(/^"|"$/g, "").trim();
    });
    row._sheetRow = i + 1; // original CSV line number (1-indexed, header = row 1)
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
          cur += '"';
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQ = true;
        cur += '"';
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
  const errors = [];

  let count = 0;
  for (const row of rows) {
    if (!row.product) {
      errors.push({ row: row._sheetRow, reason: "no product name" });
      continue;
    }
    const key = normalizeItem(
      `${row.brand || ""} ${row.product} ${row.size || ""}`
    );
    if (!key) {
      errors.push({ row: row._sheetRow, reason: "key normalizes to empty" });
      continue;
    }
    let keywords;
    try {
      keywords = row.keywords ? expandKeywords(row.keywords) : [];
    } catch {
      errors.push({ row: row._sheetRow, reason: "keyword parse error" });
      continue;
    }
    // Check bracket balance even when expandKeywords succeeds (silently
    // treats unbalanced brackets as literals, which is never intended).
    if (row.keywords) {
      const opens = (row.keywords.match(/\[/g) || []).length;
      const closes = (row.keywords.match(/\]/g) || []).length;
      if (opens !== closes) {
        errors.push({ row: row._sheetRow, reason: "bracket mismatch" });
      }
    }

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
  return { count, memory, errors: errors.length > 0 ? errors : undefined };
}
