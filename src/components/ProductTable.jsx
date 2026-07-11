// Shared product table used by both the List (review) view and the Memory view.
// Columns: Brand | Product | Size | Qty. An optional actions column is rendered
// via the `actions(row)` prop so each view can supply its own buttons.
// When `editingId` matches a row and `renderEditor(row)` is provided, that row
// is replaced by an editor row (used by the Memory page).

export default function ProductTable({ rows, actions, editingId, renderEditor, rowClass }) {
  return (
    <div className="table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            {actions && <th aria-label="actions" />}
            <th>Brand</th>
            <th>Product</th>
            <th>Size</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            editingId && r.id === editingId && renderEditor ? (
              <tr key={r.id} className="editing-row">
                <td colSpan={actions ? 5 : 4}>{renderEditor(r)}</td>
              </tr>
            ) : (
              <tr key={r.id} className={rowClass?.(r) || ""}>
                {actions && <td className="row-actions">{actions(r)}</td>}
                <td data-label="Brand">{r.brand || "—"}</td>
                <td className="pc-name" data-label="">{r.product}</td>
                <td data-label="Size">{r.size || "—"}</td>
                <td data-label="Qty">{r.qty}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
