import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/SessionContext";

const PRESET_KEY = "clipforge_presets";

// 3x3 caption-position grid: row = t/m/b, col = l/c/r
const POSITION_ROWS = ["t", "m", "b"];
const POSITION_COLS = ["l", "c", "r"];

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const { jobId, clipCount, clipLength, captionLang, setResults } = useSession();

  const activeClip = location.state?.activeClip;
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [activeTab, setActiveTab] = useState("style");
  const [theme, setTheme] = useState("Bold White");
  const [highlightColor, setHighlightColor] = useState("#EAB308");
  const [fontFamily, setFontFamily] = useState("Impact");
  const [fontSize, setFontSize] = useState("text-2xl");
  const [position, setPosition] = useState("mc"); // 9-grid key
  const [captionBg, setCaptionBg] = useState("none"); // none | semi | solid
  const [aspectRatio, setAspectRatio] = useState(activeClip?.ratio || "9:16");
  const [watermark, setWatermark] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [savedPresets, setSavedPresets] = useState([]);

  const [transcriptLines, setTranscriptLines] = useState([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  useEffect(() => {
    if (!activeClip) {
      navigate("/select");
      return;
    }
    if (activeClip.transcript && activeClip.transcript.length > 0) {
      setTranscriptLines(activeClip.transcript);
    } else {
      setTranscriptLines([{ id: 1, startTime: "00:00", endTime: "00:05", text: "AUDIO PROCESSING", highlight: "FAILED" }]);
    }
  }, [activeClip, navigate]);

  // Load saved style presets from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (raw) setSavedPresets(JSON.parse(raw));
    } catch {
      // corrupted preset data — ignore
    }
  }, []);

  function parseTime(timeStr) {
    if (!timeStr) return 0;
    const cleanStr = String(timeStr).replace(",", ".");
    if (!cleanStr.includes(":")) return parseFloat(cleanStr) || 0;
    const parts = cleanStr.split(":").map(parseFloat);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function handleTimeUpdate() {
    if (!videoRef.current || transcriptLines.length === 0) return;
    const currentTime = videoRef.current.currentTime;

    const currentIndex = transcriptLines.findIndex((line) => {
      const start = parseTime(line.startTime);
      const end = parseTime(line.endTime);
      return currentTime >= start && currentTime <= end;
    });

    if (currentIndex !== -1 && currentIndex !== activeLineIndex) {
      setActiveLineIndex(currentIndex);
    }
  }

  function handleLineClick(index) {
    setActiveLineIndex(index);
    if (videoRef.current) {
      const line = transcriptLines[index];
      videoRef.current.currentTime = parseTime(line.startTime);
      videoRef.current.play();
    }
  }

  function handleTranscriptChange(index, field, value) {
    const updated = [...transcriptLines];
    updated[index][field] = value;
    setTranscriptLines(updated);
  }

  // --- Presets (save / load / delete) ---
  function saveCurrentPreset() {
    const preset = {
      name: `Preset ${savedPresets.length + 1}`,
      theme,
      highlightColor,
      fontFamily,
      fontSize,
      position,
      captionBg,
    };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
  }

  function loadPreset(p) {
    setTheme(p.theme);
    setHighlightColor(p.highlightColor);
    setFontFamily(p.fontFamily);
    setFontSize(p.fontSize);
    setPosition(p.position);
    setCaptionBg(p.captionBg);
  }

  function deletePreset(index) {
    const next = savedPresets.filter((_, i) => i !== index);
    setSavedPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
  }

  // --- Sends the customized settings back to the backend ---
  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const payload = {
        isFinalRender: true,
        jobId,
        sourceFileSlug: activeClip.fileSlug,
        theme,
        highlightColor,
        fontFamily,
        fontSize,
        position,
        ratio: aspectRatio,
        watermark,
        transcript: transcriptLines,
        captionBg,
      };

      const response = await fetch(`${API_BASE_URL}/api/jobs/render-final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to render final video.";
        try {
          const body = await response.json();
          if (body.error) message = body.error;
        } catch {
          // non-JSON error body — keep the default message
        }
        throw new Error(message);
      }

      const finalData = await response.json();

      // Save the final rendered video to the context so Export.jsx can show it
      setResults([finalData.finalClip]);
      navigate("/export");
    } catch (err) {
      console.error(err);
      setExportError(err.message || "Something went wrong during the final export.");
    } finally {
      setExporting(false);
    }
  }

  const currentLine = transcriptLines[activeLineIndex] || { text: "", highlight: "" };
  const videoSrc = activeClip ? `${API_BASE_URL}${activeClip.url}` : "";

  function getThemeClasses() {
    switch (theme) {
      case "Neon":
        return "caption-theme-neon";
      case "Classic":
        return "caption-theme-classic";
      case "Typewriter":
        return "caption-theme-typewriter";
      case "Bold White":
      default:
        return "caption-theme-bold";
    }
  }

  // 9-grid positioning for the on-screen caption preview
  function getPositionClass() {
    const row = position ? position[0] : "m";
    const map = { t: "items-start", m: "items-center", b: "items-end" };
    return map[row] || "items-center";
  }

  function getAlignClass() {
    const col = position ? position[1] : "c";
    if (col === "l") return "justify-start text-left";
    if (col === "r") return "justify-end text-right";
    return "justify-center text-center";
  }

  function getFontSizePx() {
    const map = { "text-lg": "1.125rem", "text-2xl": "1.5rem", "text-4xl": "2.25rem" };
    return map[fontSize] || "1.5rem";
  }

  if (!activeClip) return null;

  const previewHeight =
    aspectRatio === "9:16" ? "aspect-[9/16] h-[min(580px,58vh)]" : aspectRatio === "1:1" ? "aspect-square h-[min(440px,58vh)]" : "aspect-video h-[min(320px,58vh)]";

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-bg overflow-hidden">
      {/* Left Panel — Controls */}
      <div className="w-full md:w-80 md:h-full flex flex-col border-r border-border bg-bg-elevated/50 overflow-hidden">
        {/* Back button + tabs */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <button
            onClick={() => navigate("/select")}
            className="btn btn-ghost btn-sm mb-4 text-caption"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to clips
          </button>

          <div className="tabs">
            <button
              onClick={() => setActiveTab("style")}
              className={`tab ${activeTab === "style" ? "active" : ""}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
              </svg>
              Style
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`tab ${activeTab === "transcript" ? "active" : ""}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              Transcript
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "style" && (
            <div className="space-y-6">
              {/* Caption Theme */}
              <div>
                <label className="label">Caption Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Bold White", "Classic", "Neon", "Typewriter"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-3 px-3 rounded-lg border transition-all text-left ${
                        theme === t
                          ? "border-accent bg-accent-muted text-text-primary"
                          : "border-border bg-bg-card text-text-secondary hover:border-border-strong"
                      }`}
                    >
                      <span className="font-display block text-sm font-medium mb-1">Aa</span>
                      <span className="text-label">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Highlight Color */}
              <div>
                <label className="label">Highlight Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {["#EAB308", "#22C55E", "#EF4444", "#3B82F6", "#A855F7", "#06B6D4", "#FFFFFF"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setHighlightColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        highlightColor === color ? "border-accent scale-110 shadow-lg" : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select highlight color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="label">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="input"
                >
                  <option value="Impact">Impact (Bold & Heavy)</option>
                  <option value="Inter">Inter (Modern & Clean)</option>
                  <option value="Comic Sans MS">Comic Sans (Casual)</option>
                  <option value="Courier New">Courier New (Monospace)</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="label">Font Size</label>
                <div className="radio-group grid grid-cols-3 gap-2">
                  {[
                    { label: "Small", class: "text-lg" },
                    { label: "Medium", class: "text-2xl" },
                    { label: "Large", class: "text-4xl" },
                  ].map((s) => (
                    <div key={s.label} className="radio-option">
                      <input
                        type="radio"
                        id={`font-size-${s.label}`}
                        name="fontSize"
                        checked={fontSize === s.class}
                        onChange={() => setFontSize(s.class)}
                      />
                      <label htmlFor={`font-size-${s.label}`} className="radio-option-label py-2.5">
                        {s.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption Position */}
              <div>
                <label className="label">Caption Position</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {POSITION_ROWS.map((r) =>
                    POSITION_COLS.map((c) => {
                      const key = r + c;
                      const active = position === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setPosition(key)}
                          title={key}
                          className={`h-10 rounded-md border flex items-center justify-center transition-colors ${
                            active ? "border-accent bg-accent-muted" : "border-border bg-bg-card hover:border-border-strong"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${active ? "bg-accent" : "bg-text-muted"}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Caption Background */}
              <div>
                <label className="label">Caption Background</label>
                <div className="radio-group grid grid-cols-3 gap-2">
                  {[
                    { key: "none", label: "None" },
                    { key: "semi", label: "Semi" },
                    { key: "solid", label: "Solid" },
                  ].map((opt) => (
                    <div key={opt.key} className="radio-option">
                      <input
                        type="radio"
                        id={`caption-bg-${opt.key}`}
                        name="captionBg"
                        checked={captionBg === opt.key}
                        onChange={() => setCaptionBg(opt.key)}
                      />
                      <label htmlFor={`caption-bg-${opt.key}`} className="radio-option-label py-2.5">
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <label className="label">Presets</label>
                  <button
                    onClick={saveCurrentPreset}
                    className="btn btn-ghost btn-sm text-caption"
                  >
                    + Save current
                  </button>
                </div>
                {savedPresets.length === 0 ? (
                  <p className="text-body-sm text-text-muted">No presets saved yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {savedPresets.map((p, i) => (
                      <div key={i} className="flex items-center border border-border rounded-lg bg-bg-card p-2">
                        <button
                          onClick={() => loadPreset(p)}
                          className="text-body-sm text-text-primary text-left hover:text-accent-glow transition-colors flex-1"
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => deletePreset(i)}
                          className="text-label text-text-muted hover:text-error px-1"
                          aria-label="Delete preset"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="space-y-3">
              <p className="text-body-sm text-text-muted">
                Click any line to preview it on the video. Edit text directly to fix mistakes.
              </p>

              {transcriptLines.map((line, index) => (
                <div
                  key={line.id || index}
                  onClick={() => handleLineClick(index)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    activeLineIndex === index ? "border-accent bg-accent-muted" : "border-border bg-bg-card hover:border-border-strong"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-label text-accent-cyan">{line.startTime} – {line.endTime}</span>
                    {activeLineIndex === index && <span className="text-label text-accent-glow">● Active</span>}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-label text-text-muted block mb-1">Main Text</label>
                      <input
                        type="text"
                        value={line.text}
                        onChange={(e) => handleTranscriptChange(index, "text", e.target.value)}
                        className="input input-sm"
                      />
                    </div>
                    <div>
                      <label className="text-label text-text-muted block mb-1">Highlighted Keyword</label>
                      <input
                        type="text"
                        value={line.highlight}
                        onChange={(e) => handleTranscriptChange(index, "highlight", e.target.value)}
                        className="input input-sm text-accent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel — Preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-bg min-h-0 overflow-hidden">
        <div className="w-full max-w-md">
          <div className="text-center mb-3">
            <span className="text-label text-accent-glow">Interactive Preview</span>
          </div>

          <div
            className={`relative bg-bg-surface border border-border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${previewHeight} mx-auto`}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-cover z-0"
              autoPlay
              loop
              muted
              controls
              playsInline
            />

            {/* Caption overlay */}
            <div className={`absolute inset-0 z-20 flex flex-col pointer-events-none transition-all duration-300 ${getPositionClass()} ${getAlignClass()}`}>
              <div className={`caption-overlay ${getThemeClasses()}`}>
                <p className="caption-text" style={{ fontFamily, fontSize: getFontSizePx(), padding: captionBg === 'none' ? 0 : 'var(--space-2) var(--space-4)', backgroundColor: captionBg === 'solid' ? 'rgba(0,0,0,0.8)' : captionBg === 'semi' ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: captionBg !== 'none' ? 'var(--radius-md)' : 0 }}>
                  {currentLine.text}{" "}
                  <span className="caption-highlight" style={{ color: highlightColor }}>{currentLine.highlight}</span>
                </p>
              </div>
            </div>

            {watermark && (
              <div className="watermark">
                Clipforge
              </div>
            )}
          </div>

          {/* Ratio indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="badge badge-cyan">{aspectRatio}</span>
            <span className="text-label text-text-muted">1080p HD</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Export */}
      <div className="w-full md:w-80 md:h-full flex flex-col border-l border-border bg-bg-elevated/50 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="pt-2">
            <label className="label">Branding</label>
            <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-card cursor-pointer">
              <span className="text-body-sm text-text-primary">Include Watermark</span>
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                />
                <span className="toggle-track" />
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>

          <div className="divider" />

          <div className="space-y-2">
            <label className="label">Edit Summary</label>
            <div className="space-y-1.5">
              {[
                { label: "Selected Preset", value: theme },
                { label: "Clip Request", value: `${clipCount} × ${clipLength === "auto" ? "Auto" : `${clipLength}s`}` },
                { label: "Caption Lang", value: captionLang },
                { label: "Caption Lines", value: `${transcriptLines.length} segments` },
                { label: "Target Res", value: "1080p HD" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-body-sm">
                  <span className="text-text-muted">{item.label}</span>
                  <span className="text-text-primary font-mono text-caption">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export button - fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-border space-y-3">
          {exportError && (
            <div className="flex items-start gap-2 p-3 bg-error-muted border border-error/30 rounded-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-label text-error flex-1">{exportError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Rendering Final Video…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                Export Video
              </>
            )}
          </button>

          <p className="text-label text-text-muted text-center">
            Step 4 of 4 • Final render
          </p>
        </div>
      </div>
    </div>
  );
}