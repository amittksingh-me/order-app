import { useEffect, useState } from "react";
import "./App.css";
import products from "./data/products.json";
import { enrichItems } from "./lib/enrich";
import { formatShoppingList } from "./lib/format";
import { normalizeItem } from "./lib/normalize";
import { syncSheet } from "./lib/sheets";
import {
  getAllMemory,
  putMemory,
  clearMemory,
  deleteMemory,
  importMemory,
} from "./lib/memory";
import InputPanel from "./components/InputPanel";
import ReviewPanel from "./components/ReviewPanel";
import MemoryPanel from "./components/MemoryPanel";

const SHEET_URL_KEY = "sheet-csv-url";
const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeqQBp7FYdB6BzQ20Y3Q-rFDuQemV50OpQIetw7LDI0hVBM4NEGYwyLm58s77UEWyp89ygXRixzVTI/pub?gid=0&single=true&output=csv";

// Merge shipped products.json with IndexedDB user overrides into a single
// products.json-shaped object (user memory wins per key). Used for export.
function mergeDatabase(builtin, userMemory) {
  const out = {};
  for (const [key, v] of Object.entries(builtin)) {
    const ov = userMemory[key];
    if (ov) {
      const merged = { ...v, ...ov };
      merged.keywords = ov.keywords || v.keywords || [ov.product || v.product];
      out[key] = merged;
    } else {
      out[key] = v;
    }
  }
  for (const [key, v] of Object.entries(userMemory)) {
    if (!out[key]) {
      out[key] = { ...v, keywords: v.keywords || [v.product] };
    }
  }
  return out;
}

export default function App() {
  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState([]);
  const [enriched, setEnriched] = useState(false);
  const [userMemory, setUserMemory] = useState({});
  const [tab, setTab] = useState("main"); // main | settings
  const [lastSync, setLastSync] = useState(null);
  const [syncUrl, setSyncUrl] = useState(() => {
    try {
      return localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SHEET_URL;
    } catch {
      return DEFAULT_SHEET_URL;
    }
  });

  function ago(ts) {
    if (!ts) return "";
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return "just now";
    if (min === 1) return "1m ago";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m ago` : `${h}h ago`;
  }

  async function handleSyncNow() {
    try {
      const url = localStorage.getItem(SHEET_URL_KEY);
      if (!url) return;
      const result = await syncSheet(url);
      setUserMemory(result.memory);
      setLastSync(Date.now());
    } catch {}
  }

  useEffect(() => {
    getAllMemory()
      .then((mem) => {
        setUserMemory(mem);
        try {
          let url = localStorage.getItem(SHEET_URL_KEY);
          if (!url) {
            url = DEFAULT_SHEET_URL;
            localStorage.setItem(SHEET_URL_KEY, url);
          }
          syncSheet(url)
            .then((res) => {
              setUserMemory(res.memory);
              setLastSync(Date.now());
            })
            .catch(() => {});
        } catch {}
      })
      .catch(() => setUserMemory({}));

    const id = setInterval(() => {
      try {
        const url = localStorage.getItem(SHEET_URL_KEY);
        if (url) {
          syncSheet(url)
            .then((res) => {
              setUserMemory(res.memory);
              setLastSync(Date.now());
            })
            .catch(() => {});
        }
      } catch {}
    }, 300000);

    return () => clearInterval(id);
  }, []);

  async function handleEnrich() {
    await doEnrich();
  }

  async function handleLaunch() {
    await doEnrich();
    window.location.href = "https://www.bigbasket.com";
  }

  async function doEnrich() {
    const lines = rawInput.split("\n");
    const result = enrichItems(lines, products, userMemory);
    setItems(result);
    setEnriched(true);
    const text = formatShoppingList(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard write failed silently
    }
  }

  async function handleReset() {
    await clearMemory();
    setUserMemory({});
  }

  async function handleDeleteLearned(key) {
    await deleteMemory(key);
    setUserMemory((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Edit a row on the Memory page (works for built-in or learned keys;
  // writes an override into IndexedDB).
  async function handleEditMemory(key, record) {
    await putMemory(key, record);
    setUserMemory((prev) => ({ ...prev, [key]: record }));
  }

  // Add a brand-new product (key derived from its product name).
  async function handleAddMemory(record) {
    const key = normalizeItem(record.product || "");
    if (!key) return;
    await putMemory(key, record);
    setUserMemory((prev) => ({ ...prev, [key]: record }));
  }

  // Export the MERGED database (built-in + overrides) as products.json,
  // so it can be committed back into the repo.
  async function handleExport() {
    const data = mergeDatabase(products, userMemory);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    await importMemory(data);
    setUserMemory(await getAllMemory());
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">🛒</span>
          Shopping List Engine
        </h1>
        <nav>
          <button
            className={tab === "main" ? "active" : ""}
            onClick={() => setTab("main")}
          >
            List
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            Memory
          </button>
        </nav>
        {syncUrl && (
          <button className="sync-pill" onClick={handleSyncNow} title="Sync now">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:4}}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {ago(lastSync)}
          </button>
        )}
      </header>

      {tab === "main" ? (
        <main>
          <InputPanel
            value={rawInput}
            onChange={setRawInput}
            onEnrich={handleEnrich}
            onLaunch={handleLaunch}
          />

          {enriched && (
            <ReviewPanel
              items={items}
              onResetInput={() => {
                setEnriched(false);
                setItems([]);
                setRawInput("");
              }}
            />
          )}
        </main>
      ) : (
        <MemoryPanel
          builtin={products}
          userMemory={userMemory}
          onReset={handleReset}
          onExport={handleExport}
          onImport={handleImport}
          onDeleteLearned={handleDeleteLearned}
          onEdit={handleEditMemory}
          onAdd={handleAddMemory}
          onSync={setUserMemory}
          lastSync={lastSync}
          syncUrl={syncUrl}
          onUrlChange={setSyncUrl}

        />
      )}
      <p className="foot-hint">
        Type, enrich, copy, paste into BigBasket
      </p>
    </div>
  );
}
