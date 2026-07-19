import { Queue } from "bullmq";
import Redis from "ioredis";

// Connect to Render's Redis URL, or use local Redis if running on your PC
const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

// Create the processing queue
export const videoQueue = new Queue("video-jobs", { connection: redisConnection });

export async function createJob({ fileName, ratio, mode, prompt, youtubeUrl }) {
  const jobId = `job_${Date.now()}`;
  
  // Instantly drop the task into the background queue
  await videoQueue.add(
    "process-video", 
    { fileName, ratio, mode, prompt, youtubeUrl }, 
    { jobId }
  );
  
  return jobId;
}

export async function getJobStatus(id) {
  const job = await videoQueue.getJob(id);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress || 0;
  
  // Map our 100% progress integer back to the 4 UI steps your React app expects
  const stepIndex = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : progress < 100 ? 3 : 4;

  return {
    status: state === "completed" ? "done" : state === "failed" ? "error" : "processing",
    stepIndex: state === "completed" ? 4 : stepIndex,
    progress: state === "completed" ? 100 : progress,
  };
}

export async function getCandidatesForJob(id) {
  // In Phase 3, we will pull the real FFmpeg output here.
  // For now, we return our placeholder pool so the UI doesn't break.
  return [
    { id: `${id}_clip1`, score: "92% match", duration: "0:38" },
    { id: `${id}_clip2`, score: "87% match", duration: "0:51" },
    { id: `${id}_clip3`, score: "84% match", duration: "0:29" },
  ];
}