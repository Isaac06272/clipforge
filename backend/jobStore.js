// In-memory store standing in for a real job queue (e.g. BullMQ + Redis).
// Each job simulates the 4 processing steps over a fixed duration so the
// frontend's polling has something real to show progress against.

const STEP_COUNT = 4;
const STEP_DURATION_MS = 1400; // time spent "in" each step
const TOTAL_DURATION_MS = STEP_COUNT * STEP_DURATION_MS;

const jobs = new Map();

const CANDIDATE_POOL = [
  { score: "92% match", duration: "0:38" },
  { score: "87% match", duration: "0:51" },
  { score: "84% match", duration: "0:29" },
  { score: "79% match", duration: "1:04" },
  { score: "75% match", duration: "0:44" },
  { score: "71% match", duration: "0:33" },
];

export function createJob({ fileName, ratio, mode, prompt }) {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(id, {
    id,
    fileName,
    ratio,
    mode,
    prompt,
    startedAt: Date.now(),
  });
  return id;
}

export function getJobStatus(id) {
  const job = jobs.get(id);
  if (!job) return null;

  const elapsed = Date.now() - job.startedAt;
  const clampedElapsed = Math.min(elapsed, TOTAL_DURATION_MS);
  const stepIndex = Math.min(Math.floor(clampedElapsed / STEP_DURATION_MS), STEP_COUNT - 1);
  const progress = Math.round((clampedElapsed / TOTAL_DURATION_MS) * 100);
  const done = elapsed >= TOTAL_DURATION_MS;

  return {
    status: done ? "done" : "processing",
    stepIndex: done ? STEP_COUNT : stepIndex,
    progress: done ? 100 : progress,
  };
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function getCandidatesForJob(id) {
  // In a real build: pull from the transcript-scoring step's output for
  // this specific job. Mocked here with a fixed pool.
  return CANDIDATE_POOL.map((c, idx) => ({ id: `${id}_clip${idx}`, ...c }));
}
