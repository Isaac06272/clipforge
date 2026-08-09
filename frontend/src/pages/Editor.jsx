import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RatioPicker from "../components/RatioPicker";
import { useSession } from "../lib/SessionContext";

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null); 
  const { jobId, setResults } = useSession(); // jobId needed by render-final; setResults passes the final video to Export
  
  const activeClip = location.state?.activeClip;
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [activeTab, setActiveTab] = useState("style");
  const [theme, setTheme] = useState("Bold White");
  const [highlightColor, setHighlightColor] = useState("#EAB308"); 
  const [fontFamily, setFontFamily] = useState("Impact");
  const [fontSize, setFontSize] = useState("text-2xl");
  const [position, setPosition] = useState("center");
  const [aspectRatio, setAspectRatio] = useState(activeClip?.ratio || "9:16");
  const [watermark, setWatermark] = useState(true);
  const [exporting, setExporting] = useState(false);

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
    
    const currentIndex = transcriptLines.findIndex(line => {
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

  // --- NEW: Sends the customized settings back to the backend ---
  async function handleExport() {
    setExporting(true);
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
        transcript: transcriptLines
      };

      const response = await fetch(`${API_BASE_URL}/api/jobs/render-final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to render final video.");
      
      const finalData = await response.json();
      
      // Save the final rendered video to the context so Export.jsx can show it
      setResults([finalData.finalClip]); 
      navigate("/export");
      
    } catch (err) {
      console.error(err);
      alert("Something went wrong during the final export.");
    } finally {
      setExporting(false);
    }
  }

  const currentLine = transcriptLines[activeLineIndex] || { text: "", highlight: "" };
  const videoSrc = activeClip ? `${API_BASE_URL}${activeClip.url}` : "";

  function getThemeClasses() {
    switch (theme) {
      case "Neon":
        return "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]";
      case "Classic":
        return "text-white bg-black/75 px-4 py-1.5 rounded-md";
      case "Typewriter":
        return "text-green-400 font-mono bg-black/90 px-3 py-1 border border-green-500/50";
      case "Bold White":
      default:
        return "text-white drop-shadow-[0_4px_6px_rgba(0,0,0,1)]";
    }
  }

  function getPositionClass() {
    if (position === "top") return "top-12";
    if (position === "center") return "top-1/2 -translate-y-1/2";
    return "bottom-16";
  }

  if (!activeClip) return null; 

  return (
    <div className="min-h-screen flex flex-col md:flex-row gap-6 p-6 max-w-[1600px] mx-auto text-text-primary">
      <div className="w-full md:w-80 flex flex-col gap-4">
        <button 
          onClick={() => navigate("/select")} 
          className="text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-white text-left transition-colors flex items-center gap-1"
        >
          ← Back to clips
        </button>

        <div className="bg-surface border border-border rounded-xl flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-surface-2/50">
            <button 
              onClick={() => setActiveTab("style")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "style" ? "border-accent text-accent font-bold bg-surface" : "border-transparent text-text-secondary hover:text-white"
              }`}
            >
              Style
            </button>
            <button 
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "transcript" ? "border-accent text-accent font-bold bg-surface" : "border-transparent text-text-secondary hover:text-white"
              }`}
            >
              Transcript
            </button>
          </div>

          {activeTab === "style" && (
            <div className="p-5 overflow-y-auto space-y-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Caption Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Bold White", "Classic", "Neon", "Typewriter"].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-2.5 px-3 text-xs rounded-lg border transition-all text-left ${
                        theme === t 
                          ? "border-accent-2 bg-accent-2/10 text-white font-medium" 
                          : "border-border-strong text-text-secondary hover:border-text-secondary"
                      }`}
                    >
                      <span className="font-bold block mb-0.5">Aa</span>
                      <span className="text-[11px] block">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Highlight Color</p>
                <div className="flex flex-wrap gap-2.5">
                  {["#EAB308", "#22C55E", "#EF4444", "#3B82F6", "#A855F7", "#06B6D4", "#FFFFFF"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setHighlightColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        highlightColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Font Family</p>
                <select 
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-surface-2 border border-border-strong rounded-lg p-3 text-xs text-white focus:outline-none focus:border-accent-2"
                >
                  <option value="Impact">Impact (Bold & Heavy)</option>
                  <option value="Inter">Inter (Modern & Clean)</option>
                  <option value="Comic Sans MS">Comic Sans (Casual)</option>
                  <option value="Courier New">Courier New (Monospace)</option>
                </select>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Font Size</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Small", class: "text-lg" },
                    { label: "Medium", class: "text-2xl" },
                    { label: "Large", class: "text-4xl" }
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setFontSize(s.class)}
                      className={`py-2 text-xs border rounded-lg transition-colors ${
                        fontSize === s.class ? "border-accent bg-accent/10 text-white" : "border-border-strong text-text-secondary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Screen Position</p>
                <div className="grid grid-cols-3 gap-2">
                  {["top", "center", "bottom"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`py-2 text-xs border rounded-lg capitalize transition-colors ${
                        position === pos ? "border-accent bg-accent/10 text-white" : "border-border-strong text-text-secondary"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="p-4 overflow-y-auto space-y-4">
              <p className="text-xs text-text-muted leading-relaxed">
                Click any line to preview it on the video. Edit text directly to fix mistakes.
              </p>

              {transcriptLines.map((line, index) => (
                <div 
                  key={line.id || index}
                  onClick={() => handleLineClick(index)} 
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    activeLineIndex === index 
                      ? "border-accent bg-accent/5 shadow-md" 
                      : "border-border bg-surface-2/40 hover:border-border-strong"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] text-accent-2">{line.startTime} - {line.endTime}</span>
                    {activeLineIndex === index && <span className="text-[10px] font-mono text-accent">● Active</span>}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-mono text-text-muted block mb-0.5">Main Text</label>
                      <input 
                        type="text"
                        value={line.text}
                        onChange={(e) => handleTranscriptChange(index, "text", e.target.value)}
                        className="w-full bg-surface border border-border-strong rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-text-muted block mb-0.5">Highlighted Keyword</label>
                      <input 
                        type="text"
                        value={line.highlight}
                        onChange={(e) => handleTranscriptChange(index, "highlight", e.target.value)}
                        className="w-full bg-surface border border-border-strong rounded px-2.5 py-1.5 text-xs font-bold text-accent focus:outline-none focus:border-accent-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/40 border border-border rounded-xl">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-6">Interactive Preview</p>
        
        <div className={`relative bg-surface-2 border border-border-strong rounded-lg overflow-hidden shadow-2xl transition-all duration-300 flex items-center justify-center ${
          aspectRatio === "9:16" ? "aspect-[9/16] h-[580px]" : aspectRatio === "1:1" ? "aspect-square h-[440px]" : "aspect-video h-[320px]"
        }`}>
          <video 
            ref={videoRef}
            src={videoSrc}
            onTimeUpdate={handleTimeUpdate} 
            className="absolute inset-0 w-full h-full object-cover z-0"
            autoPlay
            loop
            muted
            controls
            playsInline
          />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 z-10 pointer-events-none" />

          {watermark && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none opacity-60">
              <span className="font-mono text-[10px] bg-black/60 text-white px-2 py-1 rounded border border-white/20">
                Clipforge
              </span>
            </div>
          )}

          <div className={`absolute left-0 w-full px-6 text-center z-20 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 ${getPositionClass()}`}>
            <p 
              style={{ fontFamily: fontFamily }}
              className={`font-bold uppercase tracking-wide leading-tight uppercase ${fontSize} ${getThemeClasses()}`}
            >
              {currentLine.text}{" "}
              <span style={{ color: highlightColor }}>
                {currentLine.highlight}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-accent text-bg font-bold text-sm rounded-lg py-4 shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)] transition-all disabled:opacity-50 cursor-pointer"
        >
          {exporting ? "Rendering Final Video…" : "⚡ Export Video"}
        </button>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Aspect Ratio</p>
            <RatioPicker value={aspectRatio} onChange={setAspectRatio} />
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-secondary mb-3">Branding</p>
            <label className="flex items-center justify-between p-3 border border-border-strong rounded-lg bg-surface-2 cursor-pointer">
              <span className="text-xs text-white">Include Watermark</span>
              <input 
                type="checkbox" 
                checked={watermark} 
                onChange={(e) => setWatermark(e.target.checked)}
                className="accent-accent w-4 h-4"
              />
            </label>
          </div>

          <div className="p-3.5 border border-border rounded-lg bg-surface-2/30 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Selected Preset</span>
              <span className="text-white font-mono">{theme}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Caption Lines</span>
              <span className="text-white font-mono">{transcriptLines.length} Segments</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Target Resolution</span>
              <span className="text-accent-2 font-mono">1080p HD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}