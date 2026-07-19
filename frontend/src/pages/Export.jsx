import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";
import RatioPicker from "../components/RatioPicker";

export default function Export() {
  const navigate = useNavigate();
  const { results, ratio, reexportAll } = useSession();
  const [pendingRatio, setPendingRatio] = useState(ratio);
  const [reexporting, setReexporting] = useState(false);

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
          <div key={clip.id} className="flex gap-3.5 bg-surface border border-border rounded-lg p-3.5">
            <div className="w-14 h-24 bg-surface-2 rounded-md flex-shrink-0 flex items-center justify-center text-text-secondary text-xs">
              ▶
            </div>
            <div>
              <h4 className="font-display text-sm mb-0.5">{clip.name}</h4>
              <p className="font-mono text-[11px] text-text-secondary mb-2.5">
                {clip.duration} · {clip.ratio} · {clip.mode === "prompt" ? "custom prompt" : "auto edit"}
              </p>
              <a
                href={clip.downloadUrl}
                download
                className="inline-block text-[11px] bg-accent text-bg rounded-md px-2.5 py-1.5"
              >
                ↓ Download
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
          className="w-full border border-border-strong rounded-lg text-sm py-2.5 hover:border-text-secondary transition-colors disabled:opacity-40"
        >
          {reexporting ? "Re-exporting…" : `↻ Re-export as ${pendingRatio}`}
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("/configure")}
        className="w-full border border-border-strong rounded-lg text-sm py-2.5 hover:border-text-secondary transition-colors"
      >
        Start a new upload
      </button>
    </div>
  );
}
