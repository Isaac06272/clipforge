import { processJob } from "./worker.js";

// In-process job store — replaces BullMQ/Redis entirely.
//
// Job state lives in memory for the life of the process, so a deploy or
// restart loses any in-flight job. That's an accepted trade-off for a
// personal tool (Render's paid Redis add-on would otherwise be required).
const jobs = new Map();
let sequence = 0;

export function createJob(data) {
  const jobId = `job_${Date.now()}_${++sequence}`;
  const job = {
    id: jobId,
    data,
    status: "queued", // queued | processing | done | failed
    progress: 0, // 0-100
    candidates: [], // clips produced by Phase 1
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  // Fire-and-forget. The worker writes status/progress/candidates directly
  // onto the record; errors are captured on the job instead of crashing.
  processJob(job).catch((err) => {
    console.error(`[JobStore] Job ${jobId} failed:`, err.message);
    job.status = "failed";
    job.error = err.message;
  });

  return job;
}

export function getJobStatus(id) {
  const job = jobs.get(id);
  if (!job) return null;

  const stepIndex =
    job.progress < 25 ? 0 : job.progress < 50 ? 1 : job.progress < 75 ? 2 : job.progress < 100 ? 3 : 4;

  return {
    status: job.status === "done" ? "done" : job.status === "failed" ? "error" : "processing",
    stepIndex: job.status === "done" ? 4 : stepIndex,
    progress: job.status === "done" ? 100 : job.progress,
    ...(job.error ? { error: job.error } : {}),
  };
}

export function getCandidatesForJob(id) {
  return jobs.get(id)?.candidates ?? [];
}

export function getJobById(id) {
  return jobs.get(id) || null;
}
