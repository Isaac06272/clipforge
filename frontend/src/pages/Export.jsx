import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";
import RatioPicker from "../components/RatioPicker";

export default function Export() {
  const navigate = useNavigate();
  const { results, ratio, reexportAll } = useSession();
  const [pendingRatio, setPendingRatio] = useState(ratio);
  const [reexporting, setReexporting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  async function handleReexport() {
    setReexporting(true);
    try {
      await reexportAll(pendingRatio);
    } finally {
      setReexporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 04</p>
      <h1 className="font-display font-bold text-2xl mb-7">Your clips are ready</h1>

      <div className="grid sm:grid-cols-2 gap-3.5 mb-7">
        {results.map((clip) => (
          <div key={clip.id} className="flex gap-3.5 bg-surface border border-border rounded-lg p-3.5 items-center">
            <div className="w-20 h-28 bg-surface-2 rounded-md overflow-hidden flex-shrink-0 border border-border">
              <video
                src={`${API_BASE_URL}${clip.url}`}
                className="w-full h-full object-cover pointer-events-none"
                preload="metadata"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-display text-sm font-medium mb-0.5">{clip.name}</h4>
              <p className="font-mono text-[11px] text-text-secondary mb-3">
                {clip.duration} · {clip.ratio} · {clip.mode === "prompt" ? "custom prompt" : "auto edit"}
              </p>
              <a
                href={`${API_BASE_URL}${clip.downloadUrl}`}
                download
                className="inline-block text-[11px] bg-accent text-bg font-medium rounded-md px-3 py-2 text-center hover:opacity-90 transition-opacity"
              >
                ↓ Download MP4
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4.5 mb-3.5">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-1">
          Change ratio and re-export all
        </p>
        <p className="text-[11px] text-text-muted mb-3.5">
          Reuses the same edit for every clip — just reframes and re-renders.
        </p>
        <div className="mb-3.5">
          <RatioPicker value={pendingRatio} onChange={setPendingRatio} />
        </div>
        <button
          type="button"
          onClick={handleReexport}
          disabled={reexporting}
          className="w-full border border-border-strong bg-background rounded-lg text-sm py-2.5 hover:border-text-secondary transition-colors disabled:opacity-40 cursor-pointer"
        >
          {reexporting ? "Re-exporting…" : `↻ Re-export as ${pendingRatio}`}
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("/configure")}
        className="w-full border border-border-strong rounded-lg text-sm py-2.5 hover:border-text-secondary transition-colors cursor-pointer"
      >
        Start a new upload
      </button>
    </div>
  );
}