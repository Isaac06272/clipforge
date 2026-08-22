export default function RatioPicker({ value, onChange, disabled }) {
  const options = [
    { id: "16:9", label: "Landscape", desc: "16:9", icon: (
      <svg width="24" height="16" viewBox="0 0 16 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="0.5" y="0.5" width="15" height="8" rx="1" />
      </svg>
    )},
    { id: "9:16", label: "Portrait", desc: "9:16", icon: (
      <svg width="16" height="24" viewBox="0 0 9 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="0.5" y="0.5" width="8" height="15" rx="1" />
      </svg>
    )},
    { id: "1:1", label: "Square", desc: "1:1", icon: (
      <svg width="20" height="20" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
      </svg>
    )},
  ];

  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Aspect ratio">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onChange(opt.id)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center justify-center gap-3 py-5 rounded-xl border transition-all relative ${
              isSelected
                ? "bg-accent-muted border-accent shadow-sm"
                : "bg-bg-card border-border hover:border-border-strong hover:bg-bg-surface"
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center text-accent-glow">
              {opt.icon}
            </div>

            <div className="text-center">
              <p className={`font-display text-sm font-medium ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                {opt.desc}
              </p>
              <p className="text-label text-text-muted">{opt.label}</p>
            </div>

            {isSelected && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-accent rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}