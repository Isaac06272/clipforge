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

// Initialize Gemini instead of OpenAI
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

    console.log(`[Clip ${i+1}] Uploading audio to Gemini...`);
    let hasSubtitles = false;

    // 2. Send to Gemini AI to generate real subtitles
    try {
      // Gemini requires us to temporarily upload the file to their server first
      const uploadResult = await fileManager.uploadFile(audioPath, {
        mimeType: "audio/mp3",
        displayName: audioFileName,
      });

      console.log(`[Clip ${i+1}] Asking Gemini for SRT captions...`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Explicitly instruct Gemini to only output raw SRT formatting
      const prompt = "Transcribe this audio exactly. Output ONLY a valid SRT format subtitle file. Do not include any markdown blocks like ```srt or conversational text. Start directly with '1'.";
      
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
      
      // Clean up the file from Google's servers to save your free storage quota
      await fileManager.deleteFile(uploadResult.file.name);
      
      if (transcription && transcription.trim().length > 0) {
        // Strip out markdown backticks just in case Gemini tries to format it as code
        transcription = transcription.replace(/```srt\n?/gi, "").replace(/```\n?/g, "").trim();
        
        fs.writeFileSync(srtPath, transcription);
        hasSubtitles = true;
      } else {
         console.log(`[Clip ${i+1}] Audio found, but no speech detected by Gemini.`);
      }
    } catch (err) {
      console.error("Gemini API Error (did you set your GEMINI_API_KEY?):", err.message);
    }

    console.log(`[Clip ${i+1}] Rendering final video...`);

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
      let filterChain = "";
      if (ratio === "9:16") {
        filterChain = "scale=-1:720,crop=406:720";
      } else if (ratio === "1:1") {
        filterChain = "scale=-1:720,crop=720:720";
      } else {
        filterChain = "scale=-2:720";
      }

      // Add the real Gemini subtitles to the filter chain if they exist
      if (hasSubtitles) {
        filterChain += `,subtitles=${srtPath}:force_style='FontSize=22,PrimaryColour=&H00FFFFFF,Alignment=2,MarginV=30'`;
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

    generatedClips.push({
      id: clipBaseName,
      score: `${95 - (i * 4)}% match`,
      duration: "0:08",
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio 
    });
    
    // Cleanup the temp audio/srt files from your server disk
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} finished 3 clips!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Gemini AI Worker is online and waiting for jobs...");