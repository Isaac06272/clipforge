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

  async function downloadClip(clip) {
    try {
      const res = await fetch(`${API_BASE_URL}${clip.downloadUrl}`);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = clip.downloadUrl.split("/").pop() || "clipforge-clip.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not download the video.");
    }
  }

  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h1 className="text-display-lg text-text-primary mb-3">No clips to export</h1>
            <p className="text-body text-text-secondary mb-6">Complete an edit to see your clips here.</p>
            <button
              type="button"
              onClick={() => navigate("/configure")}
              className="btn btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Start new upload
            </button>
          </div>
        </main>
        <footer className="footer px-6 border-t border-border">
          <div className="container footer-content">
            <div className="footer-brand">
              <span className="footer-brand-mark" />
              clipforge
            </div>
            <p className="footer-copyright">Step 5 of 5 • Configure → Process → Edit → Export</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 px-6 py-16">
        <div className="container-wide animate-slide-up">
          {/* Header */}
          <div className="mb-10">
            <p className="text-label text-accent-glow mb-3">Step 5 of 5</p>
            <h1 className="text-display-lg text-text-primary mb-2">Your clips are ready</h1>
            <p className="text-body text-text-secondary">
              <span className="font-semibold text-text-primary">{results.length}</span> clip{results.length !== 1 ? "s" : ""} rendered at 1080p.
            </p>
          </div>

          {/* Clips Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {results.map((clip, index) => {
              const letter = String.fromCharCode(65 + index);

              return (
                <article key={clip.id} className="card card-hover overflow-hidden flex flex-col animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                  {/* Video Preview */}
                  <div className="relative clip-frame aspect-video">
                    <video
                      src={`${API_BASE_URL}${clip.url}`}
                      className="w-full h-full object-cover pointer-events-none"
                      preload="metadata"
                    />
                    <div className="absolute top-3 left-3 z-10">
                      <span className="badge badge-accent">{letter}</span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="badge badge-cyan">{clip.ratio}</span>
                    </div>
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="badge badge-success">Ready</span>
                    </div>
                  </div>

                  {/* Clip Info & Actions */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-display-sm text-text-primary mb-1">Clip {letter}</h3>
                    <p className="text-body-sm text-text-secondary mb-4 flex-1">
                      {clip.duration} • {clip.ratio} • Custom export
                    </p>

                    <button
                      type="button"
                      onClick={() => downloadClip(clip)}
                      className="btn btn-primary w-full justify-center"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Download MP4
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Re-export Section */}
          <div className="card p-6 mb-8 animate-slide-up">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <label className="label">Re-export all clips</label>
                <p className="text-body-sm text-text-muted mt-1">
                  Changes the aspect ratio and re-renders every clip with your current edit settings.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-64">
                <RatioPicker value={pendingRatio} onChange={setPendingRatio} disabled={reexporting} />
              </div>
              <button
                type="button"
                onClick={handleReexport}
                disabled={reexporting || pendingRatio === ratio}
                className="btn btn-secondary w-full sm:w-auto py-3.5 flex-1 sm:flex-none"
              >
                {reexporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Re-exporting…
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Re-export as {pendingRatio}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <button
              type="button"
              onClick={() => navigate("/configure")}
              className="btn btn-secondary w-full sm:w-auto flex-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Start new upload
            </button>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="btn btn-ghost w-full sm:w-auto flex-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              View history
            </button>
          </div>
        </div>
      </main>

      <footer className="footer px-6 border-t border-border">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-brand-mark" />
            clipforge
          </div>
          <p className="footer-copyright">Step 5 of 5 • Done! 🎉</p>
        </div>
      </footer>
    </div>
  );
}