import { useState, useRef, useEffect } from "react";

export default function InputPanel({ value, onChange, onEnrich, onLaunch, onClear }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const silenceTimerRef = useRef(null);
  const transcriptAccumRef = useRef([]);
  const preRecordingTextRef = useRef(null);
  const textareaRef = useRef(null);

  const handleClear = () => {
    onClear();
    textareaRef.current?.focus();
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  const SILENCE_MS = 2000;

  useEffect(() => {
    if (!supported) return;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-IN";

    recog.onresult = (event) => {
      let currentFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += (currentFinal ? " " : "") + result[0].transcript;
        }
      }
      // Only the last result matters for interim (each result is cumulative)
      const last = event.results[event.results.length - 1];
      const interim = last.isFinal ? "" : last[0].transcript;

      if (currentFinal) {
        transcriptAccumRef.current.push(currentFinal);
      }

      // Push live transcript into the textarea via parent state
      const finals = transcriptAccumRef.current.join(" ");
      const live = finals + (interim ? " " + interim : "");
      const pre = preRecordingTextRef.current;
      onChangeRef.current(pre ? pre + "\n" + live : live);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        recog.stop();
      }, SILENCE_MS);
    };

    recog.onerror = () => setListening(false);

    recog.onend = () => {
      setListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      const acc = transcriptAccumRef.current;
      transcriptAccumRef.current = [];
      const pre = preRecordingTextRef.current;
      preRecordingTextRef.current = null;
      if (acc.length > 0) {
        const text = acc.join(" ").trim();
        onChangeRef.current(pre ? pre + "\n" + text : text);
      }
    };

    recognitionRef.current = recog;

    return () => {
      recog.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [supported]);

  function toggleMic() {
    const recog = recognitionRef.current;
    if (!recog) return;
    if (listening) {
      recog.stop();
      setListening(false);
    } else {
      preRecordingTextRef.current = value;
      try {
        recog.start();
        setListening(true);
      } catch {
        setListening(false);
        preRecordingTextRef.current = null;
      }
    }
  }

  return (
    <section className="panel input-panel">
      <div className="input-textarea-wrap">
        <textarea
          ref={textareaRef}
          className="item-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"Type or speak items, one per line...\n\ne.g.\nmilk\nbread\neggs\ntomato"}
          rows={8}
        />
        {supported && (
          <button
            className={`mic-btn ${listening ? "listening" : ""}`}
            onClick={toggleMic}
            type="button"
            title={listening ? "Stop listening" : "Start voice input"}
          >
            {listening ? (
              <span className="mic-icon">
                <span className="mic-wave">
                  <span /><span /><span />
                </span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}
{value && (
            <button className="clear-btn" onClick={handleClear} type="button" title="Clear list">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="input-actions">
        <button className="btn-primary" onClick={onEnrich} type="button">
          Prep List
        </button>
        <button className="btn-secondary" onClick={onLaunch} type="button">
          Launch BigBasket
        </button>
      </div>
    </section>
  );
}
