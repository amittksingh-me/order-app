import { getDraft, saveDraft, deleteDraft } from "../src/lib/draft.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  ok(typeof getDraft === "function", "getDraft exported");
  ok(typeof saveDraft === "function", "saveDraft exported");
  ok(typeof deleteDraft === "function", "deleteDraft exported");
  ok(getDraft.constructor.name === "AsyncFunction", "getDraft is async");
  ok(saveDraft.constructor.name === "AsyncFunction", "saveDraft is async");
  ok(deleteDraft.constructor.name === "AsyncFunction", "deleteDraft is async");

  return { pass, fail };
}
