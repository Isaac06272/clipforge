import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/SessionContext";

const ASPECT_RATIOS = {
  "9:16": { aspect: "9/16", label: "Portrait" },
  "16:9": { aspect: "16/9", label: "Landscape" },
  "1:1": { aspect: "1", label: "Square" },
};

export default function Select() {
  const navigate = useNavigate();
  const { candidates } = useSession();

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  if (!candidates || candidates.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h1 className="text-display-lg text-text-primary mb-3">No clips found</h1>
            <p className="text-body text-text-secondary mb-6">The AI couldn't identify highlights in this video.</p>
            <button
              type="button"
              onClick={() => navigate("/configure")}
              className="btn btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Try another video
            </button>
          </div>
        </main>
        <footer className="footer px-6 border-t border-border">
          <div className="container footer-content">
            <div className="footer-brand">
              <span className="footer-brand-mark" />
              clipforge
            </div>
            <p className="footer-copyright">Step 3 of 4 • Configure → Process → Edit → Export</p>
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
            <p className="text-label text-accent-glow mb-3">Step 3 of 4</p>
            <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
              <div>
                <h1 className="text-display-lg text-text-primary">Choose a clip to edit</h1>
                <p className="text-body text-text-secondary mt-1">
                  The AI found <span className="text-text-primary font-semibold">{candidates.length}</span> highlight{ candidates.length !== 1 ? "s" : "" }. Pick one to customize.
                </p>
              </div>
            </div>
          </div>

          {/* Clips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {candidates.map((c, index) => {
              const ratioInfo = ASPECT_RATIOS[c.ratio] || ASPECT_RATIOS["9:16"];
              const letter = String.fromCharCode(65 + index); // A, B, C...

              return (
                <article
                  key={c.id}
                  className="card card-hover overflow-hidden flex flex-col animate-slide-up max-w-xs mx-auto"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Video Preview */}
                  <div className="relative clip-frame" style={{ aspectRatio: ratioInfo.aspect }}>
                    <video
                      src={`${API_BASE_URL}${c.url}`}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute top-3 left-3 z-10">
                      <span className="badge badge-accent">{letter}</span>
                    </div>
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="badge badge-cyan">{c.ratio}</span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="badge badge-success">{c.score}</span>
                    </div>
                  </div>

                  {/* Clip Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-display-sm text-text-primary">Clip {letter}</h3>
                      <span className="text-caption text-text-muted">{c.duration}</span>
                    </div>

                    <p className="text-body-sm text-text-secondary mb-3 flex-1">
                      {ratioInfo.label} • AI highlight
                    </p>

                    <button
                      type="button"
                      onClick={() => navigate('/editor', { state: { activeClip: c } })}
                      className="btn btn-primary w-full justify-center text-sm py-2.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Open in Editor
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Empty state fallback */}
          {candidates.length === 0 && (
            <div className="text-center py-16">
              <p className="text-body text-text-secondary">No clips available</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer px-6 border-t border-border">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-brand-mark" />
            clipforge
          </div>
          <p className="footer-copyright">Step 3 of 4 • Configure → Process → Edit → Export</p>
        </div>
      </footer>
    </div>
  );
}