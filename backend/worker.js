import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import ytdl from "@distube/ytdl-core"; // NEW: YouTube Downloader

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
  // NEW: We now extract mode, prompt, and youtubeUrl from the job data
  const { fileName, filePath, ratio, mode, prompt, youtubeUrl } = job.data;
  console.log(`[Worker] Starting rendering processes for job ${job.id}`);
  
  let inputPath = filePath;

  // --- YOUTUBE DOWNLOAD LOGIC ---
  if (youtubeUrl) {
    console.log(`[Worker] Downloading YouTube video from: ${youtubeUrl}`);
    inputPath = path.join(__dirname, "uploads", `${job.id}_youtube.mp4`);
    
    await new Promise((resolve, reject) => {
      // We grab the lowest quality video to save bandwidth/time for the draft previews
      ytdl(youtubeUrl, { quality: 'lowestvideo', filter: 'audioandvideo' })
        .pipe(fs.createWriteStream(inputPath))
        .on("finish", resolve)
        .on("error", reject);
    });
    console.log(`[Worker] YouTube download complete.`);
  } else if (!inputPath) {
    inputPath = path.join(__dirname, "uploads", fileName);
  }

  const generatedClips = [];
  
  for (let i = 0; i < 3; i++) {
    const clipBaseName = `${job.id}_clip${i + 1}`;
    const outputFileName = `${clipBaseName}.mp4`;
    const audioFileName = `${clipBaseName}.mp3`;
    const srtFileName = `${clipBaseName}.srt`;
    
    const outputPath = path.join(outputDir, outputFileName);
    const audioPath = path.join(outputDir, audioFileName);
    const srtPath = path.join(outputDir, srtFileName);
    
    const duration = Math.floor(Math.random() * 9) + 10; 
    const startTime = (i * 20) + Math.floor(Math.random() * 5); 
    
    await job.updateProgress(10 + (i * 25));

    console.log(`[Clip ${i+1}] Extracting audio...`);
    
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

      console.log(`[Clip ${i+1}] Asking Gemini for SRT captions...`);
      const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // --- CUSTOM MODE LOGIC ---
      // If the user selected custom mode and typed a prompt, we inject it here!
      const aiPrompt = mode === "prompt" && prompt
        ? `Listen to this short audio clip. The user wants the video edited with this specific vibe/focus: "${prompt}". Keep their request in mind and generate a perfectly formatted SRT subtitle file for the clip. \nCRITICAL RULES:\n1. Output ONLY the raw SRT format.\n2. Start directly with the number '1'.\n3. You MUST use exact time format: 00:00:00,000 --> 00:00:04,000.\n4. Break the text into short, punchy lines.`
        : `Listen to this short audio clip. Generate a perfectly formatted SRT subtitle file for it. \nCRITICAL RULES:\n1. Output ONLY the raw SRT format. Do not say "Here are your subtitles".\n2. Start directly with the number '1'.\n3. You MUST use the exact time format: 00:00:00,000 --> 00:00:04,000.\n4. Break the text into short, punchy lines.`;
      
      const result = await aiModel.generateContent([
        {
          fileData: {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri
          }
        },
        aiPrompt
      ]);
      
      let transcription = result.response.text();
      await fileManager.deleteFile(uploadResult.file.name);
      
      if (transcription && transcription.trim().length > 0) {
        transcription = transcription.replace(/```srt\n?/gi, "").replace(/```\n?/g, "").trim();
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

      // --- SUBTITLE SIZE AND POSITION FIX ---
      // FontSize is now 14 (smaller). MarginV is 15 (pushed closer to the bottom edge).
      if (hasSubtitles) {
        filterChain += `,subtitles=${srtPath}:force_style='FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=15'`;
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

  // If it was a downloaded YouTube video, clean it up so your server doesn't run out of storage
  if (youtubeUrl && fs.existsSync(inputPath)) {
     fs.unlinkSync(inputPath);
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} finished!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Gemini AI Worker is online and waiting for jobs...");