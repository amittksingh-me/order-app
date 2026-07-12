import { formatShoppingList } from "../src/lib/format.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  ok(formatShoppingList([{ preferredProduct: "Milk" }, { preferredProduct: "Bread" }]) === "Milk, Bread", "basic join");
  ok(formatShoppingList([]) === "", "empty list");
  ok(formatShoppingList([{ preferredProduct: "Milk" }, { input: "unknown item", preferredProduct: "" }]) === "Milk, unknown item", "empty preferred falls back to input");
  ok(formatShoppingList([{ preferredProduct: "" }]) === "", "single empty filters out");

  return { pass, fail };
}
