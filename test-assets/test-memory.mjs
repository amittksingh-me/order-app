import {
  getAllMemory, getMemory, putMemory,
  deleteMemory, clearMemory, exportMemory, importMemory,
} from "../src/lib/memory.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  for (const fn of [getAllMemory, getMemory, putMemory, deleteMemory, clearMemory, exportMemory, importMemory]) {
    ok(typeof fn === "function", `${fn.name} exported`);
    ok(fn.constructor.name === "AsyncFunction", `${fn.name} is async`);
  }

  return { pass, fail };
}
