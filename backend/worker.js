import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const outputDir = path.join(__dirname, "outputs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const worker = new Worker("video-jobs", async (job) => {
  const { fileName, filePath, ratio } = job.data;
  console.log(`[Worker] Starting rendering processes for file: ${fileName}`);
  
  const inputPath = filePath || path.join(__dirname, "uploads", fileName);
  const generatedClips = [];
  
  for (let i = 0; i < 3; i++) {
    const clipBaseName = `${job.id}_clip${i + 1}`;
    const outputFileName = `${clipBaseName}.mp4`;
    const audioFileName = `${clipBaseName}.mp3`;
    const srtFileName = `${clipBaseName}.srt`;
    
    const outputPath = path.join(outputDir, outputFileName);
    const audioPath = path.join(outputDir, audioFileName);
    const srtPath = path.join(outputDir, srtFileName);
    
    const startTime = i * 10; 
    await job.updateProgress(10 + (i * 25));

    console.log(`[Clip ${i+1}] Extracting audio...`);
    
    // 1. Extract audio for the AI
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .setDuration(8)
        .noVideo()
        .output(audioPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log(`[Clip ${i+1}] Asking Whisper for captions...`);

    // 2. Send to Whisper AI to generate real subtitles
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        response_format: "srt" // Whisper natively returns perfectly timed subtitle files!
      });
      fs.writeFileSync(srtPath, transcription);
    } catch (err) {
      console.error("Whisper API Error (did you set your API key?):", err.message);
      // Create a blank SRT file so the video doesn't crash if OpenAI fails
      fs.writeFileSync(srtPath, ""); 
    }

    console.log(`[Clip ${i+1}] Rendering final video with burned captions...`);

    // 3. Render the video: Force true vertical aspect ratio AND burn subtitles
    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startTime)     
        .setDuration(8)   
        .outputOptions([
          "-preset ultrafast", 
          "-threads 2",        
          "-crf 28"            
        ]);

      // THE ASPECT RATIO FIX: 
      // Scale height to 720 first, then crop the width to exactly 406 pixels. 
      // This guarantees the MP4 file is physically 9:16, not just squished in CSS.
      let filterChain = "";
      if (ratio === "9:16") {
        filterChain = "scale=-1:720,crop=406:720";
      } else if (ratio === "1:1") {
        filterChain = "scale=-1:720,crop=720:720";
      } else {
        filterChain = "scale=-2:720";
      }

      // Add the real Whisper subtitles to the filter chain.
      // Alignment=2 puts it at the bottom center.
      filterChain += `,subtitles=${srtPath}:force_style='FontSize=22,PrimaryColour=&H00FFFFFF,Alignment=2,MarginV=30'`;

      command
        .videoFilters(filterChain)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => {
          console.error(`[FFmpeg Error on Clip ${i+1}]`, err.message);
          reject(err);
        })
        .run();
    });

    generatedClips.push({
      id: clipBaseName,
      score: `${95 - (i * 4)}% match`,
      duration: "0:08",
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio 
    });
    
    // Cleanup the temp audio/srt files so we don't run out of disk space
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} finished 3 clips!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg AI Worker is online and waiting for jobs...");