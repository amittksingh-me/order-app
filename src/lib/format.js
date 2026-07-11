// Final text formatting for copy/export to BigBasket.
// The enriched product title already includes brand, size and unit,
// so we copy only the preferred product name.

export function formatShoppingList(items) {
  const sorted = [...items].sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? 1 : -1;
    return 0;
  });
  return sorted
    .map((it) => it.preferredProduct || it.input)
    .filter(Boolean)
    .join(", ");
}
