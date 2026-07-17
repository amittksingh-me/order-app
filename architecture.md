# BaskIt — Architecture

> **App:** BaskIt (shopping-list-pwa)  
> **Stack:** React 19 + Vite 8 + vanilla CSS  
> **Storage:** IndexedDB (user memory + drafts) + localStorage (settings + draft backup)  
> **Build:** Vite, PWA via `vite-plugin-pwa`  
> **CI/CD:** GitHub Pages deploy on push to `main`

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Service Worker                        │
│              (auto-update PWA cache)                     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                     App (App.jsx)                        │
│    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│    │  IndexedDB   │  │  localStorage │  │  products.json │  │
│    │ (user memory)│  │  (sheet URL)  │  │  (built-in DB) │  │
│    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│           │                 │                  │          │
│           ▼                 ▼                  ▼          │
│    ┌──────────────────────────────────────────────────┐  │
│    │              Enrichment Pipeline                  │  │
│    │  normalize → deduplicate → lookup → enrich       │  │
│    └──────────────────────┬───────────────────────────┘  │
│                           │                              │
│           ┌───────────────┼───────────────┐              │
│           ▼               ▼               ▼              │
│    ┌──────────┐   ┌────────────┐   ┌────────────┐       │
│    │ InputPanel│   │ ReviewPanel│   │ MemoryPanel│       │
│    │ (textarea │   │ (results   │   │ (settings/ │       │
│    │  + voice) │   │  table)    │   │  editor)   │       │
│    └──────────┘   └────────────┘   └────────────┘       │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
order-app/
├── index.html                     # HTML shell, title "BaskIt"
├── vite.config.js                 # Vite config + PWA manifest
├── vitest.config.mjs              # Vitest UI test config
├── vitest-setup.mjs               # Vitest global setup (jsdom, __APP_VERSION__)
├── package.json
├── .gitignore                     # Ignores node_modules, dist, order_jsons/, /products.csv
├── .github/workflows/deploy.yml   # GitHub Pages CI/CD
├── plan.md                        # Original Phase 1 plan
├── requirements.md                # Requirements (this file)
├── architecture.md                # Architecture (this file)
├── learnings.md                   # Key learnings
│
├── public/
│   ├── pwa-192x192.png            # PWA icon
│   ├── pwa-512x512.png            # PWA icon
│   ├── favicon.svg                # Shopping bag favicon
│   └── manifest.json              # PWA manifest (generated)
│
├── src/
│   ├── main.jsx                   # React entry point
│   ├── App.jsx                    # Root: state, orchestration, tabs
│   ├── App.css                    # All styles (~871 lines)
│   ├── index.css                  # Global reset
│   │
│   ├── data/
│   │   └── products.json          # Built-in DB (38 products)
│   │
│   ├── lib/
│   │   ├── normalize.js           # Text normalization pipeline
│   │   ├── duplicate.js           # Duplicate detection
│   │   ├── lookup.js              # Multi-strategy product lookup
│   │   ├── enrich.js              # Core enrichment engine
│   │   ├── voice.js               # Voice transcript parser (parseTranscript)
│   │   ├── speech.js              # Live speech preview engine (processSpeechResults)
│   │   ├── format.js              # Clipboard formatting
│   │   ├── product.js             # Display name builder + mergeDatabase
│   │   ├── memory.js              # IndexedDB product CRUD
│   │   ├── draft.js               # IndexedDB draft persistence
│   │   └── sheets.js              # Google Sheets sync + expandKeywords + error collection
│   │
│   ├── components/
│   │   ├── InputPanel.jsx         # Textarea + voice + action buttons
│   │   ├── ReviewPanel.jsx        # Enriched results table
│   │   ├── MemoryPanel.jsx        # Product DB editor + settings
│   │   ├── ProductTable.jsx       # Shared table component
│   │   ├── SyncPanel.jsx          # Google Sheets sync UI
│   │   └── __tests__/             # Vitest UI tests (4 files, 12 assertions)
│   │       ├── App.test.jsx
│   │       ├── InputPanel.test.jsx
│   │       ├── MemoryPanel.test.jsx
│   │       └── ReviewPanel.test.jsx
│
├── test-assets/
│   ├── run-tests.mjs              # Test runner (node) — imports all test-*.mjs
│   ├── test-normalize.mjs
│   ├── test-duplicate.mjs
│   ├── test-lookup.mjs
│   ├── test-enrich.mjs
│   ├── test-voice.mjs
│   ├── test-speech.mjs
│   ├── test-format.mjs
│   ├── test-product.mjs
│   ├── test-memory.mjs
│   ├── test-draft.mjs
│   ├── test-sheets.mjs
│   ├── csv/
│   │   └── products.csv           # CSV fixture (72 rows, tracked in git)
│   └── manual-input/              # File-based test cases
│       ├── basic-001.*
│       ├── duplicate-001.*
│       ├── spelling-001.*
│       ├── unknown-001.*
│       ├── memory-001.*
│       ├── voice-001.* – voice-005.*
│       ├── unknown-first-001.*
│       ├── paste-cycle-001.*
│       ├── paste-noise-001.* – paste-noise-004.*
│       ├── dedup-sugar-chini.*
│
└── scripts/
    ├── build-db.mjs               # Build products.json from order exports
    ├── clean-keywords.mjs         # Download sheet CSV and apply permutation-syntax cleanups
    ├── clean-products.mjs         # Clean product/brand strings
    └── generate-icons.mjs         # Generate PWA icons from SVG
