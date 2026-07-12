// Regression test runner for the enrichment engine.
// Usage: node test-assets/run-tests.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichItems } from "../src/lib/enrich.js";
import { formatShoppingList } from "../src/lib/format.js";
import { parseTranscript, processSpeechResults } from "../src/lib/voice.js";
import products from "../src/data/products.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "manual-input");

const txtFiles = readdirSync(dir).filter((f) => f.endsWith(".txt"));
let pass = 0;
let fail = 0;

for (const txt of txtFiles) {
  const base = txt.replace(/\.txt$/, "");
  const input = readFileSync(join(dir, txt), "utf8");
  const expected = JSON.parse(readFileSync(join(dir, `${base}.expected.json`), "utf8"));
  const memoryPath = join(dir, `${base}.memory.json`);
  let userMemory = {};
  try {
    userMemory = JSON.parse(readFileSync(memoryPath, "utf8"));
  } catch {
    userMemory = {};
  }

  const lines = input.split("\n");
  const items = enrichItems(lines, products, userMemory);
  const finalList = formatShoppingList(items);
  const normalized = items.map((i) => i.normalized);
  const matched = {};
  const source = {};
  items.forEach((i) => {
    matched[i.normalized] = i.matched;
    source[i.normalized] = i.source;
  });

  const errors = [];
  if (JSON.stringify(normalized) !== JSON.stringify(expected.normalized))
    errors.push(`normalized: got ${JSON.stringify(normalized)} expected ${JSON.stringify(expected.normalized)}`);
  for (const [k, v] of Object.entries(expected.matched)) {
    if (matched[k] !== v) errors.push(`matched[${k}]: got ${matched[k]} expected ${v}`);
  }
  if (expected.source) {
    for (const [k, v] of Object.entries(expected.source)) {
      if (source[k] !== v) errors.push(`source[${k}]: got ${source[k]} expected ${v}`);
    }
  }
  if (finalList !== expected.finalList)
    errors.push(`finalList mismatch:\n--- got ---\n${finalList}\n--- expected ---\n${expected.finalList}`);

  if (errors.length === 0) {
    pass += 1;
    console.log(`✓ ${base}`);
  } else {
    fail += 1;
    console.log(`✗ ${base}`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

// --- parseTranscript tests ---
const voiceMemory = {
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

const voiceCases = [
  {
    name: "voice-parse-001",
    input: "dudh andaa paneer olive oil",
    expect: ["dudh", "andaa", "paneer", "olive oil"],
  },
  {
    name: "voice-parse-002",
    input: "olive oil",
    expect: ["olive oil"],
  },
  {
    name: "voice-parse-003",
    input: "oil",
    expect: ["oil"],
  },
  {
    name: "voice-parse-004",
    input: "green peas",
    expect: ["green peas"],
  },
  {
    name: "voice-parse-005",
    input: "milk eggs bread",
    expect: ["milk", "eggs", "bread"],
  },
];

for (const tc of voiceCases) {
  const result = parseTranscript(tc.input, products, voiceMemory);
  const errors = [];
  if (JSON.stringify(result) !== JSON.stringify(tc.expect)) {
    errors.push(`got ${JSON.stringify(result)} expected ${JSON.stringify(tc.expect)}`);
  }
  if (errors.length === 0) {
    pass += 1;
    console.log(`✓ ${tc.name}`);
  } else {
    fail += 1;
    console.log(`✗ ${tc.name}`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

// --- processSpeechResults (interim result) tests ---
const speechCases = [
  {
    name: "speech-001",
    desc: "Safari: paneer arriving after milk bread paneer finalized",
    results: [{ isFinal: false, transcript: "paneer" }],
    finals: ["milk bread paneer"],
    expect: "milk bread paneer",
    resultIndex: 1,
  },
  {
    name: "speech-002",
    desc: "Android: cumulative batch [milk, milk bread, milk bread paneer]",
    results: [
      { isFinal: false, transcript: "milk" },
      { isFinal: false, transcript: "milk bread" },
      { isFinal: false, transcript: "milk bread paneer" },
    ],
    finals: ["milk bread"],
    expect: "milk bread paneer",
    resultIndex: 0,
  },
  {
    name: "speech-003",
    desc: "Safari: new words progressively [milk] then [bread] then [paneer]",
    results: [{ isFinal: false, transcript: "paneer" }],
    finals: ["milk bread"],
    expect: "milk bread paneer",
    resultIndex: 2,
  },
  {
    name: "speech-004",
    desc: "Android: single event mixed final+interim",
    results: [
      { isFinal: true, transcript: "milk" },
      { isFinal: false, transcript: "milk bread" },
      { isFinal: false, transcript: "milk bread paneer" },
    ],
    finals: [],
    expect: "milk bread paneer",
    resultIndex: 0,
  },
  {
    name: "speech-005",
    desc: "Both: first word, nothing finalized",
    results: [{ isFinal: false, transcript: "milk" }],
    finals: [],
    expect: "milk",
    resultIndex: 0,
  },
  {
    name: "speech-006",
    desc: "Both: mid-speech, word not yet finalized",
    results: [{ isFinal: false, transcript: "bread" }],
    finals: ["milk"],
    expect: "milk bread",
    resultIndex: 1,
  },
];

for (const tc of speechCases) {
  const acc = [...tc.finals];
  const cache = {};
  const got = processSpeechResults(tc.results, tc.resultIndex, acc, cache);
  const errors = [];
  if (got !== tc.expect) {
    errors.push(`display: got "${got}" expected "${tc.expect}"`);
  }
  if (errors.length === 0) {
    pass += 1;
    console.log(`✓ ${tc.name}`);
  } else {
    fail += 1;
    console.log(`✗ ${tc.name} (${tc.desc})`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

// --- Multi-event scenarios (Safari and Android) ---

// Safari: 3 sequential events with incremental resultIndex
{
  const acc = [];
  const cache = {};
  let ok = true;

  // Event 1: resultIndex=0, first word interim
  let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
  if (d !== "milk" || JSON.stringify(acc) !== "[]") ok = false;

  // Event 2: resultIndex=1, second word interim (Safari adds new index)
  d = processSpeechResults([{ isFinal: false, transcript: "bread" }], 1, acc, cache);
  if (d !== "milk bread" || JSON.stringify(acc) !== "[]") ok = false;

  // Event 3: resultIndex=2, third word interim
  d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 2, acc, cache);
  if (d !== "milk bread paneer" || JSON.stringify(acc) !== "[]") ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-safari-multi-event`); }
  else {
    fail += 1;
    console.log(`✗ speech-safari-multi-event`);
  }
}

// Android: same final result delivered again (resultIndex stays at 0)
{
  const acc = [];
  const cache = {};
  let ok = true;

  processSpeechResults([{ isFinal: true, transcript: "milk" }], 0, acc, cache);
  processSpeechResults([{ isFinal: true, transcript: "milk" }], 0, acc, cache);
  if (JSON.stringify(acc) !== `["milk"]`) ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-android-dedup-finals`); }
  else { fail += 1; console.log(`✗ speech-android-dedup-finals: acc=${JSON.stringify(acc)}`); }
}

// Android: full lifecycle (resultIndex=0 each event, repeated finals, cache cleared)
{
  const acc = [];
  const cache = {};
  let ok = true;

  let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
  if (d !== "milk" || JSON.stringify(acc) !== "[]") ok = false;

  d = processSpeechResults([
    { isFinal: true, transcript: "milk" },
    { isFinal: false, transcript: "milk bread" },
  ], 0, acc, cache);
  if (d !== "milk bread" || JSON.stringify(acc) !== `["milk"]`) ok = false;

  d = processSpeechResults([
    { isFinal: true, transcript: "milk" },
    { isFinal: false, transcript: "milk bread paneer" },
  ], 0, acc, cache);
  if (d !== "milk bread paneer" || JSON.stringify(acc) !== `["milk"]`) ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-android-lifecycle`); }
  else { fail += 1; console.log(`✗ speech-android-lifecycle`); }
}

// Android: multiple non-finals in one event (alternative hypotheses)
// Batch heuristic should keep only the last non-final entry
{
  const acc = ["milk bread"];
  const cache = {};
  const got = processSpeechResults([
    { isFinal: false, transcript: "milk milk milk bread" },
    { isFinal: false, transcript: "milk bread milk bread paneer" },
  ], 0, acc, cache);
  const cacheOk = JSON.stringify(cache) === '{"1":"milk bread milk bread paneer"}';
  if (got === "milk bread milk bread paneer" && cacheOk) { pass += 1; console.log(`✓ speech-android-batch`); }
  else { fail += 1; console.log(`✗ speech-android-batch: display="${got}" cache=${JSON.stringify(cache)}`); }
}

// Android: stale cache cleanup on next event
{
  const acc = [];
  const cache = {};
  processSpeechResults([
    { isFinal: false, transcript: "milk milk milk bread" },
    { isFinal: false, transcript: "milk bread milk bread paneer" },
  ], 0, acc, cache);
  // Next event: correct final result at index 0 only → cache[1] is now stale and outside [0,1)
  processSpeechResults([{ isFinal: true, transcript: "milk bread paneer" }], 0, acc, cache);
  const ok = JSON.stringify(cache) === "{}" && JSON.stringify(acc) === `["milk bread paneer"]`;
  if (ok) { pass += 1; console.log(`✓ speech-android-cache-cleanup`); }
  else { fail += 1; console.log(`✗ speech-android-cache-cleanup: cache=${JSON.stringify(cache)} acc=${JSON.stringify(acc)}`); }
}

// Safari: first word interim, then finalize + add new word (resultIndex resets to 0)
{
  const acc = [];
  const cache = {};
  let ok = true;

  // Event 1: resultIndex=0, first word interim
  let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
  if (d !== "milk") ok = false;

  // Event 2: resultIndex=0 (because results[0] changed to final), results[0] final + results[1] new interim
  d = processSpeechResults([
    { isFinal: true, transcript: "milk" },
    { isFinal: false, transcript: "bread" },
  ], 0, acc, cache);
  if (d !== "milk bread" || JSON.stringify(acc) !== `["milk"]`) ok = false;

  // Event 3: resultIndex=0 (because results[0] re-sent), results[1] updated
  d = processSpeechResults([
    { isFinal: true, transcript: "milk" },
    { isFinal: false, transcript: "paneer" },
  ], 0, acc, cache);
  if (d !== "milk paneer" || JSON.stringify(acc) !== `["milk"]`) ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-safari-finalize-continue`); }
  else { fail += 1; console.log(`✗ speech-safari-finalize-continue`); }
}

// Safari: incremental indices (truly new words only, no finalization)
{
  const acc = [];
  const cache = {};
  let ok = true;

  let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
  if (d !== "milk") ok = false;

  d = processSpeechResults([{ isFinal: false, transcript: "bread" }], 1, acc, cache);
  if (d !== "milk bread") ok = false;

  d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 2, acc, cache);
  if (d !== "milk bread paneer") ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-safari-incremental`); }
  else { fail += 1; console.log(`✗ speech-safari-incremental`); }
}

// Android: 2 alternative hypotheses in one event (no prefix relationship)
// Reproduces the user's bug: "milk milk bread" + "milk bread paneer" → only last should survive
{
  const acc = [];
  const cache = {};
  let ok = true;

  let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
  if (d !== "milk") ok = false;

  d = processSpeechResults([
    { isFinal: false, transcript: "milk milk bread" },
    { isFinal: false, transcript: "milk bread paneer" },
  ], 0, acc, cache);
  const cacheOk = JSON.stringify(cache) === '{"1":"milk bread paneer"}';
  if (d !== "milk bread paneer" || !cacheOk) ok = false;

  if (ok) { pass += 1; console.log(`✓ speech-android-alternatives`); }
  else {
    fail += 1;
    console.log(`✗ speech-android-alternatives: display="${d}" cache=${JSON.stringify(cache)}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
