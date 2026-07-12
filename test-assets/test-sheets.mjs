import { fetchCsv, parseCsv, syncSheet } from "../src/lib/sheets.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  ok(typeof fetchCsv === "function", "fetchCsv exported");
  ok(typeof parseCsv === "function", "parseCsv exported");
  ok(typeof syncSheet === "function", "syncSheet exported");
  ok(fetchCsv.constructor.name === "AsyncFunction", "fetchCsv is async");
  ok(syncSheet.constructor.name === "AsyncFunction", "syncSheet is async");

  ok(parseCsv("product,unit\nMilk,1") instanceof Array, "parseCsv returns array");
  ok(parseCsv("product,unit\nMilk,1").length === 1, "parseCsv parses header+data");
  ok(parseCsv("product,unit\nMilk,1")[0].product === "Milk", "parseCsv extracts product");
  ok(parseCsv("").length === 0, "parseCsv empty");

  return { pass, fail };
}