```

---

## 3. Component Tree

```
<App>                                     State: rawInput, items, userMemory, tab, syncUrl, enriched, lastSync, statusMsg, firstRender, syncErrors
├── <header>                              Sync pill (last sync time, orange dot + count when syncErrors)
│   └── <nav>                             Tab switcher: List | Memory
│
├── [tab=main]
│   ├── <InputPanel>                      Props: value, onChange, onEnrich, onLaunch, onClear
│   │   ├── <textarea>                    Raw input, one per line
│   │   └── <button.mic-btn>              Web Speech API — tap to record, auto‑stop on 2s silence
│   │
│   ├── <p.status-msg>                    "Ready! N matched, M unknown" — auto-clears after 3s
│   │
│   └── [enriched]
│       └── <ReviewPanel>                 Props: items, onResetInput, onDeleteItem
│           └── <ProductTable>.readonly   Table: Brand, Product, Size, Qty; status via rowClass dot
│
├── [tab=settings]
│   └── <MemoryPanel>                     Props: builtin, userMemory, CRUD callbacks, syncErrors, onSyncErrors
│       ├── <ProductTable>.editable       Built-in products (read-only rows)
│       ├── <ProductTable>.editable       Learned products (with edit/delete actions)
│       └── <SyncPanel>                   Props: onSync, lastSync, syncUrl, onUrlChange, syncErrors, onSyncErrors — local errors state + loading from handleSync
│
└── <footer.foot-hint>                    "Type, prep, paste into BigBasket"
```

---

## 4. Data Flow — Enrichment Pipeline

```
User types/pastes voice text
         │
         ▼
  rawInput (string in <textarea>)
         │
         ▼  user clicks "Prep List" or "Launch BigBasket"
  doEnrich() — App.jsx
         │
         ├── rawInput.split("\n")         → lines[]
         │
         ├── enrichItems(lines, builtin, userMemory)
         │      │
          │      ├── expandLines(lines)    → flatten smart‑split unmatched multi‑word lines
          │      │      ├── compressToMatch(line) — noise filter (brand/size/number) + attribute compression using buildDisplayName coverage
          │      │      └── if compressed < 70% coverage → parseTranscript() greedy left‑to‑right DB matching
          │      │            └── product‑keys heuristic: all tokens same product → keep original; different products → split
          │      │      └── prefixMatchUserMemory() on each expanded line (partial prefix vs CSV‑synced user memory keys)
          │      │
          │      ├── detectDuplicates(lines)  (now sees all sub‑phrases)
          │      │      │
          │      │      └── normalizeItem(line) per line
          │      │      └── group by key, accumulate count
         │      │
         │      ├── For each group:
         │      │      │
         │      │      ├── lookupProduct(key, builtin, userMemory)
         │      │      │      │
         │      │      │      ├── 1. User memory exact key match
         │      │      │      ├── 2. User memory keyword match
         │      │      │      ├── 3. Built-in exact + keyword index
         │      │      │      ├── 4. Levenshtein fuzzy match
         │      │      │      └── 5. Unknown (matched: false)
         │      │      │
          │      │      └── Build enriched item object
          │      │            └── canonical key: matched items use normalizeItem(preferredProduct); unknown items use normalizeItem(input)
          │      │
          │      ├── sortItems(items)      → unmatched first, then brand → product → size
          │      │
          │      ├── wordLeakFilter(items) → remove unknown single‑word items contained in any matched preferredProduct
          │      │
          │      └── → items[] (enriched)
         │
         ├── setItems(result)            → ReviewPanel renders
         │
         ├── formatShoppingList(items)   → comma+space joined
         │
         └── navigator.clipboard.writeText()   → auto-copy
