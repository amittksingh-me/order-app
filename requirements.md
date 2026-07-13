# BaskIt — Requirements

> **Status:** Phase 1 (complete)  
> **App name:** BaskIt  
> **Package name:** `shopping-list-pwa`  
> **See also:** `plan.md` (original Phase 1 plan), `architecture.md` (system design)

---

## 1. Core Enrichment Engine

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1.1 | Convert a typed line into a normalized search key | ✅ | `normalizeItem()` — lower, strip diacritics, punctuation→space, singular/plural, spelling fixes, stripUnits (removes `\d+unit` patterns), `ing` stripping with doubled‑consonant undoubling |
| R1.2 | Detect duplicate items across lines and merge quantities | ✅ | `detectDuplicates()` — identical normalized keys are grouped, count accumulated |
| R1.3 | Match a normalized key against user memory (IndexedDB) | ✅ | `lookupProduct()` — checks exact key match then keyword match on user entries |
| R1.4 | Match a normalized key against the built-in product database | ✅ | `lookupProduct()` — checks exact key, keyword index, then Levenshtein fuzzy match |
| R1.5 | Return structured enriched item objects | ✅ | Fields: `id`, `input`, `normalized`, `quantity`, `matched`, `source`, `fuzzy`, `product`, `preferredProduct`, `brand`, `size`, `alternatives`, `category`, `editable` |
| R1.6 | Smart split unmatched lines into sub-phrases | ✅ | `expandLines()` — comma‑split pre‑pass (`"chips, bread"` → two lines), noise filter (brand/size/number removal), `compressToMatch()` using `buildDisplayName` for coverage check, then greedy left-to-right `parseTranscript()` on low‑coverage lines. Product‑keys heuristic: all tokens map to same product → split into individual tokens for per‑item dedup. Then calls `prefixMatchUserMemory()` on each expanded line |
| R1.7 | Re-run lookup for a single edited item | ✅ | `reLookup()` — normalizes the edited string and re-queries |
| R1.8 | Unknown items are never silently dropped | ✅ | Pass through as unmatched, `source: "unknown"` |
| R1.9 | Single sort: unmatched first, then brand → product → size | ✅ | `sortItems()` at end of `enrichItems` — review table and clipboard always match |
| R1.10 | Word‑leak filter after sort | ✅ | After sorting, removes unknown single‑word items that are substrings of any matched item's `preferredProduct`. Prevents transcript fragments (e.g. `"paneer"` from `"milk bread paneer"`) leaking into clipboard |
| R1.11 | Canonical normalized keys | ✅ | Matched items use `normalizeItem(preferredProduct)` instead of `normalizeItem(input)`. Guarantees deterministic clipboard output across re‑paste cycles (e.g. `"milk"` always becomes `"Milk"`, not `"milkk"`) |

---

## 2. Product Database

### 2.1 Built-in database

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R2.1 | Ship a version-controlled product database | ✅ | `src/data/products.json` — 38 products |
| R2.2 | Read-only at runtime | ✅ | Never mutated in-app |
| R2.3 | Each entry supports: brand, product name, size, defaultQty, alternatives, keywords, category | ✅ | See `plan.md` for schema |
| R2.4 | Keywords enable alias-based matching | ✅ | e.g. `"aloo"`, `"alu"` → potato |

### 2.2 User Memory (IndexedDB)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R2.5 | Store user product preferences locally | ✅ | Single store `userProducts` keyed by normalized key |
| R2.6 | User memory takes priority over built-in | ✅ | Checked first in `lookupProduct()` |
| R2.7 | Google Sheets one-way sync (CSV → IndexedDB) | ✅ | `syncSheet()` — fetches, parses, upserts; auto-runs on load and every 5 min |
| R2.8 | Configurable sheet URL | ✅ | Stored in `localStorage`; defaults to a pre-configured URL |
| R2.9 | Full CRUD on learned products | ✅ | Memory panel: add, edit, delete learned entries |
| R2.10 | Export merged database as JSON | ✅ | Downloads `products.json` — built-in + user overrides merged |
| R2.11 | Import JSON into IndexedDB | ✅ | Bulk import via file picker |
| R2.12 | Reset (clear all user memory) | ✅ | With confirmation |

