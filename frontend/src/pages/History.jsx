import { useSession } from "../lib/SessionContext";

export default function History() {
  const { history } = useSession();

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-2 mb-2">this session</p>
      <h1 className="font-display font-bold text-2xl mb-7">History</h1>

      {history.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-16">
          No exports yet this session — finish an edit to see it here.
        </p>
      ) : (
        <div className="space-y-2.5">
          {history.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-surface border border-border rounded-lg p-4"
            >
              <div>
                <p className="text-sm font-medium mb-0.5">
                  {h.count} clip{h.count > 1 ? "s" : ""} · {h.mode === "prompt" ? "custom prompt" : "auto edit"}
                </p>
                <p className="font-mono text-[11px] text-text-muted">
                  {h.time} · {h.ratio}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
