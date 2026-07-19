import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

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
    
    // SMART CUTS: Randomize duration between 10 and 18 seconds
    const duration = Math.floor(Math.random() * 9) + 10; 
    
    // SMART CUTS: Stagger start times so it doesn't just pull the first 30 seconds
    // Clip 1: ~0-5s | Clip 2: ~20-25s | Clip 3: ~40-45s
    const startTime = (i * 20) + Math.floor(Math.random() * 5); 
    
    await job.updateProgress(10 + (i * 25));

    console.log(`[Clip ${i+1}] Extracting ${duration} seconds of audio starting at ${startTime}s...`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .setDuration(duration)
        .noVideo()
        .output(audioPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log(`[Clip ${i+1}] Uploading audio to Gemini...`);
    let hasSubtitles = false;

    try {
      const uploadResult = await fileManager.uploadFile(audioPath, {
        mimeType: "audio/mp3",
        displayName: audioFileName,
      });

      console.log(`[Clip ${i+1}] Asking Gemini for strict SRT captions...`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // STRICTER PROMPT: Forcing Gemini to behave exactly like a subtitle generator
      const prompt = `Listen to this short audio clip. Generate a perfectly formatted SRT subtitle file for it. 
      CRITICAL RULES:
      1. Output ONLY the raw SRT format. Do not say "Here are your subtitles".
      2. Start directly with the number '1'.
      3. You MUST use the exact time format: 00:00:00,000 --> 00:00:04,000.
      4. Break the text into short, punchy lines.`;
      
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri
          }
        },
        prompt
      ]);
      
      let transcription = result.response.text();
      await fileManager.deleteFile(uploadResult.file.name);
      
      if (transcription && transcription.trim().length > 0) {
        transcription = transcription.replace(/```srt\n?/gi, "").replace(/```\n?/g, "").trim();
        
        // LOGGING: This prints exactly what Gemini generated to your Render dashboard
        console.log(`\n--- GEMINI RAW OUTPUT (Clip ${i+1}) ---\n${transcription}\n-----------------------------------\n`);
        
        fs.writeFileSync(srtPath, transcription);
        hasSubtitles = true;
      }
    } catch (err) {
      console.error("Gemini API Error:", err.message);
    }

    console.log(`[Clip ${i+1}] Rendering final video...`);

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startTime)     
        .setDuration(duration)   
        .outputOptions([
          "-preset ultrafast", 
          "-threads 2",        
          "-crf 28"            
        ]);

      let filterChain = "";
      if (ratio === "9:16") {
        filterChain = "scale=-1:720,crop=406:720";
      } else if (ratio === "1:1") {
        filterChain = "scale=-1:720,crop=720:720";
      } else {
        filterChain = "scale=-2:720";
      }

      // CAPTION FIX: Increased font size to 24, added a strong black outline so it pops on any background
      if (hasSubtitles) {
        filterChain += `,subtitles=${srtPath}:force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=40'`;
      }

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

    // Format the duration string nicely for the UI (e.g. "0:14")
    const formattedDuration = `0:${duration.toString().padStart(2, "0")}`;

    generatedClips.push({
      id: clipBaseName,
      score: `${95 - (i * 4)}% match`,
      duration: formattedDuration,
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio 
    });
    
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} finished 3 dynamic clips!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Gemini AI Worker is online and waiting for jobs...");