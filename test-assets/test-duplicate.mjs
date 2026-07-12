import { detectDuplicates } from "../src/lib/duplicate.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };
  const sort = (a) => a.sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0);

  let r = sort(detectDuplicates(["milk", "milk"]));
  ok(r.length === 1 && r[0].key === "milk" && r[0].count === 2, "same key merges");

  r = sort(detectDuplicates(["milk", "Milk"]));
  ok(r.length === 1 && r[0].count === 2, "case insensitive merge");

  r = sort(detectDuplicates(["milk", "bread"]));
  ok(r.length === 2, "different keys stay separate");

  r = sort(detectDuplicates(["milk", "", "bread"]));
  ok(r.length === 2, "empty line skipped");

  r = sort(detectDuplicates(["milk", "milk", "milk"]));
  ok(r.length === 1 && r[0].count === 3, "three same merge");

  return { pass, fail };
}
