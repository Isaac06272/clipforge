const RATIOS = ["9:16", "1:1", "4:5", "16:9"];

export default function RatioPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATIOS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`rounded-lg border px-2 py-3 text-center font-mono text-xs transition-colors ${
            value === r
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-strong text-text-secondary hover:border-text-secondary"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
