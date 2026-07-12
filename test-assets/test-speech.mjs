import { processSpeechResults } from "../src/lib/speech.js";

export function run() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); } };

  const cases = [
    {
      name: "speech-001",
      results: [{ isFinal: false, transcript: "paneer" }],
      finals: ["milk bread paneer"],
      expect: "milk bread paneer",
      resultIndex: 1,
    },
    {
      name: "speech-002",
      results: [
        { isFinal: false, transcript: "milk" },
        { isFinal: false, transcript: "milk bread" },
        { isFinal: false, transcript: "milk bread paneer" },
      ],
      finals: ["milk bread"],
      expect: "milk bread paneer",
      resultIndex: 0,
    },
    {
      name: "speech-003",
      results: [{ isFinal: false, transcript: "paneer" }],
      finals: ["milk bread"],
      expect: "milk bread paneer",
      resultIndex: 2,
    },
    {
      name: "speech-004",
      results: [
        { isFinal: true, transcript: "milk" },
        { isFinal: false, transcript: "milk bread" },
        { isFinal: false, transcript: "milk bread paneer" },
      ],
      finals: [],
      expect: "milk bread paneer",
      resultIndex: 0,
    },
    {
      name: "speech-005",
      results: [{ isFinal: false, transcript: "milk" }],
      finals: [],
      expect: "milk",
      resultIndex: 0,
    },
    {
      name: "speech-006",
      results: [{ isFinal: false, transcript: "bread" }],
      finals: ["milk"],
      expect: "milk bread",
      resultIndex: 1,
    },
  ];

  for (const tc of cases) {
    const acc = [...tc.finals];
    const cache = {};
    const got = processSpeechResults(tc.results, tc.resultIndex, acc, cache);
    ok(got === tc.expect, tc.name);
  }

  // Safari: 3 sequential events with incremental resultIndex
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-safari-multi-event"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "bread" }], 1, acc, cache);
      if (d !== "milk bread") ok(false, "speech-safari-multi-event"); else {
        d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 2, acc, cache);
        ok(d === "milk bread paneer" && JSON.stringify(acc) === "[]", "speech-safari-multi-event");
      }
    }
  }

  // Android: same final result delivered again (resultIndex stays at 0)
  {
    const acc = [];
    const cache = {};
    processSpeechResults([{ isFinal: true, transcript: "milk" }], 0, acc, cache);
    processSpeechResults([{ isFinal: true, transcript: "milk" }], 0, acc, cache);
    ok(JSON.stringify(acc) === `["milk"]`, "speech-android-dedup-finals");
  }

  // Android: full lifecycle (resultIndex=0 each event, repeated finals, cache cleared)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-android-lifecycle"); else {
      d = processSpeechResults([{ isFinal: true, transcript: "milk" }, { isFinal: false, transcript: "milk bread" }], 0, acc, cache);
      if (d !== "milk bread") ok(false, "speech-android-lifecycle"); else {
        d = processSpeechResults([{ isFinal: true, transcript: "milk" }, { isFinal: false, transcript: "milk bread paneer" }], 0, acc, cache);
        ok(d === "milk bread paneer" && JSON.stringify(acc) === `["milk"]`, "speech-android-lifecycle");
      }
    }
  }

  // Android: multiple non-finals in one event (alternative hypotheses)
  {
    const acc = ["milk bread"];
    const cache = {};
    const got = processSpeechResults([
      { isFinal: false, transcript: "milk milk milk bread" },
      { isFinal: false, transcript: "milk bread milk bread paneer" },
    ], 0, acc, cache);
    ok(got === "milk bread milk bread paneer", "speech-android-batch");
  }

  // Android: stale cache cleanup on next event
  {
    const acc = [];
    const cache = {};
    processSpeechResults([
      { isFinal: false, transcript: "milk milk milk bread" },
      { isFinal: false, transcript: "milk bread milk bread paneer" },
    ], 0, acc, cache);
    processSpeechResults([{ isFinal: true, transcript: "milk bread paneer" }], 0, acc, cache);
    ok(JSON.stringify(cache) === "{}" && JSON.stringify(acc) === `["milk bread paneer"]`, "speech-android-cache-cleanup");
  }

  // Safari: first word interim, then finalize + add new word (resultIndex resets to 0)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-safari-finalize-continue"); else {
      d = processSpeechResults([
        { isFinal: true, transcript: "milk" },
        { isFinal: false, transcript: "bread" },
      ], 0, acc, cache);
      if (d !== "milk bread" || JSON.stringify(acc) !== `["milk"]`) ok(false, "speech-safari-finalize-continue"); else {
        d = processSpeechResults([
          { isFinal: true, transcript: "milk" },
          { isFinal: false, transcript: "paneer" },
        ], 0, acc, cache);
        ok(d === "milk paneer", "speech-safari-finalize-continue");
      }
    }
  }

  // Safari: incremental indices (truly new words only, no finalization)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-safari-incremental"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "bread" }], 1, acc, cache);
      if (d !== "milk bread") ok(false, "speech-safari-incremental"); else {
        d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 2, acc, cache);
        ok(d === "milk bread paneer", "speech-safari-incremental");
      }
    }
  }

  // Android: cross-index alternative hypotheses (separate events, different indices)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-android-cross-index-alternatives"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "milk milk bread" }], 0, acc, cache);
      if (d !== "milk milk bread") ok(false, "speech-android-cross-index-alternatives"); else {
        d = processSpeechResults([{ isFinal: false, transcript: "milk bread paneer" }], 1, acc, cache);
        ok(d === "milk bread paneer" && JSON.stringify(cache) === '{"0":"milk milk bread","1":"milk bread paneer"}', "speech-android-cross-index-alternatives");
      }
    }
  }

  // Android: 2 alternative hypotheses in one event (no prefix relationship)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-android-alternatives"); else {
      d = processSpeechResults([
        { isFinal: false, transcript: "milk milk bread" },
        { isFinal: false, transcript: "milk bread paneer" },
      ], 0, acc, cache);
      ok(d === "milk bread paneer", "speech-android-alternatives");
    }
  }

  // iOS: sequential multi-word entries at incremental indices
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk bread" }], 0, acc, cache);
    if (d !== "milk bread") ok(false, "speech-ios-sequential-multiword"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 1, acc, cache);
      if (d !== "milk bread paneer") ok(false, "speech-ios-sequential-multiword"); else {
        d = processSpeechResults([{ isFinal: false, transcript: "paneer butter" }], 1, acc, cache);
        ok(d === "milk bread paneer butter", "speech-ios-sequential-multiword");
      }
    }
  }

  // iOS: actual event pattern from user's log (accumulated text + space-prefixed new word)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-ios-singleword-with-pauses"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "milk" }, { isFinal: false, transcript: " bread" }], 0, acc, cache);
      if (d !== "milk bread") ok(false, "speech-ios-singleword-with-pauses"); else {
        d = processSpeechResults([{ isFinal: false, transcript: "milk bread" }], 0, acc, cache);
        if (d !== "milk bread") ok(false, "speech-ios-singleword-with-pauses"); else {
          d = processSpeechResults([{ isFinal: false, transcript: "milk bread" }, { isFinal: false, transcript: " paneer" }], 0, acc, cache);
          if (d !== "milk bread paneer") ok(false, "speech-ios-singleword-with-pauses"); else {
            d = processSpeechResults([{ isFinal: true, transcript: "milk bread paneer" }], 0, acc, cache);
            ok(d === "milk bread paneer", "speech-ios-singleword-with-pauses");
          }
        }
      }
    }
  }

  // Safari: finalize-continue pattern with multi-word entries
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk bread" }], 0, acc, cache);
    if (d !== "milk bread") ok(false, "speech-safari-finalize-continue-multiword"); else {
      d = processSpeechResults([
        { isFinal: true, transcript: "milk" },
        { isFinal: false, transcript: "bread paneer" },
      ], 0, acc, cache);
      if (d !== "milk bread paneer") ok(false, "speech-safari-finalize-continue-multiword"); else {
        d = processSpeechResults([
          { isFinal: true, transcript: "milk" },
          { isFinal: false, transcript: "paneer butter" },
        ], 0, acc, cache);
        ok(d === "milk paneer butter", "speech-safari-finalize-continue-multiword");
      }
    }
  }

  // Android: cross-index where later IS a prefix of earlier
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk bread paneer" }], 0, acc, cache);
    if (d !== "milk bread paneer") ok(false, "speech-android-cross-index-prefix"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "milk bread" }], 1, acc, cache);
      ok(d === "milk bread", "speech-android-cross-index-prefix");
    }
  }

  // Android: 3 non-finals in one event (batch heuristic + overlap)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([
      { isFinal: false, transcript: "milk milk bread" },
      { isFinal: false, transcript: "milk bread paneer" },
      { isFinal: false, transcript: "milk paneer butter" },
    ], 0, acc, cache);
    ok(d === "milk paneer butter", "speech-android-batch-three");
  }

  // Android: multiple finals in one event, no interims
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([
      { isFinal: true, transcript: "milk" },
      { isFinal: true, transcript: "bread" },
    ], 0, acc, cache);
    ok(d === "milk bread" && JSON.stringify(acc) === `["milk","bread"]`, "speech-android-oneshot-only-finals");
  }

  // iOS: non-consecutive indices (index 0, then index 2 — gap at 1)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: false, transcript: "milk" }], 0, acc, cache);
    if (d !== "milk") ok(false, "speech-ios-index-jumps"); else {
      d = processSpeechResults([{ isFinal: false, transcript: "paneer" }], 2, acc, cache);
      ok(d === "milk paneer", "speech-ios-index-jumps");
    }
  }

  // Android: cumulative finals at incrementing resultIndex (reproducing real Android events)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: true, transcript: "" }], 0, acc, cache);
    if (d !== "") ok(false, "speech-android-cumulative-finals"); else {
      d = processSpeechResults([{ isFinal: true, transcript: "milk" }], 1, acc, cache);
      if (d !== "milk") ok(false, "speech-android-cumulative-finals"); else {
        d = processSpeechResults([{ isFinal: true, transcript: "milk" }], 2, acc, cache);
        if (d !== "milk") ok(false, "speech-android-cumulative-finals"); else {
          d = processSpeechResults([{ isFinal: true, transcript: "milk bread" }], 3, acc, cache);
          if (d !== "milk bread") ok(false, "speech-android-cumulative-finals"); else {
            d = processSpeechResults([{ isFinal: true, transcript: "milk bread" }], 4, acc, cache);
            if (d !== "milk bread") ok(false, "speech-android-cumulative-finals"); else {
              d = processSpeechResults([{ isFinal: true, transcript: "milk bread paneer" }], 5, acc, cache);
              if (d !== "milk bread paneer") ok(false, "speech-android-cumulative-finals"); else {
                d = processSpeechResults([{ isFinal: true, transcript: "milk bread paneer" }], 6, acc, cache);
                ok(d === "milk bread paneer" && JSON.stringify(acc) === `["milk bread paneer"]`, "speech-android-cumulative-finals");
              }
            }
          }
        }
      }
    }
  }

  // Android: cumulative finals with casing change (Nariyal tel → Nariyal Tel)
  {
    const acc = [];
    const cache = {};
    let d = processSpeechResults([{ isFinal: true, transcript: "" }], 0, acc, cache);
    if (d !== "") ok(false, "speech-android-cumulative-finals-casing"); else {
      d = processSpeechResults([{ isFinal: true, transcript: "Nariyal" }], 1, acc, cache);
      if (d !== "Nariyal") ok(false, "speech-android-cumulative-finals-casing"); else {
        d = processSpeechResults([{ isFinal: true, transcript: "Nariyal tel" }], 2, acc, cache);
        if (d !== "Nariyal tel") ok(false, "speech-android-cumulative-finals-casing"); else {
          d = processSpeechResults([{ isFinal: true, transcript: "Nariyal Tel" }], 3, acc, cache);
          ok(d === "Nariyal Tel" && JSON.stringify(acc) === `["Nariyal Tel"]`, "speech-android-cumulative-finals-casing");
        }
      }
    }
  }

  return { pass, fail };
}
