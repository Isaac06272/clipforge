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

  function handleFilePick(e) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
    }
  }

  function clearFile(e) {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
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

  return (
    <div className="max-w-2xl mx-auto px-8 py-14 text-text-primary">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 01</p>
      <h1 className="font-display font-bold text-2xl mb-1.5">Configure your edit</h1>
      <p className="text-sm text-text-secondary mb-8">Upload your video and we'll generate a few clip options.</p>

      {/* Media Input Section */}
      <div className="mb-7">
        <div className="relative">
          <label className={`block border border-dashed rounded-xl bg-surface p-8 text-center cursor-pointer transition-colors ${file ? 'border-accent-2 bg-accent-2/10' : 'border-border-strong hover:border-accent-2'}`}>
            <input type="file" accept="video/*" className="hidden" onChange={handleFilePick} />
            <div className="w-10 h-10 mx-auto mb-3 border border-text-secondary rounded-lg flex items-center justify-center text-text-secondary">↑</div>
            <p className="text-sm font-medium mb-1 pr-6 truncate">{file ? file.name : "Drop a video or browse"}</p>
            <p className="font-mono text-xs text-text-muted">
              {file ? `${(file.size / 1e6).toFixed(1)} MB` : "MP4 · MOV — up to 2GB"}
            </p>
          </label>
          
          {file && (
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-surface-2 border border-border-strong text-text-secondary hover:text-white hover:bg-red-500/20 hover:border-red-500 transition-colors flex items-center justify-center text-xs"
              title="Remove file"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Configuration Section */}
      <div className="mb-7">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2.5">
          Output ratio — editable later
        </p>
        <RatioPicker value={ratio} onChange={setRatio} />
      </div>

      {/* How many clips to find */}
      <div className="mb-7">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2.5">
          Clips to generate
        </p>
        <div className="flex items-center justify-between bg-surface border border-border-strong rounded-lg p-3">
          <button
            type="button"
            onClick={() => setClipCount((n) => Math.max(1, n - 1))}
            disabled={clipCount <= 1}
            className="w-9 h-9 rounded-md border border-border-strong text-white text-lg hover:border-accent-2 transition-colors disabled:opacity-30 cursor-pointer"
          >
            −
          </button>
          <span className="font-mono text-xl text-accent font-bold">{clipCount}</span>
          <button
            type="button"
            onClick={() => setClipCount((n) => Math.min(6, n + 1))}
            disabled={clipCount >= 6}
            className="w-9 h-9 rounded-md border border-border-strong text-white text-lg hover:border-accent-2 transition-colors disabled:opacity-30 cursor-pointer"
          >
            +
          </button>
        </div>
        <p className="font-mono text-[11px] text-text-muted mt-1.5">How many highlights to find (1–6).</p>
      </div>

      {/* Target clip length */}
      <div className="mb-7">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2.5">
          Clip length
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "auto", label: "Auto" },
            { key: "30", label: "30s" },
            { key: "45", label: "45s" },
            { key: "60", label: "60s" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setClipLength(opt.key)}
              className={`py-2.5 text-xs border rounded-lg transition-colors cursor-pointer ${
                clipLength === opt.key
                  ? "border-accent-2 bg-accent-2/10 text-white font-medium"
                  : "border-border-strong text-text-secondary hover:border-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] text-text-muted mt-1.5">Target duration for each generated clip.</p>
      </div>

      {/* Spoken language for transcription */}
      <div className="mb-7">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2.5">
          Caption language
        </p>
        <select
          value={captionLang}
          onChange={(e) => setCaptionLang(e.target.value)}
          className="w-full bg-surface border border-border-strong rounded-lg p-3 text-sm text-white focus:outline-none focus:border-accent-2"
        >
          {["English", "Tagalog", "Spanish", "French", "German", "Japanese", "Korean", "Hindi"].map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <p className="font-mono text-[11px] text-text-muted mt-1.5">Language the video is spoken in — improves transcription accuracy.</p>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        type="button"
        onClick={handleFindClips}
        disabled={starting}
        className="w-full bg-accent text-bg font-medium text-sm rounded-lg py-3.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {starting ? "Starting…" : "Find clips"}
      </button>
    </div>
  );
}