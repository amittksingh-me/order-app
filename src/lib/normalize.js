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
// Applied per-word; words ending in "us" are excluded from the s-rule
// to avoid stripping valid singulars like "citrus".
function singularizeWord(w) {
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ses") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && w.length > 3) return w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 6) {
    let root = w.slice(0, -3);
    root = root.replace(/([b-df-hj-np-tv-z])\1$/, "$1");
    return root;
  }
  return w;
}

export function toSingular(normalized) {
  if (!normalized) return normalized;
  return normalized.split(/\s+/).map(singularizeWord).join(" ");
}

const UNIT_PATTERN = /\d+(\.\d+|\s+\d+(\.\d+)?)?\s*(g|kg|l|ml|m|cm|pcs|pc|pack|oz|lb|pound)\b/g;

function stripUnits(normalized) {
  return normalized.replace(UNIT_PATTERN, "").replace(/\s+/g, " ").trim();
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
// Units are stripped before singularization so "Eggs 6 pcs" -> "egg".
export function normalizeItem(raw) {
  const trimmed = normalizeText(raw);
  if (!trimmed) return "";
  return correctSpelling(stripUnits(trimmed));
}
