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

const outputDir = path.join(__dirname, "outputs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const worker = new Worker("video-jobs", async (job) => {
  const { fileName, filePath, ratio } = job.data;
  console.log(`[Worker] Starting rendering processes for file: ${fileName}`);
  
  const inputPath = filePath || path.join(__dirname, "uploads", fileName);
  const generatedClips = [];
  
  // Create 3 separate clips sequentially (Starts at 0s, 10s, and 20s)
  for (let i = 0; i < 3; i++) {
    const outputFileName = `${job.id}_clip${i + 1}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);
    const startTime = i * 10; 
    
    // Calculate progress (ranges from 10% to 90% across the 3 clips)
    const baseProgress = 10 + (i * 25);
    await job.updateProgress(baseProgress);

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startTime)     
        .setDuration(8)   
        .outputOptions([
          "-preset ultrafast", 
          "-threads 2",        
          "-crf 28"            
        ]);

      // Step 1: Crop and Scale
      let filterChain = "";
      if (ratio === "9:16") {
        filterChain = "crop=ih*(9/16):ih,scale=-2:720";
      } else if (ratio === "1:1") {
        filterChain = "crop=ih:ih,scale=720:720";
      } else {
        filterChain = "scale=-2:720";
      }

      // Step 2: Add Subtitle Captions (Centered at the bottom)
      // This creates a black box with white text over the video
      const captionText = `Sample Caption Clip ${i + 1}`;
      filterChain += `,drawtext=text='${captionText}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-(h/4)`;

      command
        .videoFilters(filterChain)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => {
          console.error(`[FFmpeg Error on Clip ${i+1}]`, err);
          reject(err);
        })
        .run();
    });

    // Save the generated clip data so the frontend can display it
    generatedClips.push({
      id: `${job.id}_clip${i + 1}`,
      score: `${95 - (i * 4)}% match`, // Fake AI scores: 95%, 91%, 87%
      duration: "0:08",
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio // Pass the ratio back so the UI knows what shape to draw
    });
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} finished 3 clips!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Worker is initialized, connected to Redis, and waiting for jobs...");