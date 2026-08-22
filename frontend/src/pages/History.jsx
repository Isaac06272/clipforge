import { useSession } from "../lib/SessionContext";
import { Link } from "react-router-dom";

export default function History() {
  const { history } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <main className="flex-1 px-6 py-16">
        <div className="container animate-slide-up">
          {/* Header */}
          <div className="mb-10">
            <p className="text-label text-accent-glow mb-3">History</p>
            <h1 className="text-display-lg text-text-primary mb-2">Your exports this session</h1>
            <p className="text-body text-text-secondary">
              {history.length > 0
                ? `${history.length} export${history.length !== 1 ? "s" : ""} completed`
                : "No exports yet — finish an edit to see it here."}
            </p>
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="card p-12 text-center animate-fade-in delay-1">
              <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h2 className="text-display-sm text-text-primary mb-2">No history yet</h2>
              <p className="text-body text-text-secondary mb-6 max-w-sm mx-auto">
                Your exports will appear here automatically. They persist for this browser session.
              </p>
              <Link to="/configure" className="btn btn-primary inline-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Create your first clip
              </Link>
            </div>
          ) : (
            <div className="space-y-3 animate-slide-up">
              {history.map((h, i) => (
                <article
                  key={i}
                  className="card p-4 flex items-center justify-between gap-4 hover:border-border-strong transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-muted border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-display-sm font-mono font-bold text-accent-glow">
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {h.count} clip{h.count > 1 ? "s" : ""} exported
                      </p>
                      <p className="text-caption text-text-muted">
                        {h.time} • {h.ratio} • Custom
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-success">Completed</span>
                </article>
              ))}
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
          <p className="footer-copyright">Session history clears on browser close</p>
        </div>
      </footer>
    </div>
  );
}