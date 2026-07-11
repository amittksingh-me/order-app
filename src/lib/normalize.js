// Input normalization utilities.
// Goal: collapse trivial variants of an item into a comparable key.

export function normalizeText(raw) {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") // punctuation -> space
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

// Singular/plural handling: strip trailing plural markers so that
// "tomatoes" and "tomato" resolve to the same base key.
export function toSingular(normalized) {
  if (!normalized) return normalized;
  if (normalized.endsWith("ies") && normalized.length > 4) {
    return normalized.slice(0, -3) + "y"; // tomatoes -> tomato
  }
  if (normalized.endsWith("ses") && normalized.length > 4) {
    return normalized.slice(0, -2); // glasses -> glass
  }
  if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) {
    return normalized.slice(0, -1); // eggs -> egg, breads -> bread
  }
  return normalized;
}

// Common spelling corrections (lightweight, manually curated).
const SPELLING_FIXES = {
  milkk: "milk",
  bred: "bread",
  bredd: "bread",
  brread: "bread",
  tomoto: "tomato",
  tamato: "tomato",
  tamatar: "tomato",
  ricee: "rice",
};

export function correctSpelling(normalized) {
  if (SPELLING_FIXES[normalized]) return SPELLING_FIXES[normalized];
  const singular = toSingular(normalized);
  if (SPELLING_FIXES[singular]) return SPELLING_FIXES[singular];
  return singular;
}

// Full pipeline: returns the normalized search key used for lookup.
export function normalizeItem(raw) {
  const trimmed = normalizeText(raw);
  if (!trimmed) return "";
  return correctSpelling(trimmed);
}
