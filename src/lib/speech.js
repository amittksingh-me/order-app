export function processSpeechResults(newResults, resultIndex, finalsAccum, interimCache) {
  let iosSequence = false;
  for (let i = 0; i < newResults.length; i++) {
    const idx = resultIndex + i;
    const r = newResults[i];
    if (r.isFinal) {
      const lastFinal = finalsAccum.at(-1);
      if (lastFinal !== undefined && r.transcript.toLowerCase().startsWith(lastFinal.toLowerCase())) {
        finalsAccum[finalsAccum.length - 1] = r.transcript;
      } else if (r.transcript !== lastFinal) {
        finalsAccum.push(r.transcript);
      }
      delete interimCache[idx];
    } else {
      const text = r.transcript.trim().toLowerCase();
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
