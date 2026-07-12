import { run as testNormalize } from "./test-normalize.mjs";
import { run as testDuplicate } from "./test-duplicate.mjs";
import { run as testLookup } from "./test-lookup.mjs";
import { run as testEnrich } from "./test-enrich.mjs";
import { run as testVoice } from "./test-voice.mjs";
import { run as testSpeech } from "./test-speech.mjs";
import { run as testFormat } from "./test-format.mjs";
import { run as testProduct } from "./test-product.mjs";
import { run as testMemory } from "./test-memory.mjs";
import { run as testDraft } from "./test-draft.mjs";
import { run as testSheets } from "./test-sheets.mjs";

let totalPass = 0, totalFail = 0;

for (const run of [
  testNormalize,
  testDuplicate,
  testLookup,
  testEnrich,
  testVoice,
  testSpeech,
  testFormat,
  testProduct,
  testMemory,
  testDraft,
  testSheets,
]) {
  const { pass, fail } = run();
  totalPass += pass;
  totalFail += fail;
}

console.log(`\n${totalPass} passed, ${totalFail} failed`);
process.exit(totalFail ? 1 : 0);
