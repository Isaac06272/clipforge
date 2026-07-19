export default function RatioPicker({ value, onChange }) {
  // Define our options with specific width/height Tailwind classes to draw the shapes
  const options = [
    { id: "16:9", label: "Landscape", iconClass: "w-6 h-3.5" }, // Wider than tall
    { id: "9:16", label: "Portrait", iconClass: "w-3.5 h-6" },  // Taller than wide
    { id: "1:1", label: "Square", iconClass: "w-5 h-5" },       // Equal sides
  ];

  return (
    <div className="flex gap-3">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-2.5 py-4 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "bg-surface-2 border-accent shadow-sm"
                : "bg-surface border-border hover:border-border-strong hover:bg-surface-2/50"
            }`}
          >
            {/* The Visual Shape Indicator */}
            <div className="h-8 flex items-center justify-center">
              <div 
                className={`border-2 rounded-sm transition-colors ${
                  isSelected ? "border-accent text-accent" : "border-text-secondary"
                } ${opt.iconClass}`} 
              />
            </div>
            
            {/* The Text Labels */}
            <div className="text-center">
              <p className={`font-display text-sm font-medium mb-0.5 ${
                isSelected ? "text-text-primary" : "text-text-secondary"
              }`}>
                {opt.id}
              </p>
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                {opt.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}