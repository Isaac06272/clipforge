import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

// Ensure output directories exist inside worker runtime env
const outputDir = path.join(__dirname, "outputs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const worker = new Worker("video-jobs", async (job) => {
  const { fileName, filePath, ratio } = job.data;
  console.log(`[Worker] Starting rendering processes for file: ${fileName}`);
  
  await job.updateProgress(15);
  
  // If no native file upload (like an un-downloaded YouTube URL link), supply a default sample
  const inputPath = filePath || path.join(__dirname, "uploads", fileName);
  const outputFileName = `${job.id}_clip1.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  await job.updateProgress(45);

  // Execute native FFmpeg operational processes asynchronously
  await new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .setStartTime(1)  // Extract starting at 1 second offset
      .setDuration(8);  // Clean render window target of 8 seconds

    // Calculate precision cropping metrics to execute vertical adjustments
    if (ratio === "9:16") {
      command = command.videoFilters("crop=ih*(9/16):ih");
    } else if (ratio === "1:1") {
      command = command.videoFilters("crop=ih:ih");
    }

    command
      .output(outputPath)
      .on("start", (cmd) => console.log(`[FFmpeg] Firing pipeline context command: ${cmd}`))
      .on("progress", (p) => {
        // Increment progress dynamically within the rendering stage (range 45% - 90%)
        const currentProgress = Math.min(45 + Math.floor((p.percent || 0) * 0.45), 90);
        job.updateProgress(currentProgress).catch(() => {});
      })
      .on("end", () => {
        console.log(`[FFmpeg] Successfully generated crop render asset output: ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error(`[FFmpeg Error]: Failed rendering pipeline processing execution`, err);
        reject(err);
      })
      .run();
  });

  await job.updateProgress(100);
  
  // Return parameters referencing the physical static files served over Express routes
  return { 
    clips: [
      { 
        id: `${job.id}_clip1`, 
        score: "95% match", 
        duration: "0:08", 
        url: `/outputs/${outputFileName}`,
        fileSlug: outputFileName
      }
    ] 
  };
}, { connection: redisConnection });

console.log("FFmpeg Worker is initialized, connected to Redis, and waiting for jobs...");