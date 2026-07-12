import { normalizeItem, normalizeText } from "./normalize.js";
import { lookupProduct } from "./lookup.js";

const FILLER = new Set([
  "and", "the", "a", "an", "or", "for", "of", "to", "in", "my",
  "is", "it", "with", "on", "at", "by", "from", "some", "any",
]);

const MAX_WORDS = 4;

export function parseTranscript(transcript, builtin, userMemory) {
  if (!transcript) return [];

  const cleaned = normalizeText(transcript);
  if (!cleaned) return [];

  let tokens = cleaned.split(/\s+/).filter(Boolean);
  tokens = tokens.filter((t) => !FILLER.has(t) && t.length > 1);
  if (!tokens.length) return [];

  const result = [];
  let i = 0;

  while (i < tokens.length) {
    let matched = false;
    const maxLen = Math.min(MAX_WORDS, tokens.length - i);

    for (let len = maxLen; len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const key = normalizeItem(phrase);
      if (key && lookupProduct(key, builtin, userMemory).matched) {
        result.push(phrase);
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result.push(tokens[i]);
      i += 1;
    }
  }

  return result;
}
