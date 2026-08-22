import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";
import RatioPicker from "../components/RatioPicker";

export default function Configure() {
  const navigate = useNavigate();
  const {
    file, setFile,
    ratio, setRatio,
    clipCount, setClipCount,
    clipLength, setClipLength,
    captionLang, setCaptionLang,
    startProcessing
  } = useSession();

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFilePick(e) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setError(null);
    }
  }

  function clearFile(e) {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
    setError(null);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      setError(null);
    } else if (dropped) {
      setError("Please drop a valid video file (MP4, MOV, etc.)");
    }
  }

  async function handleFindClips() {
    if (!file) {
      setError("Please choose a video file to upload.");
      return;
    }

    setError(null);
    setStarting(true);
    try {
      await startProcessing();
      navigate("/processing");
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1e6) return `${(bytes / 1e3).toFixed(1)} KB`;
    if (bytes < 1e9) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e9).toFixed(2)} GB`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl animate-slide-up">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-label text-accent-glow mb-3">Step 1 of 4</p>
            <h1 className="text-display-lg text-text-primary mb-3">Configure your edit</h1>
            <p className="text-body text-text-secondary">
              Upload your video and choose how many clips to generate.
            </p>
          </div>

          {/* File Upload */}
          <div className="card p-6 mb-8 relative">
            <label
              className={`drop-zone ${file ? 'active' : ''} ${dragActive ? 'drag-active' : ''} cursor-pointer p-8 md:p-12 text-center`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFilePick}
                disabled={starting}
              />

              {file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-border flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </div>
                  <div className="text-left w-full max-w-xs">
                    <p className="text-body font-medium text-text-primary truncate pr-12">{file.name}</p>
                    <p className="text-caption text-text-muted mt-1">{formatFileSize(file.size)} • {file.type || "video"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="icon-btn danger ml-auto"
                    aria-label="Remove file"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-body font-medium text-text-primary">Drop a video or click to browse</p>
                    <p className="text-caption text-text-muted mt-1">MP4 · MOV · WebM — up to 2GB</p>
                  </div>
                </div>
              )}
            </label>

            {/* Drag overlay hint */}
            {dragActive && !file && (
              <div className="absolute inset-0 flex items-center justify-center bg-accent-muted/50 rounded-xl pointer-events-none">
                <span className="text-label text-accent-glow px-4 py-2 bg-bg-card border border-accent rounded-full">
                  Release to upload
                </span>
              </div>
            )}
          </div>

          {/* Configuration Options */}
          <div className="space-y-6">
            {/* Ratio */}
            <div>
              <label className="label">Output ratio</label>
              <p className="text-caption text-text-muted mb-3">Editable later in the editor</p>
              <RatioPicker value={ratio} onChange={setRatio} disabled={starting} />
            </div>

            {/* Clip Count */}
            <div>
              <label className="label">Clips to generate</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg bg-bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setClipCount((n) => Math.max(1, n - 1))}
                    disabled={clipCount <= 1 || starting}
                    className="w-12 h-12 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors disabled:opacity-30"
                    aria-label="Decrease clip count"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <div className="w-16 h-12 flex items-center justify-center bg-bg-surface border-x border-border">
                    <span className="text-display-sm font-mono font-bold text-accent-glow">{clipCount}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClipCount((n) => Math.min(6, n + 1))}
                    disabled={clipCount >= 6 || starting}
                    className="w-12 h-12 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors disabled:opacity-30"
                    aria-label="Increase clip count"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <span className="text-caption text-text-muted">How many highlights to find (1–6)</span>
              </div>
            </div>

            {/* Clip Length */}
            <div>
              <label className="label">Target clip length</label>
              <div className="radio-group grid grid-cols-4 gap-2" role="radiogroup" aria-label="Clip length">
                {[
                  { key: "auto", label: "Auto", desc: "AI decides" },
                  { key: "30", label: "30s", desc: "Quick hooks" },
                  { key: "45", label: "45s", desc: "Standard" },
                  { key: "60", label: "60s", desc: "Deep dive" },
                ].map((opt) => (
                  <div key={opt.key} className="radio-option">
                    <input
                      type="radio"
                      id={`clip-length-${opt.key}`}
                      name="clipLength"
                      value={opt.key}
                      checked={clipLength === opt.key}
                      onChange={() => setClipLength(opt.key)}
                      disabled={starting}
                    />
                    <label htmlFor={`clip-length-${opt.key}`} className="radio-option-label flex flex-col gap-1 py-4">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-caption text-text-muted">{opt.desc}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption Language */}
            <div>
              <label className="label">Caption language</label>
              <select
                value={captionLang}
                onChange={(e) => setCaptionLang(e.target.value)}
                className="input"
                disabled={starting}
              >
                {[
                  "English", "Spanish", "French", "German",
                  "Italian", "Portuguese", "Dutch", "Polish",
                  "Japanese", "Korean", "Chinese", "Hindi",
                  "Arabic", "Russian", "Turkish"
                ].map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <p className="text-caption text-text-muted mt-2">Language spoken in the video — improves transcription accuracy</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-muted border border-error/30 rounded-lg animate-slide-up" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-body-sm text-error flex-1">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleFindClips}
            disabled={starting || !file}
            className="btn btn-primary w-full py-4 text-base mt-2 disabled:opacity-50"
          >
            {starting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Analyzing video…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Find clips
              </>
            )}
          </button>

          <p className="text-caption text-text-muted text-center mt-4">
            Processing typically takes 1–3 minutes depending on video length
          </p>
        </div>
      </main>

      <footer className="footer px-6 border-t border-border">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-brand-mark" />
            clipforge
          </div>
          <p className="footer-copyright">Step 1 of 4 • Configure → Process → Edit → Export</p>
        </div>
      </footer>
    </div>
  );
}