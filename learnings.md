# BaskIt — Key Learnings

## Web Speech API — Platform Behaviours
- **iOS** sends single words at `resultIndex=0` one at a time. Store them at the next free cache index instead of overwriting `cache[0]`.
- **Android** sends cumulative finals (each event includes all prior speech) and alternatives (two non-final hypotheses per index). Word-overlap detection (≥50% tokens shared → replace) collapses alternatives without batch-deleting the cache.
- **Safari** accumulates the transcript in place at `cache[0]` — prefix-dedup against the prior entry before replacing.
- `onend` does **not** fire on app-kill — do not rely on it for final cleanup or persistence.

## Persistence — Mobile App-Kill
- `beforeunload` does **not** fire on iOS Safari or Android Chrome when the app is killed from the task switcher.
- IndexedDB writes are asynchronous — they may not flush before the process terminates.
- `localStorage.setItem()` is **synchronous** and **always survives** app-kill. Read it synchronously on mount.
- The save effect must be guarded with a `firstRender` ref: on mount, `rawInput=""` would otherwise delete the draft before restore runs.

## IndexedDB — Versioning
- Opening a DB with a version number triggers `onupgradeneeded`. If two modules open the same DB, the second module's `onupgradeneeded` will **never fire** — the upgrade already happened.
- Solution: one module owns `onupgradeneeded` (opens with explicit version). Secondary modules open **without** a version number.

## Normalisation — Sharp Edges
- Crude singularisation (`ies`→`y`, `ses`→`s`, trailing `s`→`""`) is a footgun — `"milk"` doesn't end in `s` (safe), but `"milks"` would become `"milk"` (accidentally correct) while `"tomatoes"` → `"tomatoe"` (wrong).
- Spelling fixes are a curated map, not AI. Every new misspelling needs a manual entry.
- Levenshtein fuzzy matching with a dynamic threshold (`min(2, max(1, floor(candidateLen/4)))`) works well for short Indian-English product names.

## Test Organisation
- Per-module `test-*.mjs` files let you run and debug one module in isolation.
- File-based fixtures (`.txt` input + `.expected.json`) make regression tests approachable without a test framework.
- Module-export tests (`typeof fn === "function"`) catch silent refactoring failures — renamed or unexported functions fail immediately.

## Module Boundaries
- Split when function consumers diverge: `processSpeechResults` is called by the React component (`InputPanel.jsx`); `parseTranscript` is called by the enrichment pipeline (`enrich.js`). Different consumers → different files.
- Split when persistence semantics differ: `draft.js` opens the DB without a version; `memory.js` owns `onupgradeneeded`. Different open strategy → different file.
- Move pure data transforms out of components: `mergeDatabase` belongs in `product.js`, not `App.jsx`.

## Input-Mode Agnosticism
- Text, voice, and clipboard all converge through `setRawInput()` → the same save effect. The source does not matter for persistence correctness.
- The enrichment pipeline (`enrichItems`) accepts raw strings — it does not care whether they came from a textarea, speech recognition, or a paste event.

## Architectural Principle
- **One enrichment pipeline, multiple inputs.** Voice splitting (`parseTranscript`) lives in the enrichment layer, not the voice handler. This guarantees consistent dedup and lookup regardless of how the text entered the app.
