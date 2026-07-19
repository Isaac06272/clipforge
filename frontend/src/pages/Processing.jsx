import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/SessionContext";
import { api } from "../lib/api";

const STEP_LABELS = [
  "Transcribing audio",
  "Scoring highlight moments",
  "Applying zooms and captions",
  "Rendering options",
];

export default function Processing() {
  const navigate = useNavigate();
  const { jobId, fetchCandidatesForJob } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      navigate("/configure");
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getJobStatus(jobId);
        setStepIndex(status.stepIndex);
        setProgress(status.progress);

        if (status.status === "done") {
          clearInterval(pollRef.current);
          await fetchCandidatesForJob(jobId);
          navigate("/select");
        }
      } catch {
        clearInterval(pollRef.current);
      }
    }, 700);

    return () => clearInterval(pollRef.current);
  }, [jobId, navigate, fetchCandidatesForJob]);

  return (
    <div className="max-w-md mx-auto px-8 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 02</p>
      <h1 className="font-display font-bold text-2xl mb-8">Finding your clips</h1>

      <div className="text-left border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
        {STEP_LABELS.map((label, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          return (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono flex-shrink-0 ${
                  state === "done"
                    ? "bg-accent-2 text-bg"
                    : state === "active"
                    ? "border-2 border-accent text-accent"
                    : "border-2 border-border-strong text-text-muted"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={`text-sm ${state === "pending" ? "text-text-muted" : "text-text-primary"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mt-6">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
