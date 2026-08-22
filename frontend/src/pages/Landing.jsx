import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "captions",
    title: "Auto Captions",
    desc: "High-accuracy transcription with dynamic styles tailored for short-form.",
    highlight: "95%+ accuracy"
  },
  {
    icon: "zoom",
    title: "Smart Zooms",
    desc: "Algorithmic face and action tracking for precise vertical reframing.",
    highlight: "Auto-reframe"
  },
  {
    icon: "editor",
    title: "Full Editor",
    desc: "Tune every clip — themes, fonts, positions, colors, and captions.",
    highlight: "Pixel-perfect"
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center relative overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(ellipse_at_center,var(--color-accent-muted)_0%,transparent_70%)] pointer-events-none blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[radial-gradient(ellipse_at_center,var(--color-cyan-muted)_0%,transparent_70%)] pointer-events-none blur-3xl" />

        <div className="relative z-10 max-w-4xl w-full animate-slide-up">
          {/* Eyebrow */}
          <p className="text-label text-accent-glow mb-6 animate-fade-in delay-1">
            <span className="inline-flex items-center gap-2">
              <span className="w-6 h-0.5 bg-accent" />
              AI Video Repurposing
            </span>
          </p>

          {/* Headline */}
          <h1 className="text-display-xl text-text-primary mb-6 animate-fade-in delay-2">
            Turn long videos into{' '}
            <span className="gradient-text">viral shorts</span>{' '}
            in minutes
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto mb-10 animate-fade-in delay-3">
            Upload once. Our AI finds highlights, applies smart zooms, generates captions,
            and renders platform-ready vertical clips. Full creative control before export.
          </p>

          {/* Primary CTA */}
          <Link
            to="/configure"
            className="btn btn-primary text-base px-8 py-4 animate-scale-in delay-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload a video
          </Link>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-caption text-text-muted animate-fade-in delay-5">
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              MP4 · MOV · up to 2GB
            </span>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              1080p HD output
            </span>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              No watermark
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section px-6 bg-bg-elevated/50 border-y border-border">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-label text-accent-glow mb-3">What you get</p>
            <h2 className="text-display-lg text-text-primary">Everything needed for shorts that perform</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="card card-hover p-6 relative group animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-accent-muted border border-border flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  {f.icon === "captions" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  )}
                  {f.icon === "zoom" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                      <path d="M8 11h8M11 8v8" />
                    </svg>
                  )}
                  {f.icon === "editor" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                </div>

                <h3 className="text-display-sm text-text-primary mb-2">{f.title}</h3>
                <p className="text-body-sm text-text-secondary mb-4">{f.desc}</p>
                <span className="badge badge-accent">{f.highlight}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section px-6">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-label text-accent-glow mb-3">Process</p>
            <h2 className="text-display-lg text-text-primary">Four steps to finished clips</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Upload", desc: "Drop your long-form video. We handle up to 2GB." },
              { step: "02", title: "AI Analysis", desc: "Transcription + highlight detection + zoom planning." },
              { step: "03", title: "Select & Edit", desc: "Pick clips, customize captions, themes, positioning." },
              { step: "04", title: "Export", desc: "Render 1080p verticals. Download or re-export in any ratio." },
            ].map((item, i) => (
              <div key={item.step} className="relative animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-muted border border-border mx-auto mb-4">
                    <span className="text-display-sm font-mono font-bold text-accent-glow">{item.step}</span>
                  </div>
                  {/* Connecting line */}
                  {i < 3 && (
                    <div className="absolute top-7 left-[calc(50%+28px)] right-[calc(50%+28px)] h-0.5 bg-gradient-to-r from-accent to-transparent" />
                  )}
                </div>
                <h3 className="text-display-sm text-text-primary text-center mb-2">{item.title}</h3>
                <p className="text-body-sm text-text-secondary text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="section px-6 bg-bg-elevated/50 border-t border-border">
        <div className="container text-center">
          <h2 className="text-display-lg text-text-primary mb-4">Ready to repurpose your content?</h2>
          <p className="text-body text-text-secondary mb-8 max-w-xl mx-auto">
            Join creators turning hours of footage into months of short-form content.
          </p>
          <Link to="/configure" className="btn btn-primary text-base px-8 py-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Start free — no account needed
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer px-6">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-brand-mark" />
            clipforge
          </div>
          <nav className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </nav>
          <p className="footer-copyright">Built for creators</p>
        </div>
      </footer>
    </div>
  );
}