import { useState, useRef, useEffect } from "react";

export default function InputPanel({ value, onChange, onEnrich, onLaunch }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  useEffect(() => {
    if (!supported) return;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-IN";

    recog.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += (final ? " " : "") + result[0].transcript;
        }
      }
      if (final) {
        onChangeRef.current((prev) => {
          const trimmed = prev.trimEnd();
          return trimmed ? trimmed + "\n" + final.trim() : final.trim();
        });
      }
    };

    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);

    recognitionRef.current = recog;

    return () => {
      recog.abort();
    };
  }, [supported]);

  function toggleMic() {
    const recog = recognitionRef.current;
    if (!recog) return;
    if (listening) {
      recog.stop();
      setListening(false);
    } else {
      try {
        recog.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  return (
    <section className="panel input-panel">
      <div className="input-textarea-wrap">
        <textarea
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
                <span className="mic-pulse" />
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
        {listening && <span className="mic-status">Listening…</span>}
      </div>
      <div className="input-actions">
        <button className="btn-primary" onClick={onEnrich} type="button">
          Enrich &amp; Copy
        </button>
        <button className="btn-secondary" onClick={onLaunch} type="button">
          Launch BigBasket
        </button>
      </div>
    </section>
  );
}
