import { normalizeText, toSingular, correctSpelling, normalizeItem } from "../src/lib/normalize.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  ok(normalizeText("MILK") === "milk", "lowercase");
  ok(normalizeText("café") === "cafe", "strip diacritics");
  ok(normalizeText("hello, world!") === "hello world", "punctuation to space");
  ok(normalizeText("  spaced  ") === "spaced", "collapse whitespace");
  ok(normalizeText("") === "", "empty string");

  ok(toSingular("strawberries") === "strawberry", "ies to y");
  ok(toSingular("glasses") === "glass", "ses to s");
  ok(toSingular("eggs") === "egg", "trailing s removed");
  ok(toSingular("rice") === "rice", "no change");
  ok(toSingular("bus") === "bus", "ss preserved");

  ok(correctSpelling("milkk") === "milk", "milkk to milk");
  ok(correctSpelling("bred") === "bread", "bred to bread");
  ok(correctSpelling("tomoto") === "tomato", "tomoto to tomato");
  ok(correctSpelling("normal") === "normal", "no correction needed");

  ok(normalizeItem("MILK") === "milk", "full pipeline milk");
  ok(normalizeItem("Strawberries") === "strawberry", "full pipeline strawberries");
  ok(normalizeItem("milkk") === "milk", "full pipeline milkk");

  return { pass, fail };
}
