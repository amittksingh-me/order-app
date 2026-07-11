// Final text formatting for copy/export to BigBasket.
// The enriched product title already includes brand, size and unit,
// so we copy only the preferred product name.

export function formatShoppingList(items) {
  return items
    .map((it) => it.preferredProduct || it.input)
    .filter(Boolean)
    .join(", ");
}
