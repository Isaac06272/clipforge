import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import ytdl from "@distube/ytdl-core";

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
  const { fileName, filePath, ratio, mode, prompt, youtubeUrl } = job.data;
  console.log(`[Worker] Starting Smart AI rendering for job ${job.id}`);
  
  let inputPath = filePath;

  // 1. YOUTUBE DOWNLOADER
  if (youtubeUrl) {
    console.log(`[Worker] Downloading YouTube video...`);
    inputPath = path.join(__dirname, "uploads", `${job.id}_youtube.mp4`);
    await new Promise((resolve, reject) => {
      ytdl(youtubeUrl, { quality: 'lowestvideo', filter: 'audioandvideo' })
        .pipe(fs.createWriteStream(inputPath))
        .on("finish", resolve)
        .on("error", reject);
    });
  } else if (!inputPath) {
    inputPath = path.join(__dirname, "uploads", fileName);
  }

  await job.updateProgress(15);

  // 2. EXTRACT THE ENTIRE AUDIO FILE ONCE
  const fullAudioFileName = `${job.id}_full_audio.mp3`;
  const fullAudioPath = path.join(outputDir, fullAudioFileName);
  
  console.log(`[Worker] Extracting full audio track for Gemini analysis...`);
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .output(fullAudioPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  await job.updateProgress(30);

  // 3. UPLOAD AND ASK GEMINI TO ACT AS THE EDITOR
  console.log(`[Worker] Uploading full audio to Gemini...`);
  const uploadResult = await fileManager.uploadFile(fullAudioPath, {
    mimeType: "audio/mp3",
    displayName: fullAudioFileName,
  });

  let clipsData = [];
  try {
    console.log(`[Worker] Asking Gemini to find the best cuts...`);
    
    // We enforce JSON output so our code can read the timestamps perfectly
    const aiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const basePrompt = `You are an expert AI video editor. Listen to this entire audio track. Find the 3 best segments (10-20 seconds each) to turn into short-form viral clips.`;
    
    const modePrompt = mode === "prompt" && prompt
      ? `CRITICAL INSTRUCTION: The user specifically requested: "${prompt}". You MUST find clips that match this request.`
      : `CRITICAL INSTRUCTION: Find the most engaging, funny, or insightful highlights.`;

    const schemaPrompt = `
    Analyze the audio and return a JSON array containing exactly 3 clip objects.
    Each object must have exactly these keys:
    - "startTime": the start time of the clip in the original audio (in seconds, as a number).
    - "duration": the length of the clip (in seconds, as a number, between 10 and 20).
    - "score": a string representing how good the clip is (e.g. "98% match").
    - "srt": The complete, valid SRT subtitle string for this specific clip. The SRT timestamps MUST reset to 00:00:00,000 for the beginning of the clip! Break the text into short, punchy lines.
    `;

    const finalInstruction = `${basePrompt}\n${modePrompt}\n${schemaPrompt}`;

    const result = await aiModel.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      finalInstruction
    ]);
    
    // Parse the JSON array returned by Gemini
    clipsData = JSON.parse(result.response.text());
    console.log(`[Worker] Gemini successfully picked ${clipsData.length} clips!`);
    
  } catch (err) {
    console.error("Gemini API Error or JSON Parse Error:", err.message);
    throw new Error("Failed to generate smart clips from the AI.");
  } finally {
    // Always clean up the master audio file from Google's servers
    await fileManager.deleteFile(uploadResult.file.name);
    if (fs.existsSync(fullAudioPath)) fs.unlinkSync(fullAudioPath);
  }

  await job.updateProgress(60);

  // 4. CUT THE VIDEO BASED ON GEMINI'S TIMESTAMPS
  const generatedClips = [];
  
  // Loop through the exact choices Gemini made
  for (let i = 0; i < clipsData.length; i++) {
    const aiClip = clipsData[i];
    const clipBaseName = `${job.id}_clip${i + 1}`;
    const outputFileName = `${clipBaseName}.mp4`;
    const srtFileName = `${clipBaseName}.srt`;
    
    const outputPath = path.join(outputDir, outputFileName);
    const srtPath = path.join(outputDir, srtFileName);
    
    // Save Gemini's generated SRT into a real file for FFmpeg to read
    fs.writeFileSync(srtPath, aiClip.srt);

    console.log(`[Clip ${i+1}] Rendering AI choice: Start ${aiClip.startTime}s, Duration ${aiClip.duration}s`);

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(aiClip.startTime) // Cut exactly where Gemini told us to!
        .setDuration(aiClip.duration)   
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

      // Add the perfectly synced AI subtitles
      filterChain += `,subtitles=${srtPath}:force_style='FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=15'`;

      command
        .videoFilters(filterChain)
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const formattedDuration = `0:${Math.round(aiClip.duration).toString().padStart(2, "0")}`;

    generatedClips.push({
      id: clipBaseName,
      score: aiClip.score || `${95 - (i * 2)}% match`,
      duration: formattedDuration,
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio 
    });
    
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
    
    // Update progress dynamically as each clip finishes
    await job.updateProgress(60 + Math.floor(((i + 1) / clipsData.length) * 40));
  }

  if (youtubeUrl && fs.existsSync(inputPath)) {
     fs.unlinkSync(inputPath);
  }

  await job.updateProgress(100);
  console.log(`[Worker] Job ${job.id} completely finished!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Master AI Editor Worker is online and waiting for jobs...");