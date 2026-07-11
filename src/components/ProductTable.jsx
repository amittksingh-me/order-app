// Shared product table used by both the List (review) view and the Memory view.
// Columns: Brand | Product | Size | Qty. An optional actions column is rendered
// via the `actions(row)` prop so each view can supply its own buttons.
// When `editingId` matches a row and `renderEditor(row)` is provided, that row
// is replaced by an editor row (used by the Memory page).

export default function ProductTable({ rows, actions, editingId, renderEditor }) {
  return (
    <div className="table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th>Brand</th>
            <th>Product</th>
            <th>Size</th>
            <th>Qty</th>
            {actions && <th aria-label="actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            editingId && r.id === editingId && renderEditor ? (
              <tr key={r.id} className="editing-row">
                <td colSpan={actions ? 5 : 4}>{renderEditor(r)}</td>
              </tr>
            ) : (
              <tr key={r.id}>
                <td>{r.brand || "—"}</td>
                <td className="pc-name">{r.product}</td>
                <td>{r.size || "—"}</td>
                <td>{r.qty}</td>
                {actions && <td className="row-actions">{actions(r)}</td>}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