```

---

## 5. Module Descriptions

### `lib/normalize.js`
| Function | Purpose |
|---|---|
| `normalizeText(raw)` | Light clean: lowercase, NFKD, strip diacritics, punctuation→space, collapse whitespace |
| `toSingular(normalized)` | Per‑word singularization: `ies`→`y`, `ses`→`s`, trailing `s` unless ending in `"us"` (preserves `"citrus"`), `ing`→ stripped (len > 6, with doubled‑consonant undoubling) |
| `correctSpelling(normalized)` | Curated fixes map: `milkk`→`milk`, `tomoto`→`tomato`, etc. |
| `normalizeItem(raw)` | Full pipeline: `normalizeText` → `stripUnits` → `correctSpelling` (includes `toSingular`) |
| `stripUnits(normalized)` | Removes `\d+(\.\d+|\s+\d+(\.\d+)?)?\s*(g\|kg\|l\|ml\|pcs\|pc\|pack\|oz\|lb\|pound)` patterns before singularization |

### `lib/duplicate.js`
| Function | Purpose |
|---|---|
| `detectDuplicates(lines)` | `normalizeItem` each line, group by key, return `[{ key, count, originals }]` |

### `lib/lookup.js`
| Function | Purpose |
|---|---|
| `lookupProduct(key, builtin, userMemory)` | 6-step lookup: user memory exact → user keyword → builtin exact → builtin keyword → fuzzy → unknown. Does NOT internally prefix‑match — that is handled externally by `prefixMatchUserMemory` |
| `prefixMatchUserMemory(key, userMemory)` | Exported separately. Checks if `key` is a prefix of any user memory key. Called by `expandLines` and `enrichItems` for clipboard re‑paste matching, NOT by `parseTranscript` (prevents partial‑match pollution during voice) |
| `levenshtein(a, b)` (private) | Distance for fuzzy matching; threshold = `min(2, max(1, floor(candidateLen/4)))` |
| `buildKeywordIndex(builtin)` (private) | Maps builtin keys + keywords → entry keys |

### `lib/enrich.js`
| Function | Purpose |
|---|---|
| `enrichItems(lines, builtin, userMemory)` | Full pipeline: `expandLines` → `detectDuplicates` → lookup → canonical key assignment → post‑dedup merge (same normalized key → sum quantities) → `sortItems` → word‑leak filter. Matched items get `normalizeItem(preferredProduct)` as their canonical key; unknown items use `normalizeItem(g.originals[0])` (preserves original text) |
| `expandLines(lines, builtin, userMemory)` | Flatten input: comma‑split pre‑pass (`"chips, bread"` → two lines), noise‑filter (brand/size/number via `isNoise`), `compressToMatch` checks if all other tokens are substrings of one matched token's display name (`buildDisplayName`). If not compressible → greedy `parseTranscript()`. If any parsed token matched, pushes all cleaned tokens as individual lines (same behavior regardless of whether all tokens map to same product or different products — the product‑keys heuristic was removed as both branches produced identical output). Then call `prefixMatchUserMemory()` on each expanded line |
| `sortItems(items)` | Unmatched first, then brand → product → size (single sort point for review + clipboard) |
| `wordLeakFilter(items)` | After sort, removes unknown single‑word items whose text is contained (as substring) in any matched item's `preferredProduct`. Prevents transcript fragments leaking into clipboard |
| `reLookup(item, builtin, userMemory)` | Re-run lookup after user edits an item's preferred product |

### `lib/voice.js`
| Function | Purpose |
|---|---|
| `parseTranscript(transcript, builtin, userMemory)` | Greedy left-to-right phrase matcher. Strips filler words (`"and"`, `"the"`, `"a"`, `"an"`, `"or"`, `"for"`, `"of"`, `"to"`, `"in"`, `"my"`, etc.) and single‑char tokens. Tries longest DB‑matching phrase first (up to 4 words), falls back to single words. Used by `expandLines()` in the enrichment pipeline — NOT by the Web Speech API handler directly |

### `lib/speech.js`
| Function | Purpose |
|---|---|
| `processSpeechResults(newResults, resultIndex, finalsAccum, interimCache)` | Core live-preview engine for the Web Speech API `onresult` handler. Stores non-finals in a cross-event `interimCache` (keyed by result index) with platform-specific logic: (1) iOS single-word-at-index-0 → auto-increment storeIdx to avoid overwrite. (2) Android alternatives → handled by word-overlap detection in the distinct loop (≥50% shared tokens → replace). (3) Finals use case-insensitive `startsWith` comparison to handle Android's cumulative transcript pattern. Interims are lowered for consistent dedup; finals preserve original casing. Exported from `lib/speech.js` (split from `voice.js` so the live-preview engine can be imported without the transcript parser) |

### `lib/format.js`
| Function | Purpose |
|---|---|
| `formatShoppingList(items)` | Joins `preferredProduct` (or `input`) with comma+space for clipboard |

### `lib/product.js`
| Function | Purpose |
|---|---|
| `buildDisplayName(brand, product, size)` | Returns `"Brand Product Size"` (e.g. `"fresho Potato 1 kg"`) |
| `mergeDatabase(builtin, userMemory)` | Merges built-in products.json with user memory overrides. Returns a single `{ [key]: product }` object. Used by MemoryPanel's export feature. Moved here from `App.jsx` to keep the component focused on orchestration |

### `lib/memory.js`
| Function | Purpose |
|---|---|
| `getAllMemory()` | Returns all IndexedDB records as `{ [key]: product }` |
| `getMemory(key)` | Single record |
| `putMemory(key, product)` | Upsert |
| `deleteMemory(key)` | Delete one |
| `clearMemory()` | Wipe entire store |
| `importMemory(map)` | Bulk insert |
| `exportMemory()` | Alias for `getAllMemory` |
| IndexedDB | `shopping-list-engine` (v2) — `userProducts` store (product CRUD) + `appState` store (created by `onupgradeneeded` for draft persistence) |

### `lib/draft.js`
| Function | Purpose |
|---|---|
| `getDraft()` | Returns saved draft from `appState` store (`id: "draft-input"`) or `null` |
| `saveDraft(value)` | Upserts `{ id: "draft-input", value }` into `appState` store |
| `deleteDraft()` | Removes `"draft-input"` entry from `appState` store |
| IndexedDB | Opens `shopping-list-engine` without a version number (relies on `memory.js` to create stores via `onupgradeneeded`). All three functions are async and operate on the `appState` object store |

### `lib/sheets.js`
| Function | Purpose |
|---|---|
| `fetchCsv(url)` | HTTP GET CSV text |
| `parseCsv(text)` | Parse CSV (handles quoted fields, multi-line values). Returns ALL rows including those without a product; each row has a `_sheetRow` field tracking original CSV line number. Columns: brand, product, size, qty, category, keywords |
| `expandKeywords(kw)` | Parses permutation syntax (`[a,b][c,d]` → cartesian product: "ac", "a c", "ad", "a d", "bc", "b c", "bd", "b d"). Plain semicolon‑separated tokens pass through unchanged. Returns deduplicated array |
| `cartesian(sets)` (private) | Cartesian product of string arrays |
| `syncSheet(csvUrl)` | Fetch → parse → validate each row → upsert via `putMemory` → return `{ count, memory, errors }`. Errors collected for: missing product name, empty normalized key, keyword parse failure, bracket mismatch in keywords. `errors` is `undefined` when empty |

---

## 6. Storage

### IndexedDB
```
Database: shopping-list-engine (v2)
  Object store: userProducts
    Key path: "key"
    Record: { key: string, product: object }

  Object store: appState (added in v2)
    Key path: "id"
    Record: { id: string, value: string }
    Used for: draft persistence ("draft-input")
