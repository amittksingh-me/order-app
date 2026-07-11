export default function InputPanel({ value, onChange, onEnrich, disabled }) {
  return (
    <section className="panel input-panel">
      <textarea
        className="item-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Type your shopping items...\n\nExample:\nmilk\nbread\neggs\ntomato"}
        rows={8}
      />
      <div className="input-actions">
        <button className="btn-secondary" onClick={() => onChange("")} type="button">
          Clear
        </button>
        <button className="btn-primary" onClick={onEnrich} type="button">
          ✨ Enrich List
        </button>
      </div>
    </section>
  );
}
