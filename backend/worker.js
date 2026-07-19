import { Worker } from "bullmq";
import Redis from "ioredis";

const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

// Create a worker that constantly listens to the "video-jobs" queue
const worker = new Worker("video-jobs", async (job) => {
  console.log(`[Worker] Picked up Job ${job.id} for file: ${job.data.fileName}`);
  
  // Step 1: Transcribing audio
  console.log(`[Worker] ${job.id} - Transcribing...`);
  await job.updateProgress(15);
  await new Promise(r => setTimeout(r, 2000)); // TODO: Replace with Whisper API
  
  // Step 2: Scoring highlights
  console.log(`[Worker] ${job.id} - Scoring moments...`);
  await job.updateProgress(45);
  await new Promise(r => setTimeout(r, 2000)); // TODO: Replace with LLM scoring
  
  // Step 3: Applying zooms
  console.log(`[Worker] ${job.id} - Applying zooms and ratio (${job.data.ratio})...`);
  await job.updateProgress(65);
  await new Promise(r => setTimeout(r, 3000)); // TODO: Replace with FFmpeg Crop
  
  // Step 4: Rendering options
  console.log(`[Worker] ${job.id} - Rendering final candidates...`);
  await job.updateProgress(90);
  await new Promise(r => setTimeout(r, 2000)); // TODO: Replace with FFmpeg Export
  
  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} completely finished!`);
  
  return { success: true };
}, { connection: redisConnection });

worker.on("completed", (job) => console.log(`[Worker] Job ${job.id} safely stored as completed in Redis.`));
worker.on("failed", (job, err) => console.error(`[Worker] Job ${job.id} crashed:`, err));

console.log("Background Worker is online and waiting for videos...");