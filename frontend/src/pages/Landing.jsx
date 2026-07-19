import { Link } from "react-router-dom";

const FEATURES = [
  { title: "Auto Captions", desc: "High-accuracy transcription with dynamic styles tailored for short-form." },
  { title: "Smart Zooms", desc: "Algorithmic face and action tracking for precise vertical reframing, keeping the subject in focus." },
  { title: "Custom Prompt", desc: "Direct the AI engine with natural language instructions to find specific moments or apply unique edits." },
];

export default function Landing() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-4">
        upload once · edit any way
      </p>
      <h1 className="font-display font-bold text-4xl sm:text-5xl leading-tight mb-5">
        Turn long videos into <span className="text-accent">viral shorts</span> in seconds
      </h1>
      <p className="text-text-secondary max-w-md mx-auto mb-8">
        Our AI engine identifies highlights, applies smart zooms, and generates captions automatically.
      </p>
      <Link
        to="/configure"
        className="inline-block bg-accent text-bg font-medium text-sm rounded-lg px-6 py-3 hover:opacity-90 transition-opacity"
      >
        ↑ Upload a video
      </Link>

      <div className="grid sm:grid-cols-3 gap-4 mt-20 text-left">
        {FEATURES.map((f) => (
          <div key={f.title} className="border border-border rounded-xl bg-surface p-5">
            <h3 className="font-display text-sm font-medium mb-1.5">{f.title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
