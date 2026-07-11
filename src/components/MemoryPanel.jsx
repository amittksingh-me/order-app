import { useMemo, useRef, useState } from "react";
import ProductTable from "./ProductTable.jsx";
import SyncPanel from "./SyncPanel.jsx";

const PAGE_SIZE = 8;
const EMPTY = { product: "", brand: "", size: "", defaultQty: 1, category: "", keywords: "" };

export default function MemoryPanel({
  builtin,
  userMemory,
  onReset,
  onExport,
  onImport,
  onDeleteLearned,
  onEdit,
  onAdd,
  onSync,
  lastSync,
  syncUrl,
  onUrlChange,
}) {
  const [view, setView] = useState("builtin"); // builtin | learned
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // { key, isNew }
  const [draft, setDraft] = useState(EMPTY);
  const fileRef = useRef();

  // Built-in entries reflect any user overrides so edits show immediately.
  const builtinEntries = useMemo(
    () =>
      Object.entries(builtin).map(([key, v]) => ({
        key,
        ...v,
        ...(userMemory[key] || {}),
      })),
    [builtin, userMemory]
  );
  const learnedEntries = useMemo(
    () => Object.entries(userMemory).map(([key, v]) => ({ key, ...v })),
    [userMemory]
  );

  const source = view === "builtin" ? builtinEntries : learnedEntries;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((e) =>
      [e.product, e.brand, e.category, e.key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [source, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function onSearch(v) {
    setQuery(v);
    setPage(1);
  }
  function switchView(v) {
    setView(v);
    setPage(1);
    setQuery("");
    setEditing(null);
  }

  function startEdit(row) {
    setEditing({ key: row.id, isNew: false });
    setDraft({
      product: row.product || "",
      brand: row.brand || "",
      size: row.size || "",
      defaultQty: row.defaultQty ?? 1,
      category: row.category || "",
      keywords: Array.isArray(row.keywords) ? row.keywords.join("; ") : (row.keywords || ""),
    });
  }
  function startAdd() {
    setEditing({ key: null, isNew: true });
    setDraft(EMPTY);
  }
  function cancelEdit() {
    setEditing(null);
  }
  function saveEdit() {
    const record = {
      product: draft.product.trim(),
      brand: draft.brand.trim(),
      size: draft.size.trim(),
      defaultQty: Number(draft.defaultQty) || 1,
      category: draft.category.trim(),
      keywords: draft.keywords
        ? draft.keywords.split(";").map((k) => k.trim()).filter(Boolean)
        : [],
      alternatives: [],
    };
    if (editing.isNew) {
      onAdd(record);
    } else {
      onEdit(editing.key, record);
    }
    setEditing(null);
  }

  function setField(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function renderEditor() {
    return (
      <div className="editor-form">
        <div className="editor-grid">
          <label>
            Product
            <input
              value={draft.product}
              onChange={(e) => setField("product", e.target.value)}
              placeholder="e.g. Potato"
            />
          </label>
          <label>
            Brand
            <input
              value={draft.brand}
              onChange={(e) => setField("brand", e.target.value)}
              placeholder="e.g. fresho"
            />
          </label>
          <label>
            Size
            <input
              value={draft.size}
              onChange={(e) => setField("size", e.target.value)}
              placeholder="e.g. 1 kg"
            />
          </label>
          <label>
            Qty
            <input
              type="number"
              min="1"
              value={draft.defaultQty}
              onChange={(e) => setField("defaultQty", e.target.value)}
            />
          </label>
          <label className="editor-cat">
            Category
            <input
              value={draft.category}
              onChange={(e) => setField("category", e.target.value)}
              placeholder="e.g. Vegetables"
            />
          </label>
          <label className="editor-kw">
            Keywords
            <input
              value={draft.keywords}
              onChange={(e) => setField("keywords", e.target.value)}
              placeholder="e.g. moisturizer; face cream"
            />
            {draft.keywords.trim() && (
              <div className="kw-chips">
                {draft.keywords.split(";").map((k, i) => {
                  const t = k.trim();
                  return t ? <span key={i} className="kw-chip">{t}</span> : null;
                })}
              </div>
            )}
          </label>
        </div>
        <div className="editor-actions">
          <button className="btn-small" type="button" onClick={saveEdit}>
            Save
          </button>
          <button className="btn-small btn-ghost" type="button" onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="panel memory-panel">
      <div className="stats">
        <button
          className={`stat ${view === "builtin" ? "active" : ""}`}
          onClick={() => switchView("builtin")}
          type="button"
        >
          <span className="stat-num">{builtinEntries.length}</span>
          <span className="stat-label">Built-in</span>
        </button>
        <button
          className={`stat ${view === "learned" ? "active" : ""}`}
          onClick={() => switchView("learned")}
          type="button"
        >
          <span className="stat-num">{learnedEntries.length}</span>
          <span className="stat-label">Learned</span>
        </button>
      </div>

      <SyncPanel
        onSync={onSync}
        lastSync={lastSync}
        syncUrl={syncUrl}
        onUrlChange={onUrlChange}
      />

      <div className="search-box">
        <input
          className="search-input"
          placeholder={`Search ${view === "builtin" ? "built-in" : "learned"} products…`}
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
        {query && (
          <button className="search-clear" type="button" onClick={() => onSearch("")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <button className="btn-secondary add-btn" type="button" onClick={startAdd}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:6}}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add product
      </button>

      {editing && (
        <div className="panel editing-panel">{renderEditor()}</div>
      )}

      {pageItems.length === 0 ? (
        <p className="empty">
          {query ? "No matches found." : "Nothing here yet."}
        </p>
      ) : (
        <ProductTable
          rows={pageItems.map((e) => ({
            id: e.key,
            brand: e.brand,
            product: e.product,
            size: e.size,
            qty: e.defaultQty ?? 1,
            category: e.category,
            defaultQty: e.defaultQty ?? 1,
            keywords: e.keywords,
          }))}
          actions={(e) => (
            <>
              <button
                className="btn-small btn-ghost"
                type="button"
                title="Edit"
                onClick={() => startEdit(e)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              {view === "learned" && (
                <button
                  className="btn-icon"
                  type="button"
                  title="Delete"
                  onClick={() => onDeleteLearned(e.id)}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </>
          )}
        />
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button
            className="btn-small"
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle'}}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>
          <span className="pager-info">
            {safePage} / {totalPages}
          </span>
          <button
            className="btn-small"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            Next
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle'}}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      <div className="settings-actions">
        <button className="btn-secondary" type="button" onClick={onExport}>
          Export DB
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
        >
          Import DB
        </button>
        <button className="btn-danger" type="button" onClick={onReset}>
          Reset Memory
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(ev) => {
            if (ev.target.files && ev.target.files[0]) onImport(ev.target.files[0]);
            ev.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
