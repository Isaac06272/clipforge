import { Link, useLocation } from "react-router-dom";

const STEPS = [
  { path: "/configure", label: "01 Upload" },
  { path: "/processing", label: "02 Processing" },
  { path: "/select", label: "03 Select" },
  { path: "/export", label: "04 Export" },
];

export default function Header() {
  const { pathname } = useLocation();
  const showSteps = STEPS.some((s) => s.path === pathname);

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-8 flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-lg">
          <span className="w-2.5 h-2.5 bg-accent rounded-sm" />
          clipforge
        </Link>

        {showSteps && (
          <nav className="hidden sm:flex items-center gap-4 font-mono text-xs text-text-muted">
            {STEPS.map((s) => (
              <span
                key={s.path}
                className={s.path === pathname ? "text-accent-2" : ""}
              >
                {s.label}
              </span>
            ))}
          </nav>
        )}

        <Link
          to="/history"
          className="text-sm border border-border-strong rounded-md px-3.5 py-2 hover:border-text-secondary transition-colors"
        >
          History
        </Link>
      </div>
    </header>
  );
}
