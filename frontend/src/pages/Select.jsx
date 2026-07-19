import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";

export default function Select() {
  const navigate = useNavigate();
  const { candidates, selectedIds, toggleSelected, exportSelected } = useSession();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportSelected();
      navigate("/export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 03</p>
      <h1 className="font-display font-bold text-2xl mb-1.5">Choose your clips</h1>
      <p className="text-sm text-text-secondary mb-6">
        {selectedIds.size} {selectedIds.size === 1 ? "clip" : "clips"} selected
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-8">
        {candidates.map((c) => {
          const isSelected = selectedIds.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleSelected(c.id)}
              className={`text-left rounded-lg border p-2.5 transition-colors ${
                isSelected ? "border-accent" : "border-border-strong hover:border-text-secondary"
              }`}
            >
              <div className="relative h-32 bg-surface-2 rounded-md flex items-center justify-center text-text-secondary mb-2">
                ▶
                <span
                  className={`absolute top-1.5 right-1.5 w-4.5 h-4.5 w-[18px] h-[18px] rounded flex items-center justify-center text-[11px] border ${
                    isSelected ? "bg-accent border-accent text-bg" : "border-text-secondary bg-black/40 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
              <p className="font-mono text-[11px] text-accent-2 mb-0.5">{c.score}</p>
              <p className="font-mono text-xs text-text-muted">{c.duration}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={selectedIds.size === 0 || exporting}
        className="w-full bg-accent text-bg font-medium text-sm rounded-lg py-3.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {exporting ? "Exporting…" : "Export selected clips"}
      </button>
    </div>
  );
}
