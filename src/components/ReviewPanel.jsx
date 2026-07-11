import ProductTable from "./ProductTable.jsx";

const STATUS_LABEL = {
  "user-memory": { label: "Memory", cls: "status-ok" },
  builtin: { label: "Matched", cls: "status-ok" },
  unknown: { label: "Unknown", cls: "status-unknown" },
};

function statusInfo(it) {
  if (it.fuzzy) return { label: "Fuzzy", cls: "status-fuzzy" };
  return STATUS_LABEL[it.source] || { label: "Unknown", cls: "status-unknown" };
}

export default function ReviewPanel({ items, onDeleteItem, onResetInput }) {
  const rows = items.map((it) => ({
    id: it.id,
    brand: it.brand,
    product: it.product || it.preferredProduct,
    size: it.size,
    qty: it.quantity,
  }));

  return (
    <section className="panel review-panel">
      <div className="review-header">
        <h2>Review</h2>
        <button className="btn-link" type="button" onClick={onResetInput}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:4}}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          New list
        </button>
      </div>

      {items.length === 0 ? (
        <p className="empty">No items. Start a new list.</p>
      ) : (
        <ProductTable
          rows={rows}
          actions={(row) => {
            const item = items.find((it) => it.id === row.id);
            return (
              <>
                {item && (
                  <span className={`status-badge ${statusInfo(item).cls}`}>
                    {statusInfo(item).label}
                  </span>
                )}
                <button
                  className="btn-icon btn-icon-sm"
                  type="button"
                  onClick={() => onDeleteItem(row.id)}
                  title="Remove item"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            );
          }}
        />
      )}

      <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "16px 0 0" }}>
        Copied to clipboard — paste into BigBasket
      </p>
    </section>
  );
}
