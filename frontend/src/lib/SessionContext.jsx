import { createContext, useContext, useState, useCallback } from "react";
import { api } from "./api";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [file, setFile] = useState(null); // Now stores the raw File object
  const [ratio, setRatio] = useState("9:16");

  const [jobId, setJobId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const startProcessing = useCallback(async () => {
    // Package everything into FormData
    const payload = new FormData();

    if (file) payload.append("video", file);

    payload.append("ratio", ratio);

    const { jobId: newJobId } = await api.startJob(payload);
    setJobId(newJobId);
    return newJobId;
  }, [file, ratio]);

  const fetchCandidatesForJob = useCallback(async (id) => {
    const { candidates: fetchedCandidates } = await api.getCandidates(id);
    setCandidates(fetchedCandidates);
    setSelectedIds(new Set());
    return fetchedCandidates;
  }, []);

  const exportSelected = useCallback(async () => {
    const { clips } = await api.exportClips({
      jobId,
      clipIds: Array.from(selectedIds),
      ratio,
    });
    setResults(clips);
    setHistory((prev) => [
      {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ratio,
        count: clips.length,
      },
      ...prev,
    ]);
    return clips;
  }, [jobId, selectedIds, ratio]);

  const reexportAll = useCallback(async (newRatio) => {
    setRatio(newRatio);
    const { clips } = await api.reexport({ jobId, clipIds: results.map((c) => c.id), ratio: newRatio });
    setResults(clips);
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...rest] = prev;
      return [{ ...head, ratio: newRatio }, ...rest];
    });
    return clips;
  }, [jobId, results]);

  const value = {
    file, setFile,
    ratio, setRatio,
    jobId,
    candidates,
    selectedIds, toggleSelected,
    results,
    history,
    startProcessing,
    fetchCandidatesForJob,
    exportSelected,
    reexportAll,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
