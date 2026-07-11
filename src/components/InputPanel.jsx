export default function InputPanel({ value, onChange, onEnrich, disabled }) {
  return (
    <section className="panel input-panel">
      <textarea
        className="item-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Type items, one per line...\n\ne.g.\nmilk\nbread\neggs\ntomato"}
        rows={8}
      />
      <div className="input-actions">
        <button className="btn-secondary" onClick={() => onChange("")} type="button">
          Clear
        </button>
        <button className="btn-primary" onClick={onEnrich} type="button">
          Enrich List
        </button>
      </div>
    </section>
  );
}
