import ProductTable from "./ProductTable.jsx";

export default function ReviewPanel({ items, onCopy, copied, onResetInput }) {
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

      <button className="btn-primary copy-btn" type="button" onClick={onCopy}>
        {copied ? "Copied!" : "Copy Shopping List"}
      </button>
    </section>
  );
}
