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

  // stripUnits — numbers with units are removed
  ok(normalizeItem("Lizol 5 L") === "lizol", "strip 5 L");
  ok(normalizeItem("Surf Excel 4 kg Refill Pouch") === "surf excel refill pouch", "strip 4 kg");
  ok(normalizeItem("Eggs 6 pcs") === "egg", "strip 6 pcs");
  ok(normalizeItem("Milk 500 ml") === "milk", "strip 500 ml");
  ok(normalizeItem("Rusk 291.2 g") === "rusk", "strip decimal unit 291.2 g");
  ok(normalizeItem("Rusk 291 2 g") === "rusk", "strip decimal-as-space unit 291 2 g");
  ok(normalizeItem("Handwash 1350 ml Pouch") === "handwash pouch", "strip 1350 ml with trailing word");
  ok(normalizeItem("Parle Elaichi Rusk 291.2 g") === "parle elaichi rusk", "full product with decimal unit");
  ok(normalizeItem("Product 1 kg rice") === "product rice", "strip unit in compound");
  ok(normalizeItem("Product 1.5 kg") === "product", "strip decimal kg");
  ok(normalizeItem("just some text") === "just some text", "preserve text without units");
  ok(normalizeItem("something 100") === "someth 100", "preserve bare number (something is >6, still strips ing)");
  ok(normalizeItem("Product 1 l") === "product", "strip 1 l");

  // ing→ stripping (per-word, only for len > 6 + doubled consonant undoubling)
  ok(normalizeItem("cleaning liquid") === "clean liquid", "ing: cleaning -> clean");
  ok(normalizeItem("packing bag") === "pack bag", "ing: packing -> pack");
  ok(normalizeItem("washing machine") === "wash machine", "ing: washing -> wash (no double)");
  ok(normalizeItem("running water") === "run water", "ing: running -> run (doubled n undoubled)");
  ok(normalizeItem("shopping list") === "shop list", "ing: shopping -> shop (doubled p undoubled)");
  ok(normalizeItem("clubbing gear") === "club gear", "ing: clubbing -> club (doubled b undoubled)");
  ok(toSingular("cleaning liquid") === "clean liquid", "toSingular per-word ing");
  ok(toSingular("king") === "king", "ing blocked for king (len <= 6)");
  ok(toSingular("thing") === "thing", "ing blocked for thing (len <= 6)");
  ok(toSingular("ring") === "ring", "ing blocked for ring (len <= 6)");
  ok(toSingular("string") === "string", "ing blocked for string (len 6, noun)");
  ok(toSingular("spring") === "spring", "ing blocked for spring (len 6, noun)");
  ok(toSingular("flying") === "flying", "ing blocked for flying (len 6)");

  // ing + unit combo
  ok(normalizeItem("cleaning liquid 500 ml") === "clean liquid", "ing + unit combo");

  // Additional edge cases
  ok(normalizeItem("cheese 8 oz") === "cheese", "strip oz");
  ok(normalizeItem("meat 2 pound") === "meat", "strip pound");
  ok(normalizeItem("butter 1 pack") === "butter", "strip pack");
  ok(normalizeItem("1 kg") === "", "strip unit-only input results in empty");
  ok(toSingular("us") === "us", "preserve 'us' (length <= 3 unchanged)");
  ok(normalizeItem("") === "", "empty input stays empty");

  return { pass, fail };
}
