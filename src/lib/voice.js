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
 * Uses a cross-event interimCache keyed by result index:
 *   - Trims space-prefixed transcripts iOS may send
 *   - Detects when iOS delivers a single new word at index 0 that doesn't
 *     continue from the existing entry, and stores it at the next free index
 *   - Word-overlap detection in the distinct loop handles Android alternative
 *     hypotheses (high word overlap → replace, low → append)
 * 
 * @param {Array<{isFinal:boolean, transcript:string}>} newResults - Results from event.resultIndex onward
 * @param {number} resultIndex - The event.resultIndex value
 * @param {string[]} finalsAccum - Mutable accumulator of finalized transcripts (mutated in-place)
 * @param {Object} interimCache - Mutable cache keyed by result index (mutated in-place)
 * @returns {string} The full display string (finals + live suffix)
 */
export function processSpeechResults(newResults, resultIndex, finalsAccum, interimCache) {
  let iosSequence = false;
  for (let i = 0; i < newResults.length; i++) {
    const idx = resultIndex + i;
    const r = newResults[i];
    if (r.isFinal) {
      if (r.transcript !== finalsAccum.at(-1)) {
        finalsAccum.push(r.transcript);
      }
      delete interimCache[idx];
    } else {
      const text = r.transcript.trim();
      let storeIdx = idx;
      if (idx === 0 && interimCache[0] !== undefined) {
        const existing = interimCache[0];
        const eWords = existing.split(/\s+/).filter(Boolean);
        const nWords = text.split(/\s+/).filter(Boolean);
        if (eWords.length <= 1 && nWords.length <= 1 && !text.startsWith(existing)) {
          const keys = Object.keys(interimCache).map(Number).sort((a, b) => a - b);
          storeIdx = keys.length > 0 ? keys[keys.length - 1] + 1 : 0;
          iosSequence = true;
        }
      }
      interimCache[storeIdx] = text;
    }
  }

  if (resultIndex === 0 && !iosSequence) {
    for (const k of Object.keys(interimCache)) {
      if (+k >= resultIndex + newResults.length) delete interimCache[k];
    }
  }

  const indices = Object.keys(interimCache).sort((a, b) => +a - +b);
  const distinct = [];
  for (const idx of indices) {
    const t = interimCache[idx];
    if (distinct.length && t.startsWith(distinct.at(-1))) {
      distinct[distinct.length - 1] = t;
    } else if (distinct.length) {
      const last = distinct.at(-1);
      const lastWords = last.split(/\s+/).filter(Boolean);
      const tWords = t.split(/\s+/).filter(Boolean);
      if (lastWords.length >= 2 && tWords.length >= 2) {
        const lastSet = new Set(lastWords);
        const overlap = tWords.filter(w => lastSet.has(w)).length;
        if (overlap >= Math.min(lastWords.length, tWords.length) * 0.5) {
          distinct[distinct.length - 1] = t;
          continue;
        }
      }
      distinct.push(t);
    } else {
      distinct.push(t);
    }
  }

  let liveSuffix = distinct.join(" ");
  const finals = finalsAccum.join(" ");
  const lastFinal = finalsAccum.at(-1) || "";

  if (liveSuffix && finals.includes(liveSuffix)) {
    liveSuffix = "";
  } else if (liveSuffix && lastFinal && liveSuffix.startsWith(lastFinal)) {
    liveSuffix = liveSuffix.slice(lastFinal.length).trim();
  }

  return finals + (liveSuffix ? (finals ? " " : "") + liveSuffix : "");
}
