import { useState } from "react";
import { syncSheet } from "../lib/sheets.js";

const STORAGE_KEY = "sheet-csv-url";

function loadUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
function saveUrl(url) {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {}
}

export default function SyncPanel({ onSync }) {
  const [url, setUrl] = useState(loadUrl);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!loadUrl());

  async function handleSync() {
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus({ type: "error", message: "Paste the CSV URL first" });
      return;
    }
    setLoading(true);
    setStatus(null);
    saveUrl(trimmed);
    try {
      const result = await syncSheet(trimmed);
      setStatus({ type: "success", message: `Synced ${result.count} products` });
      onSync(result.memory);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Sync failed" });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setUrl("");
    setStatus(null);
    saveUrl("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <details
      className="panel sync-panel"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary className="sync-summary">Google Sheets Sync</summary>

      <div className="sync-body">
        <label className="sync-label">Sheet CSV URL</label>
        <input
          className="sync-input"
          type="url"
          placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div className="sync-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? "Syncing\u2026" : "Sync from Sheet"}
          </button>
          {url && (
            <button className="btn-link" type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        {status && (
          <p className={`sync-status sync-${status.type}`}>{status.message}</p>
        )}

        <details className="sync-help">
          <summary>How to set up</summary>
          <ol className="sync-steps">
            <li>
              In your sheet, create a header row:{" "}
              <code>brand</code> | <code>product</code> | <code>size</code> |{" "}
              <code>qty</code> | <code>category</code> | <code>keywords</code>
              <br />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Keywords: semicolon-separated, e.g. <code>tomato; tamatar; hybrid tomato</code>
              </span>
            </li>
            <li>
              <strong>File &rarr; Share &rarr; Publish to web</strong>
            </li>
            <li>
              Choose <strong>"Comma-separated values (.csv)"</strong>
            </li>
            <li>Click <strong>Publish</strong> and copy the generated URL</li>
            <li>
              Paste it above and tap <strong>Sync from Sheet</strong>
            </li>
          </ol>
        </details>
      </div>
    </details>
  );
}
