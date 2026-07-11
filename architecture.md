# BaskIt — Architecture

> **App:** BaskIt (shopping-list-pwa)  
> **Stack:** React 19 + Vite 8 + vanilla CSS  
> **Storage:** IndexedDB (user memory) + localStorage (settings)  
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
├── package.json
├── .github/workflows/deploy.yml   # GitHub Pages CI/CD
├── plan.md                        # Original Phase 1 plan
├── requirements.md                # This file
├── architecture.md                # This file
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
│   │   ├── voice.js               # Voice transcript parser
│   │   ├── format.js              # Clipboard formatting
│   │   ├── product.js             # Display name builder
│   │   ├── memory.js              # IndexedDB CRUD
│   │   └── sheets.js              # Google Sheets sync
│   │
│   └── components/
│       ├── InputPanel.jsx         # Textarea + voice + action buttons
│       ├── ReviewPanel.jsx        # Enriched results table
│       ├── MemoryPanel.jsx        # Product DB editor + settings
│       ├── ProductTable.jsx       # Shared table component
│       └── SyncPanel.jsx          # Google Sheets sync UI
│
├── test-assets/
│   ├── run-tests.mjs              # Test runner (node)
│   └── manual-input/              # File-based test cases
│       ├── basic-001.*
│       ├── duplicate-001.*
│       ├── spelling-001.*
│       ├── unknown-001.*
│       ├── memory-001.*
│       ├── voice-001.* – voice-005.*
│       ├── unknown-first-001.*
│
└── scripts/
    ├── build-db.mjs               # Build products.json from order exports
    ├── clean-products.mjs         # Clean product/brand strings
    └── generate-icons.mjs         # Generate PWA icons from SVG
```

---

## 3. Component Tree

```
<App>                                     State: rawInput, items, userMemory, tab, syncUrl
├── <header>                              Sync pill (last sync time, click to re-sync)
│   └── <nav>                             Tab switcher: List | Memory
│
├── [tab=main]
│   ├── <InputPanel>                      Props: value, onChange, onEnrich, onLaunch
│   │   ├── <textarea>                    Raw input, one per line
│   │   └── <button.mic-btn>              Web Speech API — tap to record, auto‑stop on 2s silence
│   │
│   └── [enriched]
│       └── <ReviewPanel>                 Props: items, onResetInput, onDeleteItem
│           └── <ProductTable>.readonly   Table: Brand, Product, Size, Qty; status via rowClass dot
│
├── [tab=settings]
│   └── <MemoryPanel>                     Props: builtin, userMemory, CRUD callbacks
│       ├── <ProductTable>.editable       Built-in products (read-only rows)
│       ├── <ProductTable>.editable       Learned products (with edit/delete actions)
│       └── <SyncPanel>                   Props: onSync, lastSync, syncUrl, onUrlChange
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
         │      │      └── parseTranscript() via greedy left‑to‑right DB matching
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
         │      │
         │      ├── sortItems(items)      → unmatched first, then brand → product → size
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
| `toSingular(normalized)` | Crude singularization: `ies`→`y`, `ses`→`s`, trailing `s`→`""` |
| `correctSpelling(normalized)` | Curated fixes map: `milkk`→`milk`, `tomoto`→`tomato`, etc. |
| `normalizeItem(raw)` | Full pipeline: `normalizeText` → `correctSpelling` (includes `toSingular`) |

### `lib/duplicate.js`
| Function | Purpose |
|---|---|
| `detectDuplicates(lines)` | `normalizeItem` each line, group by key, return `[{ key, count, originals }]` |

### `lib/lookup.js`
| Function | Purpose |
|---|---|
| `lookupProduct(key, builtin, userMemory)` | 5-step lookup: user memory exact → user keyword → builtin exact → builtin keyword → fuzzy → unknown |
| `levenshtein(a, b)` (private) | Distance for fuzzy matching; threshold = `min(2, max(1, floor(candidateLen/4)))` |
| `buildKeywordIndex(builtin)` (private) | Maps builtin keys + keywords → entry keys |

