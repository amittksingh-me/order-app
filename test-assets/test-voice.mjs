import { parseTranscript } from "../src/lib/voice.js";
import products from "../src/data/products.json" with { type: "json" };

const userMemory = {
  "nandini shubham milk 500 ml bakery cakes dairy": {
    product: "Shubham Milk", brand: "Nandini", size: "500 ml",
    defaultQty: 1, category: "bakery, cakes & dairy",
    keywords: ["milk", "doodh", "dudh"],
  },
  "fresho farm eggs 6 pcs eggs meat fish": {
    product: "Farm Eggs", brand: "Fresho", size: "6 pcs",
    defaultQty: 1, category: "eggs, meat & fish",
    keywords: ["anda", "andaa", "eggs"],
  },
  "borges extra virgin olive oil 250 ml gourmet world food": {
    product: "Extra Virgin Olive Oil", brand: "Borges", size: "250 ml",
    defaultQty: 1, category: "gourmet & world food",
    keywords: ["olive oil"],
  },
  "dhara kachi ghani mustard oil 5 l foodgrains oil masala": {
    product: "Kachi Ghani Mustard Oil", brand: "Dhara", size: "5 L",
    defaultQty: 1, category: "Foodgrains, Oil & Masala",
    keywords: ["mustard oil", "sarson oil", "sarso tel", "kachi ghani oil", "oil"],
  },
};

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  const check = (input, expected, name) => {
    const result = parseTranscript(input, products, userMemory);
    ok(JSON.stringify(result) === JSON.stringify(expected), name);
  };

  check("dudh andaa paneer olive oil", ["dudh", "andaa", "paneer", "olive oil"], "various items");
  check("olive oil", ["olive oil"], "multi-word phrase match");
  check("oil", ["oil"], "single word match");
  check("green peas", ["green peas"], "unmatched multi-word pass-through");
  check("milk eggs bread", ["milk", "eggs", "bread"], "multiple items");
  check("", [], "empty input");
  check("and the a", [], "only filler words");
  check("x", [], "single char filtered");

  // Edge cases for parseTranscript
  check("   ", [], "whitespace only");
  check("a b c d e", [], "only filler and single char");
  check("hello", ["hello"], "single unmatched word");
  check("bread butter", ["bread", "butter"], "two matched single words");
  check("mustard oil", ["mustard oil"], "multi-word known in user memory via keywords");
  check("milk and oil", ["milk", "oil"], "filler removed between two single-word matches");
  check("milk bread paneer butter", ["milk", "bread", "paneer", "butter"], "four words no fillers");

  return { pass, fail };
}
