import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../lib/SessionContext";
import RatioPicker from "../components/RatioPicker";

export default function Configure() {
  const navigate = useNavigate();
  const { 
    file, setFile, 
    youtubeUrl, setYoutubeUrl, 
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
      setFile(picked); // Save the raw File object
      setYoutubeUrl(""); // Clear the URL if they pick a file
    }
  }

  function handleUrlChange(e) {
    setYoutubeUrl(e.target.value);
    if (e.target.value) setFile(null); // Clear the file if they type a URL
  }

  async function handleFindClips() {
    // Require either a file OR a URL
    if (!file && !youtubeUrl?.trim()) {
      setError("Choose a video or enter a YouTube link.");
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
    <div className="max-w-2xl mx-auto px-8 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 01</p>
      <h1 className="font-display font-bold text-2xl mb-1.5">Configure your edit</h1>
      <p className="text-sm text-text-secondary mb-8">We'll generate a few clip options — pick the ones you want.</p>

      {/* Media Input Section */}
      <div className="mb-7">
        <label className={`block border border-dashed rounded-xl bg-surface p-9 text-center cursor-pointer transition-colors ${file ? 'border-accent-2 bg-accent-2/10' : 'border-border-strong hover:border-accent-2'}`}>
          <input type="file" accept="video/*" className="hidden" onChange={handleFilePick} />
          <div className="w-10 h-10 mx-auto mb-3 border border-text-secondary rounded-lg flex items-center justify-center text-text-secondary">↑</div>
          <p className="text-sm font-medium mb-1">{file ? file.name : "Drop a video or browse"}</p>
          <p className="font-mono text-xs text-text-muted">
            {file ? `${(file.size / 1e6).toFixed(1)} MB` : "MP4 · MOV — up to 2GB"}
          </p>
        </label>

        <div className="flex items-center gap-4 my-5">
          <div className="h-px bg-border-strong flex-1"></div>
          <span className="text-xs font-mono text-text-muted uppercase tracking-wide">or</span>
          <div className="h-px bg-border-strong flex-1"></div>
        </div>

        <input
          type="url"
          value={youtubeUrl}
          onChange={handleUrlChange}
          placeholder="Paste a YouTube link..."
          className={`w-full bg-surface border rounded-lg p-3.5 text-sm placeholder:text-text-muted focus:outline-none transition-colors ${youtubeUrl ? 'border-accent-2 bg-accent-2/10' : 'border-border-strong focus:border-accent-2'}`}
        />
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