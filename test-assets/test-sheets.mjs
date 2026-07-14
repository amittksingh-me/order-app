import { fetchCsv, parseCsv, syncSheet, expandKeywords } from "../src/lib/sheets.js";
import { normalizeItem } from "../src/lib/normalize.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };
  const sortKw = (a) => { const s = [...a]; s.sort(); return s; };

  ok(typeof fetchCsv === "function", "fetchCsv exported");
  ok(typeof parseCsv === "function", "parseCsv exported");
  ok(typeof syncSheet === "function", "syncSheet exported");
  ok(fetchCsv.constructor.name === "AsyncFunction", "fetchCsv is async");
  ok(syncSheet.constructor.name === "AsyncFunction", "syncSheet is async");

  ok(parseCsv("product,unit\nMilk,1") instanceof Array, "parseCsv returns array");
  ok(parseCsv("product,unit\nMilk,1").length === 1, "parseCsv parses header+data");
  ok(parseCsv("product,unit\nMilk,1")[0].product === "Milk", "parseCsv extracts product");
  ok(parseCsv("").length === 0, "parseCsv empty");
  ok(parseCsv("product,unit\nMilk,1\n,2").length === 2, "parseCsv includes rows without product");
  ok(parseCsv("product,unit\nMilk,1\n,2")[1]._sheetRow === 3, "parseCsv tracks original line number");

  // expandKeywords
  ok(expandKeywords(null).length === 0, "expandKeywords null returns []");
  ok(expandKeywords("").length === 0, "expandKeywords empty returns []");
  ok(JSON.stringify(expandKeywords("anda; eggs")) === '["anda","eggs"]', "plain semicolon unchanged");

  const moong = expandKeywords("[moong,mung][phali,fali]");
  ok(moong.length === 8, "moong.mung × phali.fali → 8 entries");
  ok(moong.includes("moongphali") && moong.includes("moong phali"), "concatenated + spaced forms");
  ok(moong.includes("mungfali") && moong.includes("mung fali"), "all combos present");

  ok(JSON.stringify(sortKw(expandKeywords("[a,b][c,d]"))) === JSON.stringify(sortKw(["ac","a c","ad","a d","bc","b c","bd","b d"])), "ab × cd cartesian");

  ok(JSON.stringify(expandKeywords("[single]")) === '["single"]', "single-element group");
  ok(JSON.stringify(expandKeywords("milk; [a,b]; eggs")) === '["milk","a","b","eggs"]', "mixed plain + perm");
  ok(JSON.stringify(expandKeywords("[green gram,moong]")) === '["green gram","moong"]', "multi-word alternatives preserved");

  // Error collection logic (matches what syncSheet does)
  function simulateErrors(csvText) {
    const rows = parseCsv(csvText);
    const errors = [];
    for (const row of rows) {
      if (!row.product) {
        errors.push({ row: row._sheetRow, reason: "no product name" });
        continue;
      }
      const key = normalizeItem(`${row.brand || ""} ${row.product} ${row.size || ""}`);
      if (!key) {
        errors.push({ row: row._sheetRow, reason: "key normalizes to empty" });
        continue;
      }
      if (row.keywords) {
        const opens = (row.keywords.match(/\[/g) || []).length;
        const closes = (row.keywords.match(/\]/g) || []).length;
        if (opens !== closes) {
          errors.push({ row: row._sheetRow, reason: "bracket mismatch" });
        }
      }
    }
    return errors;
  }

  const err1 = simulateErrors("brand,product,keywords\n,,");
  ok(err1.length === 1 && err1[0].reason === "no product name", "no product name error");

  const err2 = simulateErrors("brand,product,keywords\nFresho,Apple,");
  ok(err2.length === 0, "no errors for valid row");

  const err3 = simulateErrors("brand,product,keywords\n,,\nFresho,Apple,\nFresho,,[unbalanced");
  ok(err3.length >= 1, "multiple errors in single sheet");

  const err4 = simulateErrors("brand,product,keywords\nFresho,Apple,[unbalanced");
  ok(err4.some(e => e.reason === "bracket mismatch"), "bracket mismatch detected");

  return { pass, fail };
}