```

`getAllMemory()` returns a flat `{ [normalizedKey]: productObject }` map consumed by the app.
`draft.js` opens the DB without a version (relies on `memory.js` `onupgradeneeded` to create stores).

### localStorage
| Key | Value |
|---|---|
| `sheet-csv-url` | Google Sheets CSV URL (published, `output=csv`) |
| `draft-input` | Synchronous draft backup — written on every keystroke alongside IndexedDB. Read first on mount to survive app-kill on mobile where `beforeunload` doesn't fire |
| `baskit-version` | Version string (e.g. `"0.5.0"`). Checked on mount; if different from `__APP_VERSION__`, calls `clearMemory()` to purge stale IndexedDB keys from old formats |

---

## 7. Key Design Decisions

### 7.1 Enrichment is independent of input method
`enrichItems(lines, builtin, userMemory)` accepts raw strings. Voice, paste, and typed input all converge to the same pipeline. The smart phrase splitting (`parseTranscript`) lives in the enrichment layer, not in the voice handler.

### 7.2 User memory > built-in database
`lookupProduct` checks user memory (IndexedDB) before the built-in `products.json`. User memory entries can shadow built-in entries for the same key.

### 7.3 Google Sheets is the authoring interface for user memory
Instead of building a CRUD UI for every product field, the app syncs a published Google Sheets CSV. The Memory panel provides finer-grained editing for individual entries.

### 7.4 Auto-copy on enrich
The enriched list is automatically copied to the clipboard, removing the manual copy step. The "Launch BigBasket" button enriches, copies, then navigates (using `_self` to trigger Android App Links).

### 7.5 Two IndexedDB stores
The database `shopping-list-engine` (v2) has two object stores: `userProducts` (product CRUD — keys, keywords, brand, size, category) and `appState` (app-level key-value pairs like `"draft-input"`). The draft functions live in their own module (`lib/draft.js`) to keep `lib/memory.js` focused on product storage. `draft.js` opens the DB without a version number and relies on `memory.js`'s `onupgradeneeded` to create both stores — this avoids a race where `draft.js` opens first and `onupgradeneeded` fires without creating the `appState` store.

### 7.6 File-based regression tests + vitest UI tests
Tests are `.txt` input files with corresponding `.expected.json` files, run by `test-assets/run-tests.mjs` (226 module tests across 11 per-module files). Additionally, 12 UI assertions run via `vitest` (`npm run test:ui`) using `jsdom` + `@testing-library/react`, covering component rendering in `src/components/__tests__/`.

### 7.7 Tap to stop; no auto-stop
The mic stays on until the user taps the button again. `interimResults: true` streams results every ~200–500ms for live preview. The live preview is built by `processSpeechResults()` using a cross-event `interimCache` (React ref) with word-overlap alternative detection, iOS sequence handling, and case-insensitive cumulative finals dedup. Tapping the mic again force-stops and flushes the pending transcript.

### 7.8 Single sort point in enrichItems
`sortItems()` runs once at the end of `enrichItems` — unmatched first, then by brand → product → size. Removing `sort()` from `formatShoppingList` ensures review table and clipboard always display the same order.

### 7.9 Status dots (desktop) and left‑border accent (mobile)
Match status is shown as an 8px coloured circle via `::before` on `.pc-name` (green = matched, amber = fuzzy, red = unknown) on desktop. On mobile (<600px) cards use a 4px left‑border colour instead — more visually impactful without crowding the card content.

### 7.10 Delete with re-copy in review
Each review row has a delete (X) button. After deletion the list is re-copied to clipboard. `handleLaunch()` uses the current items state if already enriched, so deleting then launching preserves the removals.

### 7.11 Prefix match extracted from lookupProduct
`prefixMatchUserMemory` is exported separately from `lookup.js` and NOT called inside `lookupProduct`. It is only invoked by `expandLines` and `enrichItems` for clipboard re‑paste matching. This prevents `parseTranscript` from partial‑prefix‑matching mid‑speech (which would pull words into the wrong phrase).

### 7.12 Expand‑lines match‑any heuristic
In `expandLines`, after splitting a line via `parseTranscript` and noise‑filtering the tokens, if any token matched a product the tokens are spread into individual lines. If no token matched, the original line is preserved as‑is. (The product‑keys heuristic from an earlier version was removed because both branches produced identical output — `out.push(...clean)` — making the per‑product distinction dead code.)

### 7.13 Word‑leak filter
After sorting, unknown single‑word items that are substrings of any matched item's `preferredProduct` are removed. Without this, transcript fragments like `"paneer"` from `"milk bread paneer"` would leak into the clipboard alongside `"paneer"` as a separate matched line.

### 7.14 Canonical normalized keys
Matched items use `normalizeItem(preferredProduct)` as their canonical key, not `normalizeItem(input)`. This ensures deterministic clipboard output across re‑paste cycles — `"milkk"` always becomes `"Milk"`, not repeating the misspelling.

### 7.15 Cross-event interim cache instead of per-event snapshot
The initial approach built the live preview fresh from each event's non‑final results. This caused stale entries on iOS (single-word events at index 0 overwriting prior words) and missed alternatives on Android (separate events at different indices). Switching to a cross-event `interimCache` (keyed by resultIndex) solved both: iOS words accumulate at sequential indices; Android alternatives are collapsed via word‑overlap check in the distinct loop.

### 7.16 Word‑overlap detection replaces batch heuristic
The initial Android batch heuristic deleted all but the last non‑final in a single event (resultIndex=0, ≥2 non‑finals). This broke iOS which sends `[accumulatedText, space‑prefixedNewWord]` pairs — the accumulated text was deleted, causing flashing. The batch heuristic was removed; word‑overlap detection (≥50% shared tokens between consecutive cache entries → replace) handles Android alternatives without cache deletion.

### 7.17 Lowercased interims, preserved finals
Interim transcripts are stored `.trim().toLowerCase()` to ensure consistent prefix‑matching and overlap detection across platforms. Final transcripts preserve original casing — the `startsWith` comparison uses `.toLowerCase()` on both sides for case‑insensitive dedup, then stores the original‑cased transcript.

### 7.18 Dual‑layer draft persistence (IndexedDB + localStorage)
Draft input is saved on every keystroke to both IndexedDB (`appState` store via `lib/draft.js`) and `localStorage` (synchronous `.setItem()`). This dual approach exists because mobile browsers (iOS Safari, Chrome) do not reliably fire `beforeunload` when the app is killed — IndexedDB writes may be lost if the flush hasn't completed. `localStorage` writes are synchronous and survive app-kill. On mount:
1. `localStorage` is read first (synchronous, before first render completes).
2. IndexedDB is queried as a secondary fallback (for users with data only in IndexedDB before the sync writes were added).
3. A `firstRender` ref guards the save effect — the effect returns early on mount without saving, preventing the effect from clearing the draft (via `rawInput=""`) before the restore runs.
The mechanism is input-mode-agnostic: text, voice, and clipboard all converge through `setRawInput()` → the save effect.

### 7.20 Permutation keyword syntax
Keywords in the Google Sheet CSV support `[a,b][c,d]` cartesian‑product syntax via `expandKeywords()` in `lib/sheets.js`. Each bracket group defines alternatives; the function generates both concatenated (`"ac"`) and space‑separated (`"a c"`) forms for every combination. Semicolon‑separated tokens pass through unchanged. Unbalanced brackets silently produce literal text but are detected by `syncSheet`'s bracket‑balance check and reported in the error list.

### 7.21 Sync error reporting
`syncSheet` validates each CSV row and collects `errors: [{ row, reason }]` for skipped rows: missing product name, key normalizes to empty, keyword parse failure, bracket mismatch. The header sync‑pill shows an orange warning dot + count when errors exist; expanding the SyncPanel in the Memory tab reveals the full row‑by‑row error list. All three sync paths (mount, 5‑min interval, manual pill click) capture errors into global state so the indicator persists until the next sync.

### 7.22 Version‑triggered memory cleanup
On mount, `App.jsx` compares `localStorage("baskit-version")` against `__APP_VERSION__` (injected by Vite's `define`). A mismatch triggers `clearMemory()` to purge IndexedDB keys that may have stale formats from a previous version, then writes the current version to localStorage. This ensures `syncSheet` repopulates with fresh keys on every version bump.

### 7.19 Normalize pipeline: stripUnits before singularization
`stripUnits` runs before `correctSpelling` (which calls `toSingular`). This ordering is critical: "Eggs 6 pcs" → `stripUnits` → "eggs" → `toSingular` → "egg". Reversing the order would produce "eggs 6 pc" → "eggs" (the s-rule consumed "pcs"→"pc" but "eggs" in the middle kept its 's'). `toSingular` operates per‑word with a `"us"`‑ending exception that preserves "citrus" from the s‑rule. The `ing` rule (`>6` guard, doubled‑consonant undoubling) strips progressive verb forms: "cleaning"→"clean", "packing"→"pack", "running"→"run", "shopping"→"shop". Words like "string" (len 6) and "spring" (len 6) are blocked by the length guard, and "citrus" is preserved by the `"us"` exception. `UNIT_PATTERN` matches `\d+(\.\d+|\s+\d+(\.\d+)?)?\s*(g|kg|l|ml|pcs|pc|pack|oz|lb|pound)\b` — note `m`/`cm` were removed after causing false positives on "m" in product names (meter, minute).

---

## 8. Build & CI Pipeline

```
npm run dev            → Vite dev server (HMR)
npm run build          → Vite build → dist/
npm run test           → node test-assets/run-tests.mjs       (226 module tests)
npm run test:ui        → vitest run                           (12 UI tests)
npm run lint           → oxlint
npm run build-db       → scripts/build-db.mjs
npm run clean-db       → scripts/clean-products.mjs
npm run clean-keywords → node scripts/clean-keywords.mjs      (download sheet, compact keywords)
npm run generate-icons → scripts/generate-icons.mjs

GitHub Actions (deploy.yml):
  Push to main → Setup Node 22 → npm ci → npm test → npm run build → Deploy to Pages
```

---

## 9. External Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `react` | ^19.2 | UI framework |
| `react-dom` | ^19.2 | DOM rendering |
| `vite` | ^8.1 | Build tool / dev server |
| `@vitejs/plugin-react` | ^6.0 | React JSX transform |
| `vite-plugin-pwa` | ^1.3 | PWA manifest + service worker |
| `vitest` | ^4.1 | UI test runner |
| `@testing-library/react` | ^16.3 | Component test utilities |
| `@testing-library/jest-dom` | ^6.9 | DOM matchers for vitest |
| `jsdom` | ^29.1 | Browser environment for vitest |
| `@types/react` | ^19.2 | React type definitions |
| `@types/react-dom` | ^19.2 | React DOM type definitions |
| `oxlint` | ^1.71 | Linter |
| Web Speech API | Browser | Voice input (`SpeechRecognition` / `webkitSpeechRecognition`) |
| IndexedDB | Browser | User memory storage |
| `localStorage` | Browser | Sheet URL, draft backup, version key |
