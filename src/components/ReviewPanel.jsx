import ProductTable from "./ProductTable.jsx";

function rowStatusCls(item) {
  if (!item.matched) return "row-unknown";
  if (item.fuzzy) return "row-fuzzy";
  return "row-ok";
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
      </div>

      {items.length === 0 ? (
        <p className="empty">No items. Start a new list.</p>
      ) : (
        <ProductTable
          rows={rows}
          rowClass={(r) => {
            const item = items.find((it) => it.id === r.id);
            return item ? rowStatusCls(item) : "";
          }}
          actions={(row) => (
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
          )}
        />
      )}

      <p className="clipboard-hint" style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "16px 0 0" }}>
        Copied to clipboard — paste into BigBasket
      </p>
    </section>
  );
}
