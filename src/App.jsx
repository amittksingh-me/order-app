import { useEffect, useRef, useState } from "react";
import "./App.css";
import products from "./data/products.json";
import { enrichItems } from "./lib/enrich";
import { formatShoppingList } from "./lib/format";
import { normalizeItem } from "./lib/normalize";
import { syncSheet } from "./lib/sheets";
import { mergeDatabase } from "./lib/product";
import { getDraft, saveDraft, deleteDraft } from "./lib/draft";
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

export default function App() {
  const firstRender = useRef(true);
  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState([]);
  const [enriched, setEnriched] = useState(false);
  const [userMemory, setUserMemory] = useState({});
  const [statusMsg, setStatusMsg] = useState("");
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
    // Version-triggered memory wipe: old key-format ghosts are cleaned on
    // every version bump so the next syncSheet repopulates with fresh keys.
    const lastVersion = localStorage.getItem("baskit-version");
    if (lastVersion !== __APP_VERSION__) {
      localStorage.setItem("baskit-version", __APP_VERSION__);
      clearMemory().catch(() => {});
    }

    // Restore draft immediately from localStorage (saved synchronously on
    // every keystroke — survives app kill on mobile).
    try {
      const draft = localStorage.getItem("draft-input");
      if (draft) setRawInput(draft);
    } catch {}

    getAllMemory()
      .then((mem) => {
        setUserMemory(mem);
        // Fallback for users with data only in IndexedDB (before sync
        // localStorage writes were added).
        return getDraft().then((d) => { if (d) setRawInput(d); });
      })
      .catch(() => setUserMemory({}));

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

  // Save draft immediately on every change.
  // Async IndexedDB (survives normal tab close) + sync localStorage (survives
  // app kill on mobile where beforeunload doesn't fire).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (rawInput) {
      saveDraft(rawInput);
      try { localStorage.setItem("draft-input", rawInput); } catch {}
    } else {
      deleteDraft();
      try { localStorage.removeItem("draft-input"); } catch {}
    }
  }, [rawInput]);

  useEffect(() => {
    const handle = () => {
      try {
        if (rawInput) localStorage.setItem("draft-input", rawInput);
        else localStorage.removeItem("draft-input");
      } catch {}
    };
    addEventListener("beforeunload", handle);
    return () => removeEventListener("beforeunload", handle);
  }, [rawInput]);

  async function handleEnrich() {
    await doEnrich();
  }

  async function handleLaunch() {
    if (!enriched) {
      await doEnrich();
    } else {
      const text = formatShoppingList(items);
      try { await navigator.clipboard.writeText(text); } catch {}
    }
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
    setStatusMsg(`Ready! ${result.filter(i => i.matched).length} items matched, ${result.filter(i => !i.matched).length} unknown`);
    setTimeout(() => setStatusMsg(""), 3000);
  }

  function handleDeleteItem(id) {
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    const text = formatShoppingList(updated);
    try { navigator.clipboard.writeText(text); } catch {}
  }

  async function handleReset() {
    await clearMemory();
    setUserMemory({});
  }

  async function handleClearInput() {
    if (!window.confirm("Clear the entire list?")) return;
    setRawInput("");
    setEnriched(false);
    setItems([]);
    try { localStorage.removeItem("draft-input"); } catch {}
    await deleteDraft();
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
          <span className="logo">
            <svg viewBox="0 0 100 100" width="22" height="22" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 30h70l-8 50H23L15 30z" />
              <path d="M37 30V20a13 13 0 0 1 26 0v10" />
            </svg>
          </span>
          BaskIt
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
            onClear={handleClearInput}
          />
          {statusMsg && <p className="status-msg">{statusMsg}</p>}

          {enriched && (
            <ReviewPanel
              items={items}
              onDeleteItem={handleDeleteItem}
              onResetInput={handleClearInput}
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
      <p className="foot-hint">Type, prep, paste into BigBasket  <span className="version-badge">{typeof __APP_VERSION__ !== "undefined" ? `v${__APP_VERSION__}` : ""}</span></p>
    </div>
  );
}
