import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";
import RatioPicker from "../components/RatioPicker";

export default function Configure() {
  const navigate = useNavigate();
  const { 
    file, setFile, 
    ratio, setRatio, 
    mode, setMode, 
    prompt, setPrompt, 
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

      <div className="mb-7">
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2.5">Editing mode</p>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`text-left rounded-lg border p-3.5 transition-colors ${
              mode === "auto" ? "border-accent-2 bg-accent-2/10" : "border-border-strong"
            }`}
          >
            <h4 className="font-display text-sm font-medium mb-1">Auto edit</h4>
            <p className="text-xs text-text-secondary">Zooms, captions, and pacing chosen for you.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("prompt")}
            className={`text-left rounded-lg border p-3.5 transition-colors ${
              mode === "prompt" ? "border-accent-2 bg-accent-2/10" : "border-border-strong"
            }`}
          >
            <h4 className="font-display text-sm font-medium mb-1">Custom prompt</h4>
            <p className="text-xs text-text-secondary">Describe your own edit style.</p>
          </button>
        </div>
        {mode === "prompt" && (
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. fast punchy cuts, zoom on every laugh, bold yellow captions"
            className="w-full bg-surface border border-border-strong rounded-lg p-3 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-2"
          />
        )}
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