import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/SessionContext";
import { api } from "../lib/api";

const STEPS = [
  { id: "transcribe", label: "Transcribing audio", icon: "mic" },
  { id: "analyze", label: "Scoring highlights", icon: "sparkles" },
  { id: "render", label: "Applying zooms & captions", icon: "crop" },
  { id: "finalize", label: "Finalizing clips", icon: "check" },
];

const ICONS = {
  mic: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
  sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  crop: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 3v18" /></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

export default function Processing() {
  const navigate = useNavigate();
  const { jobId, fetchCandidatesForJob } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      navigate("/configure");
      return;
    }

    // Timer for elapsed time
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getJobStatus(jobId);

        if (status.status === "error") {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setError("The video processing job failed. The format might be unsupported or the file too large.");
          return;
        }

        setCurrentStep(status.stepIndex);
        setProgress(status.progress);

        if (status.status === "done") {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          try {
            await fetchCandidatesForJob(jobId);
            navigate("/select");
          } catch (fetchErr) {
            setError("Failed to fetch the generated clips.");
          }
        }
      } catch (networkErr) {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setError("Lost connection to the server. Please check your network or try again.");
      }
    }, 1000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [jobId, navigate, fetchCandidatesForJob]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md animate-slide-up">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-label text-accent-glow mb-3">Step 2 of 4</p>
            <h1 className="text-display-lg text-text-primary mb-3">
              {error ? "Processing stalled" : "Finding your clips"}
            </h1>
            <p className="text-body text-text-secondary">
              {error
                ? "Something went wrong. You can go back and try again."
                : "Our AI is analyzing your video and creating highlights."}
            </p>
          </div>

          {/* Progress Ring */}
          <div className="relative flex justify-center mb-10">
            <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="6"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#progress-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={439.8}
                strokeDashoffset={439.8 * (1 - progress / 100)}
                style={{ transition: "stroke-dashoffset 500ms ease-out" }}
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-accent)" />
                  <stop offset="100%" stopColor="var(--color-accent-glow)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-display-xl font-mono font-bold text-text-primary">
                {progress}%
              </span>
              <span className="text-caption text-text-muted mt-1">
                Elapsed: {formatTime(elapsed)}
              </span>
            </div>
          </div>

          {/* Error State */}
          {error ? (
            <div className="card p-6 mb-8 animate-slide-up" role="alert">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-error-muted border border-error/30 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-display-sm text-error mb-2">Error encountered</h3>
                  <p className="text-body-sm text-text-secondary mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={() => navigate("/configure")}
                    className="btn btn-secondary"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Go back & try again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Step Timeline */}
              <div className="card overflow-hidden mb-8 animate-slide-up">
                <div className="p-4">
                  {STEPS.map((step, i) => {
                    const state = i < currentStep ? "complete" : i === currentStep ? "active" : "pending";
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-4 py-3 relative ${i < STEPS.length - 1 ? 'pb-3' : ''}`}
                      >
                        {/* Connecting line */}
                        <div className="absolute left-10 top-16 bottom-0 w-0.5" style={{ display: i < STEPS.length - 1 ? 'block' : 'none' }}>
                          <div
                            className="h-full"
                            style={{
                              background: state === "complete"
                                ? "linear-gradient(180deg, var(--color-success), var(--color-accent))"
                                : "var(--color-border)",
                            }}
                          />
                        </div>

                        <div className={`relative flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center ${
                          state === "complete"
                            ? "bg-success-muted border border-success/30"
                            : state === "active"
                            ? "bg-accent-muted border border-accent animate-pulse-glow"
                            : "bg-bg-surface border border-border"
                        }`}>
                          <span className={`text-label font-mono font-bold ${
                            state === "complete" ? "text-success" :
                            state === "active" ? "text-accent-glow" :
                            "text-text-muted"
                          }`}>
                            {state === "complete" ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              ICONS[step.icon]
                            )}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-body-sm font-medium ${state === "pending" ? "text-text-muted" : "text-text-primary"}`}>
                            {step.label}
                            {state === "active" && <span className="text-text-muted ml-2">…</span>}
                          </p>
                          <div className="progress-bar mt-2" style={{ width: "100px" }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: state === "complete" ? "100%" : state === "active" ? `${Math.min(progress, 99)}%` : "0%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status message */}
              <div className="text-center animate-fade-in">
                <p className="text-caption text-text-muted">
                  {currentStep < STEPS.length ? STEPS[currentStep].label : "Finalizing…"}
                </p>
                <p className="text-label text-accent-glow mt-1">
                  Large videos may take a few minutes
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="footer px-6 border-t border-border">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-brand-mark" />
            clipforge
          </div>
          <p className="footer-copyright">Step 2 of 4 • Configure → Process → Edit → Export</p>
        </div>
      </footer>
    </div>
  );
}