---

## 3. Input

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R3.1 | Large mobile-friendly multiline textarea | ✅ | 8 rows, responsive, inside a focus-glow container |
| R3.2 | Supports typing and paste | ✅ | Standard `<textarea>` |
| R3.3 | One item per line | ✅ | Split on `\n` at enrichment time |
| R3.4 | Ignores empty lines | ✅ | `detectDuplicates()` skips empty/normalized-to-empty lines |
| R3.5 | Voice-to-text via Web Speech API | ✅ | `interimResults: true`, `continuous: true`, `en-IN` locale. Tap mic once, auto‑stops after 2s silence. Live preview via `processSpeechResults()` (`lib/speech.js`) with a cross-event `interimCache` (React ref). Three platform models handled: iOS (single words at index 0) → stored at next free index; iOS/Safari (accumulated transcript) → prefix-deduped against prior entry, replaces cache[0]; Android (cumulative finals) → case-insensitive `startsWith` replacement in finals accumulator; Android (alternatives) → word-overlap detection (≥50% shared tokens) in distinct loop replaces instead of appends. Interims stored `.trim().toLowerCase()` for case-consistent comparisons; finals preserve original casing |
| R3.6 | "Prep List" button | ✅ | Enrich + auto-copy to clipboard |
| R3.8 | Live interim preview without duplication | ✅ | Built from cross-event `interimCache` (React ref in `InputPanel.jsx`) by `processSpeechResults()` (`lib/speech.js`) with prefix dedup, word-overlap alternative detection (≥50% tokens shared → replace), and suffix trimmed against finals |
| R3.7 | "Launch BigBasket" button | ✅ | Enrich + copy + navigate to bigbasket.com |
| R3.9 | Draft persistence survives app-kill on mobile | ✅ | On every keystroke saves to both IndexedDB (`appState` store via `lib/draft.js`) and `localStorage` (sync fallback for app-kill where `beforeunload` doesn't fire). On mount restores from `localStorage` first (synchronous, before first render completes), then IndexedDB as fallback. `firstRender` ref prevents save effect from clearing the draft during mount. Input-mode-agnostic — text, voice, and clipboard all converge through `setRawInput()` → save effect |

---

## 4. Review & Output

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R4.1 | Display enriched items in a structured table | ✅ | Columns: (delete), Brand, Product, Size, Qty; delete button first for mobile visibility |
| R4.2 | Indicate match status per item | ✅ | Desktop: coloured dot via `::before` (green=matched, amber=fuzzy, red=unknown). Mobile (<600px): 4px left‑border accent on card layout |
| R4.3 | Indicate match source | ✅ | "(memory)" badge for user-memory matches |
| R4.4 | Delete item from review | ✅ | X button per row; re‑copies to clipboard after deletion |
| R4.5 | Launch BB after deletion preserves removed items | ✅ | `handleLaunch` uses current items state if already enriched |
| R4.6 | Individual item editing | ❌ | Review panel is read-only. ProductTable supports editing but ReviewPanel does not wire it |
| R4.7 | Preference learning prompt | ❌ | No "Save as your preferred product?" prompt after edits |
| R4.8 | Unknown product learning prompt | ❌ | No "Remember this product?" prompt for unknown items |
| R4.9 | Auto-copy enriched list to clipboard | ✅ | Comma+space joined; happens after enrich, delete, or launch |
| R4.10 | Manual "Copy Shopping List" button | ❌ | Not present — copy is automatic only |
| R4.11 | Quantity included in clipboard text | ❌ | Output is `"Brand Product Size"` only (no `xN` suffix) |
| R4.12 | Mobile‑friendly card layout with status accent | ✅ | At <600px table converts to flex‑based cards. Product name prominent (bold, divider). Delete button pinned top‑right. Each card has 4px left border coloured by match status (green/amber/red) |

---

## 5. Navigation & UI

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R5.1 | Tab-based navigation (List / Memory) | ✅ | Two tabs in the header |
| R5.2 | Sync pill in header | ✅ | Shows last sync time, clickable to force re-sync |
| R5.3 | Memory tab: view built-in products | ✅ | Paginated table, search-filterable |
| R5.4 | Memory tab: view learned products | ✅ | Separate toggle, inline editing |
| R5.5 | Memory tab: sheet URL config + sync UI | ✅ | SyncPanel with URL input, instructions, sync button |
| R5.6 | Foot hint | ✅ | "Type, prep, paste into BigBasket" — subtle pill |
| R5.7 | Responsive / mobile-first CSS | ✅ | 871 lines of CSS with custom properties, media queries |

---

## 6. PWA & Deployment

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R6.1 | Installable PWA | ✅ | `vite-plugin-pwa` with manifest, icons, auto-update service worker |
| R6.2 | Custom app icon (shopping bag) | ✅ | SVG + generated PNGs (192, 512) |
| R6.3 | App name "BaskIt" | ✅ | Manifest, `<title>`, `<h1>` |
| R6.4 | Theme colour | ✅ | `#f4f5f7` in manifest and meta theme-color |
| R6.5 | GitHub Pages deployment | ✅ | `.github/workflows/deploy.yml` — auto-deploy on push to `main` |

---

## 7. Testing

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R7.1 | Regression test suite for enrichment engine | ✅ | `test-assets/run-tests.mjs` — orchestrator importing 11 per-module test files. 174 tests total: 43 normalize, 4 duplicate, 9 lookup, 31 enrich (17 file-based + 14 inline), 10 voice, 24 speech, 5 format, 6 product, 7 memory (exports), 6 draft (exports), 8 sheets (exports + parseCsv) |
| R7.2 | Tests cover: basic matching, duplicates, spelling, unknown, memory overrides, voice parsing, unknown‑first sort, paste‑cycle (clipboard re‑paste), paste‑cycle‑roundtrip (cycle 1 == cycle 2), paste‑noise (attribute words), speech (iOS/Android/Safari), reLookup, mergeDatabase, format, module exports | ✅ | |
| R7.3 | Every bug fix adds a regression test | ✅ | Pattern established — 174 tests across 11 per-module files, covering all platforms |

---

## 8. Build & Scripts

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R8.1 | `npm run dev` — dev server | ✅ | Vite |
| R8.2 | `npm run build` — production build | ✅ | Vite build |
| R8.3 | `npm run test` — regression tests | ✅ | Runs `test-assets/run-tests.mjs` |
| R8.4 | `npm run lint` — oxlint | ✅ | |
| R8.5 | `npm run build-db` — build products.json from order JSONs | ✅ | `scripts/build-db.mjs` |
| R8.6 | `npm run generate-icons` — generate PWA icons from SVG | ✅ | |

---

## 9. Gaps vs. plan.md

Features described in `plan.md` but not yet implemented:

| Gap | plan.md Ref | Impact |
|---|---|---|
| Loading indicator on Enrich button | "Disable button, Show loading indicator" | Low — enrichment is near-instant with 38 products |
| Individual item editing in Review panel | "Edit item name, Change quantity, Change package size, Add item" | Low — delete is implemented; edit/quantity/size/add remain |
| Preference learning prompt | "Save as your preferred product?" | Medium — users can edit in Memory tab but the flow is not contextual |
| Unknown product learning prompt | "Remember this product?" | Medium — same as above |
| Manual "Copy Shopping List" button | plan.md acceptance criteria | Low — auto-copy covers most of the need |
| Quantity in clipboard output | "x2" suffix in examples | Low — quantity is visible in the review table |
| "eggs" product in built-in DB | plan.md acceptance criteria | Low — can be added via sheet sync |
