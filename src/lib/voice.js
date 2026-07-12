// Voice input parsing and interim result processing for live speech preview.
// Multi-word phrases that exist in the database are kept as single lines;
// unknown words fall through as individual lines.

import { normalizeItem, normalizeText } from "./normalize.js";
import { lookupProduct } from "./lookup.js";

const FILLER = new Set([
  "and", "the", "a", "an", "or", "for", "of", "to", "in", "my",
  "is", "it", "with", "on", "at", "by", "from", "some", "any",
]);

const MAX_WORDS = 4;

export function parseTranscript(transcript, builtin, userMemory) {
  if (!transcript) return [];

  // Light clean only — preserve original word forms for phrase joining
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

    // Try longest phrase first
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

/**
 * Process new speech recognition results and compute the live display string.
 * 
 * @param {Array<{isFinal:boolean, transcript:string}>} newResults - Results from event.resultIndex onward
 * @param {string[]} finalsAccum - Mutable accumulator of finalized transcripts (mutated in-place)
 * @returns {string} The full display string (finals + live suffix)
 */
export function processSpeechResults(newResults, finalsAccum) {
  for (const r of newResults) {
    if (r.isFinal && r.transcript !== finalsAccum.at(-1)) {
      finalsAccum.push(r.transcript);
    }
  }

  let liveSuffix = "";
  for (let i = newResults.length - 1; i >= 0; i--) {
    if (!newResults[i].isFinal) {
      liveSuffix = newResults[i].transcript;
      break;
    }
  }

  const finals = finalsAccum.join(" ");
  const lastFinal = finalsAccum.at(-1) || "";

  if (liveSuffix && finals.includes(liveSuffix)) {
    liveSuffix = "";
  } else if (liveSuffix && lastFinal && liveSuffix.startsWith(lastFinal)) {
    liveSuffix = liveSuffix.slice(lastFinal.length).trim();
  }

  return finals + (liveSuffix ? (finals ? " " : "") + liveSuffix : "");
}
