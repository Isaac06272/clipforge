import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/SessionContext";

export default function Select() {
  const navigate = useNavigate();
  const { candidates } = useSession();
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">step 03</p>
      <h1 className="font-display font-bold text-2xl mb-1.5">Choose a clip to edit</h1>
      <p className="text-sm text-text-secondary mb-6">
        The AI found {candidates.length} highlights. Pick one to customize in the editor.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-8">
        {candidates.map((c) => {
          // Determine the correct CSS shape based on the ratio returned from the server
          const shapeClass = 
            c.ratio === "9:16" ? "aspect-[9/16]" : 
            c.ratio === "1:1" ? "aspect-square" : 
            "aspect-video";

          return (
            <div
              key={c.id}
              className="rounded-lg border border-border-strong p-2.5 bg-surface transition-colors flex flex-col hover:border-accent"
            >
              {/* Dynamic Media Player Container */}
              <div className={`relative bg-surface-2 rounded-md overflow-hidden mb-2 border border-border ${shapeClass}`}>
                <video 
                  src={`${API_BASE_URL}${c.url}`}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
              
              <div className="mt-auto pt-1 flex items-center justify-between mb-4">
                <p className="font-mono text-[11px] text-accent-2">{c.score}</p>
                <p className="font-mono text-xs text-text-muted">{c.duration}</p>
              </div>

              {/* Passes the specific clip data to the Editor via React Router state */}
              <button
                type="button"
                onClick={() => navigate('/editor', { state: { activeClip: c } })}
                className="w-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg font-medium text-xs rounded-lg py-2.5 transition-colors cursor-pointer"
              >
                Open in Editor →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}