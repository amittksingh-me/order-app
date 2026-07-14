import { useState } from "react";
import { syncSheet } from "../lib/sheets.js";

const STORAGE_KEY = "sheet-csv-url";

const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeqQBp7FYdB6BzQ20Y3Q-rFDuQemV50OpQIetw7LDI0hVBM4NEGYwyLm58s77UEWyp89ygXRixzVTI/pub?gid=0&single=true&output=csv";

function loadUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}
function saveUrl(url) {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {}
}

export default function SyncPanel({ onSync, lastSync, syncUrl, onUrlChange, syncErrors, onSyncErrors }) {
  const [url, setUrl] = useState(loadUrl);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  async function handleSync() {
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus({ type: "error", message: "Paste the CSV URL first" });
      return;
    }
    setLoading(true);
    setStatus(null);
    setErrors(null);
    saveUrl(trimmed);
    onUrlChange(trimmed);
    try {
      const result = await syncSheet(trimmed);
      const base = `Synced ${result.count} products`;
      setStatus({ type: "success", message: result.errors ? `${base} (${result.errors.length} issue${result.errors.length !== 1 ? 's' : ''})` : base });
      setErrors(result.errors || null);
      onSyncErrors(result.errors || null);
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
    onUrlChange("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <details
      className="sync-details"
      open={!syncUrl}
    >
      <summary className="sync-summary">
        <span className="sync-summary-title">Sheets Sync</span>
        <span className="sync-summary-status">
          {lastSync && `synced ${ago(lastSync)}`}
        </span>
      </summary>

      <div className="sync-body">
        <label className="sync-label">Sheet CSV URL</label>
        <div className="sync-row">
          <input
            className="sync-input"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="btn-primary"
            type="button"
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? "Syncing" : "Sync"}
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

        {((errors && errors.length > 0) || (syncErrors && syncErrors.length > 0 && !errors)) && (
          <details className="sync-error-details">
            <summary className="sync-error-toggle">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:6}}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {(errors || syncErrors).length} row{(errors || syncErrors).length !== 1 ? 's' : ''} skipped
            </summary>
            <ul className="sync-error-list">
              {(errors || syncErrors).map((e, i) => (
                <li key={i} className="sync-error-row">
                  Row {e.row} — {e.reason}
                </li>
              ))}
            </ul>
          </details>
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
              Paste it above and tap <strong>Sync</strong>
            </li>
          </ol>
        </details>
      </div>
    </details>
  );
}

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
