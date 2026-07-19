import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";

export default function Select() {
  const navigate = useNavigate();
  const { candidates, selectedIds, toggleSelected, exportSelected } = useSession();
  const [exporting, setExporting] = useState(false);

  // Dynamic assignment of server endpoint base URLs
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
            <div
              key={c.id}
              className={`rounded-lg border p-2.5 bg-surface transition-colors flex flex-col ${
                isSelected ? "border-accent" : "border-border-strong"
              }`}
            >
              {/* Media Player Container Element */}
              <div className="relative h-48 bg-surface-2 rounded-md overflow-hidden mb-2 border border-border">
                <video 
                  src={`${API_BASE_URL}${c.url}`}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
                <button
                  type="button"
                  onClick={() => toggleSelected(c.id)}
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs border cursor-pointer transition-colors shadow-md ${
                    isSelected ? "bg-accent border-accent text-bg" : "border-text-secondary bg-black/60 text-white"
                  }`}
                >
                  ✓
                </button>
              </div>
              
              <div className="mt-auto pt-1 flex items-center justify-between">
                <p className="font-mono text-[11px] text-accent-2">{c.score}</p>
                <p className="font-mono text-xs text-text-muted">{c.duration}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={selectedIds.size === 0 || exporting}
        className="w-full bg-accent text-bg font-medium text-sm rounded-lg py-3.5 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
      >
        {exporting ? "Exporting…" : "Export selected clips"}
      </button>
    </div>
  );
}