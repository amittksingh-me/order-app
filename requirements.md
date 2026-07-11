# BaskIt — Requirements

> **Status:** Phase 1 (complete)  
> **App name:** BaskIt  
> **Package name:** `shopping-list-pwa`  
> **See also:** `plan.md` (original Phase 1 plan), `architecture.md` (system design)

---

## 1. Core Enrichment Engine

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1.1 | Convert a typed line into a normalized search key | ✅ | `normalizeItem()` — lower, strip diacritics, punctuation→space, singular/plural, spelling fixes |
| R1.2 | Detect duplicate items across lines and merge quantities | ✅ | `detectDuplicates()` — identical normalized keys are grouped, count accumulated |
| R1.3 | Match a normalized key against user memory (IndexedDB) | ✅ | `lookupProduct()` — checks exact key match then keyword match on user entries |
| R1.4 | Match a normalized key against the built-in product database | ✅ | `lookupProduct()` — checks exact key, keyword index, then Levenshtein fuzzy match |
| R1.5 | Return structured enriched item objects | ✅ | Fields: `id`, `input`, `normalized`, `quantity`, `matched`, `source`, `fuzzy`, `product`, `preferredProduct`, `brand`, `size`, `alternatives`, `category`, `editable` |
| R1.6 | Smart split unmatched lines into sub-phrases | ✅ | `parseTranscript()` — greedy left-to-right matching against DB; integrated into `enrichItems` via `expandLines()` to flatten input before dedup |
| R1.7 | Re-run lookup for a single edited item | ✅ | `reLookup()` — normalizes the edited string and re-queries |
| R1.8 | Unknown items are never silently dropped | ✅ | Pass through as unmatched, `source: "unknown"` |
| R1.9 | Single sort: unmatched first, then brand → product → size | ✅ | `sortItems()` at end of `enrichItems` — review table and clipboard always match |

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
| R3.5 | Voice-to-text via Web Speech API | ✅ | Mic inside textarea; tap once, auto‑stops after 2s silence; `en-IN` locale |
| R3.6 | "Prep List" button | ✅ | Enrich + auto-copy to clipboard |
| R3.7 | "Launch BigBasket" button | ✅ | Enrich + copy + navigate to bigbasket.com |

---

## 4. Review & Output

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R4.1 | Display enriched items in a structured table | ✅ | Columns: Brand, Product, Size, Qty; status indicated by coloured dot |
| R4.2 | Indicate match status per item | ✅ | Coloured dot via `::before`: green=matched, amber=fuzzy, red=unknown |
| R4.3 | Indicate match source | ✅ | "(memory)" badge for user-memory matches |
| R4.4 | Delete item from review | ✅ | X button per row; re‑copies to clipboard after deletion |
| R4.5 | Launch BB after deletion preserves removed items | ✅ | `handleLaunch` uses current items state if already enriched |
| R4.6 | Individual item editing | ❌ | Review panel is read-only. ProductTable supports editing but ReviewPanel does not wire it |
| R4.7 | Preference learning prompt | ❌ | No "Save as your preferred product?" prompt after edits |
| R4.8 | Unknown product learning prompt | ❌ | No "Remember this product?" prompt for unknown items |
| R4.9 | Auto-copy enriched list to clipboard | ✅ | Comma+space joined; happens after enrich, delete, or launch |
| R4.10 | Manual "Copy Shopping List" button | ❌ | Not present — copy is automatic only |
| R4.11 | Quantity included in clipboard text | ❌ | Output is `"Brand Product Size"` only (no `xN` suffix) |
| R4.12 | "New list" button to reset | ✅ | Clears input and enriched results |

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
| R7.1 | Regression test suite for enrichment engine | ✅ | `test-assets/run-tests.mjs` — 11 file-based + 5 inline `parseTranscript` tests = 16 total |
| R7.2 | Tests cover: basic matching, duplicates, spelling, unknown, memory overrides, voice parsing, unknown-first sort | ✅ | |
| R7.3 | Every bug fix adds a regression test | ✅ | Pattern established |

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
