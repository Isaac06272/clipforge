import { Link, useLocation } from "react-router-dom";

const STEPS = [
  { path: "/configure", label: "Configure", step: 1 },
  { path: "/processing", label: "Process", step: 2 },
  { path: "/select", label: "Select", step: 3 },
  { path: "/editor", label: "Edit", step: 4 },
  { path: "/export", label: "Export", step: 5 },
];

export default function Header() {
  const { pathname } = useLocation();
  const currentStep = STEPS.find((s) => s.path === pathname)?.step || 0;
  const showSteps = STEPS.some((s) => s.path === pathname);

  return (
    <header className="border-b border-border bg-bg/80 backdrop-blur-lg sticky top-0 z-[100]">
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-text-primary" aria-label="Clipforge home">
          <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </span>
          <span className="hidden sm:block">clipforge</span>
        </Link>

        {showSteps && (
          <nav className="hidden lg:flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1" aria-label="Progress steps">
            {STEPS.map((s) => {
              const isActive = s.path === pathname;
              const isComplete = s.step < currentStep;
              return (
                <span
                  key={s.path}
                  className={`flex items-center gap-2 px-4 py-2 text-caption font-medium transition-all ${
                    isActive
                      ? "text-accent-glow bg-accent-muted rounded-xl"
                      : isComplete
                      ? "text-success"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                    isActive
                      ? "bg-accent text-bg"
                      : isComplete
                      ? "bg-success text-bg"
                      : "bg-bg-surface border border-border text-text-muted"
                  }`}>
                    {isComplete ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      s.step
                    )}
                  </span>
                  {isActive && <span className="hidden sm:inline">{s.label}</span>}
                </span>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {/* Mobile menu button - could expand later */}
          <button
            className="icon-btn lg:hidden"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}