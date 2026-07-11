import { useEffect, useState } from "react";
import "./App.css";
import products from "./data/products.json";
import { enrichItems } from "./lib/enrich";
import { formatShoppingList } from "./lib/format";
import { normalizeItem } from "./lib/normalize";
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

  useEffect(() => {
    getAllMemory().then(setUserMemory).catch(() => setUserMemory({}));
  }, []);

  async function handleEnrich() {
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
      </header>

      {tab === "main" ? (
        <main>
          <InputPanel
            value={rawInput}
            onChange={setRawInput}
            onEnrich={handleEnrich}
            disabled={enriched && items.length > 0}
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
        />
      )}
      <p className="foot-hint">
        Type, enrich, copy, paste into BigBasket
      </p>
    </div>
  );
}