### `lib/enrich.js`
| Function | Purpose |
|---|---|
| `enrichItems(lines, builtin, userMemory)` | Full pipeline: `expandLines` → `detectDuplicates` → lookup → `sortItems` |
| `expandLines(lines, builtin, userMemory)` | Flatten input: unmatched multi‑word lines are split by `parseTranscript`, matched lines pass through |
| `sortItems(items)` | Unmatched first, then brand → product → size (single sort point for review + clipboard) |
| `reLookup(item, builtin, userMemory)` | Re-run lookup after user edits an item's preferred product |

### `lib/voice.js`
| Function | Purpose |
|---|---|
| `parseTranscript(transcript, builtin, userMemory)` | Greedy left-to-right phrase matcher. Strips filler words, tries longest DB-matching phrase first, falls back to single words. Used by `expandLines()` in the enrichment pipeline |

### `lib/format.js`
| Function | Purpose |
|---|---|
| `formatShoppingList(items)` | Joins `preferredProduct` (or `input`) with comma+space for clipboard |

### `lib/product.js`
| Function | Purpose |
|---|---|
| `buildDisplayName(brand, product, size)` | Returns `"Brand Product Size"` (e.g. `"fresho Potato 1 kg"`) |

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

### `lib/sheets.js`
| Function | Purpose |
|---|---|
| `fetchCsv(url)` | HTTP GET CSV text |
| `parseCsv(text)` | Parse CSV (handles quoted fields, multi-line values). Columns: brand, product, size, qty, category, keywords |
| `syncSheet(csvUrl)` | Fetch → parse → upsert each row via `putMemory` → return `{ count, memory }` |

---

## 6. Storage

### IndexedDB
```
Database: shopping-list-engine (v1)
  Object store: userProducts
    Key path: "key"
    Record: { key: string, product: object }
```

`getAllMemory()` returns a flat `{ [normalizedKey]: productObject }` map consumed by the app.

### localStorage
| Key | Value |
|---|---|
| `sheet-csv-url` | Google Sheets CSV URL (published, `output=csv`) |

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

### 7.5 Single IndexedDB store
Only `userProducts` is used. There is no separate `userPreferences` store. All user data (product overrides, keywords, categories) lives in the same store.

### 7.6 File-based regression tests
Tests are `.txt` input files with corresponding `.expected.json` files, run by `test-assets/run-tests.mjs`. This keeps tests readable and easy to add without a test framework dependency.

### 7.7 Voice auto-stop on silence; tap to force-stop
The mic is tap-to-record (not toggle). After 2 seconds of silence, the recognition session ends and pending transcript is flushed as a line. Tapping again while recording force-stops and also flushes. This avoids leftover "half items" from short pauses in the middle of speaking.

### 7.8 Single sort point in enrichItems
`sortItems()` runs once at the end of `enrichItems` — unmatched first, then by brand → product → size. Removing `sort()` from `formatShoppingList` ensures review table and clipboard always display the same order.

### 7.9 Status dots instead of text badges
Match status is shown as an 8px coloured circle via `::before` on `.pc-name` (green = matched, amber = fuzzy, red = unknown). This is visually lighter and avoids cluttering the row with text pills.

### 7.10 Delete with re-copy in review
Each review row has a delete (X) button. After deletion the list is re-copied to clipboard. `handleLaunch()` uses the current items state if already enriched, so deleting then launching preserves the removals.

---

## 8. Build & CI Pipeline

```
npm run dev         → Vite dev server (HMR)
npm run build       → Vite build → dist/
npm run test        → node test-assets/run-tests.mjs
npm run lint        → oxlint
npm run build-db    → scripts/build-db.mjs
npm run generate-icons → scripts/generate-icons.mjs

GitHub Actions:
  Push to main → build → deploy to GitHub Pages
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
| `oxlint` | ^1.71 | Linter |
| Web Speech API | Browser | Voice input (`SpeechRecognition` / `webkitSpeechRecognition`) |
| IndexedDB | Browser | User memory storage |
| `localStorage` | Browser | Sheet URL + prefs |
