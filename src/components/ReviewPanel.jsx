import ProductTable from "./ProductTable.jsx";

export default function ReviewPanel({ items, onResetInput }) {
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
          New list
        </button>
      </div>

      {items.length === 0 ? (
        <p className="empty">No items. Start a new list.</p>
      ) : (
        <ProductTable rows={rows} />
      )}

      <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "16px 0 0" }}>
        Copied to clipboard — paste into BigBasket
      </p>
    </section>
  );
}
