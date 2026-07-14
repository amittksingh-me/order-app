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
- Per‑word `s` rule is safer but still strips "citrus" → "citru". Fixed by excluding words ending in `"us"`.
- `ing` stripping with a `>6` length guard blocks "string" (len 6), "spring" (len 6) — both nouns, not progressive verbs. Doubled‑consonant undoubling handles "running"→"run", "shopping"→"shop", "clubbing"→"club".
- Unit stripping (`stripUnits`) must run before singularization (`correctSpelling`). "Eggs 6 pcs" → `stripUnits` → "eggs" → `toSingular` → "egg". If reversed: `toSingular` strips the trailing "s" from "pcs" (full‑string context) leaving "eggs 6 pc", then `stripUnits` removes "6 pc" → "eggs" — the middle word "eggs" kept its 's'.
- Spelling fixes are a curated map, not AI. Every new misspelling needs a manual entry.
- Levenshtein fuzzy matching with a dynamic threshold (`min(2, max(1, floor(candidateLen/4)))`) works well for short Indian-English product names.

## Unmatched Items — Preserve Original Text
- Unmatched items now use `g.originals[0]` (original input text) as their `preferredProduct` instead of the normalized key (`g.key`). This prevents "nights" from displaying as "night", "mills" as "mill", etc. The normalized key is still used for dedup internally.

## Paste-Cycle Tests
- The file‑based `paste-cycle-002.*` fixture (word‑by‑word re‑paste of cycle 1 output) was replaced by an inline CSV‑driven paste‑cycle‑roundtrip test that verifies cycle 1 (multi‑word lines) and cycle 2 (re‑paste of comma‑separated output) produce identical normalized, matched, source, and finalList. The CSV fixture (`test-assets/csv/products.csv`) provides 72 product rows for the inline tests.

## Test Organisation
- Per-module `test-*.mjs` files let you run and debug one module in isolation.
- File-based fixtures (`.txt` input + `.expected.json`) make regression tests approachable without a test framework.
- Module-export tests (`typeof fn === "function"`) catch silent refactoring failures — renamed or unexported functions fail immediately.

## Module Boundaries
- Split when function consumers diverge: `processSpeechResults` is called by the React component (`InputPanel.jsx`); `parseTranscript` is called by the enrichment pipeline (`enrich.js`). Different consumers → different files.
- Split when persistence semantics differ: `draft.js` opens the DB without a version; `memory.js` owns `onupgradeneeded`. Different open strategy → different file.
- Move pure data transforms out of components: `mergeDatabase` belongs in `product.js`, not `App.jsx`.

## Sync Error Collection — Row Tracking
- `parseCsv` no longer filters out rows without a product — all rows are returned with a `_sheetRow` field tracking the original CSV line number.
- `syncSheet` validates each row and collects `errors: [{ row, reason }]` for: missing product name, key normalizes to empty, keyword parse failure, bracket mismatch.
- The header sync‑pill shows an orange count badge when errors exist; the error list is visible in the SyncPanel on the Memory tab.

## expandKeywords — Permutation Syntax
- `[a,b][c,d]` cartesian syntax expands to concatenated + space-separated forms for every combination.
- Balanced‑only: `[unbalanced` is silently treated as literal text — no crash. A separate bracket‑count check in `syncSheet` reports mismatches.
- `cartesian()` is a private helper generating the product of string arrays.

## Version‑Triggered Cleanup
- `localStorage("baskit-version")` is compared to `__APP_VERSION__` on mount. A mismatch calls `clearMemory()` to purge stale IndexedDB keys from old formats.
- This ensures `syncSheet` repopulates with fresh keys after a version bump where the key‑format may have changed.

## m/cm Removed from UNIT_PATTERN
- `m` and `cm` were removed from `stripUnits` because they caused false positives: "m" matched "minute", "meter", or brand abbreviations in product names where no unit stripping was intended.
- Remaining units: `g|kg|l|ml|pcs|pc|pack|oz|lb|pound`.

## Input-Mode Agnosticism
- Text, voice, and clipboard all converge through `setRawInput()` → the same save effect. The source does not matter for persistence correctness.
- The enrichment pipeline (`enrichItems`) accepts raw strings — it does not care whether they came from a textarea, speech recognition, or a paste event.

## Architectural Principle
- **One enrichment pipeline, multiple inputs.** Voice splitting (`parseTranscript`) lives in the enrichment layer, not the voice handler. This guarantees consistent dedup and lookup regardless of how the text entered the app.
