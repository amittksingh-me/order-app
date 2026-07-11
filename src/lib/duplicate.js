// Duplicate detection across raw input lines.
// Two lines are duplicates if their normalized keys match.

import { normalizeItem } from "./normalize.js";

export function detectDuplicates(lines) {
  // Returns array of { key, count, originalLines: [] }
  const groups = new Map();
  lines.forEach((line) => {
    const key = normalizeItem(line);
    if (!key) return; // skip empty lines
    if (!groups.has(key)) {
      groups.set(key, { key, count: 0, originals: [] });
    }
    groups.get(key).count += 1;
    groups.get(key).originals.push(line.trim());
  });
  return Array.from(groups.values());
}
