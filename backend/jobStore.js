import { Queue } from "bullmq";
import Redis from "ioredis";

const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

export const videoQueue = new Queue("video-jobs", { connection: redisConnection });

export async function createJob({ fileName, filePath, ratio, mode, prompt }) {
  const jobId = `job_${Date.now()}`;
  
  await videoQueue.add(
    "process-video", 
    { fileName, filePath, ratio, mode, prompt }, 
    { jobId }
  );
  
  return jobId;
}

export async function getJobStatus(id) {
  const job = await videoQueue.getJob(id);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress || 0;
  
  const stepIndex = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : progress < 100 ? 3 : 4;

  return {
    status: state === "completed" ? "done" : state === "failed" ? "error" : "processing",
    stepIndex: state === "completed" ? 4 : stepIndex,
    progress: state === "completed" ? 100 : progress,
  };
}

export async function getCandidatesForJob(id) {
  const job = await videoQueue.getJob(id);
  if (!job || !job.returnvalue || !job.returnvalue.clips) {
    return [];
  }
  return job.returnvalue.clips;
}