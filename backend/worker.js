import { Worker } from "bullmq";
import Redis from "ioredis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import youtubedl from "youtube-dl-exec"; 

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
    try {
      await youtubedl(youtubeUrl, {
        output: inputPath,
        format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4", 
      });
    } catch (err) {
      console.error(`[Worker] YouTube download failed:`, err);
      throw new Error("Failed to download YouTube video. The link might be private or restricted.");
    }
  } else if (!inputPath) {
    inputPath = path.join(__dirname, "uploads", fileName);
  }

  await job.updateProgress(15);

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

  console.log(`[Worker] Uploading full audio to Gemini...`);
  const uploadResult = await fileManager.uploadFile(fullAudioPath, {
    mimeType: "audio/mp3",
    displayName: fullAudioFileName,
  });

  let clipsData = [];
  try {
    console.log(`[Worker] Asking Gemini to find the best cuts...`);
    
    const aiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const basePrompt = `You are a professional video editor. Listen to this entire audio track and find the 3 most engaging segments (10-20 seconds each).`;
    
    const modePrompt = mode === "prompt" && prompt
      ? `CRITICAL INSTRUCTION: The user specifically requested: "${prompt}". You MUST find clips that match this request.`
      : `CRITICAL INSTRUCTION: Focus on rapid dialogue, punchlines, or key highlights.`;

    // UPDATED: Selective keyword highlighting rule
    const schemaPrompt = `
    Analyze the audio and return a JSON array containing exactly 3 clip objects.
    Each object must have exactly these keys:
    - "startTime": the start time of the clip (in seconds, as a number).
    - "duration": the length of the clip (in seconds, as a number, between 10 and 20).
    - "score": a string representing how good the clip is (e.g. "98% match").
    - "srt": The complete, valid SRT subtitle string for this clip. 
    
    SRT FORMATTING RULES:
    1. Timestamps MUST reset to 00:00:00,000 at clip start!
    2. Maximum 2 to 4 words per line for clean pacing.
    3. ALL TEXT MUST BE WRITTEN IN ALL CAPS.
    4. HIGHLIGHT KEYWORDS SPARINGLY: Do NOT highlight words on every line! Only pick 1 or 2 truly major impact/punchline words in the entire clip to highlight using HTML font tags (e.g. <font color="yellow">PUNCHLINE</font> or <font color="#00FF00">IMPORTANT</font>). Leave all other standard lines in plain text without any tags.
    `;

    const finalInstruction = `${basePrompt}\n${modePrompt}\n${schemaPrompt}`;

    const result = await aiModel.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      finalInstruction
    ]);
    
    clipsData = JSON.parse(result.response.text());
    
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    throw new Error("Failed to generate smart clips from the AI.");
  } finally {
    await fileManager.deleteFile(uploadResult.file.name);
    if (fs.existsSync(fullAudioPath)) fs.unlinkSync(fullAudioPath);
  }

  await job.updateProgress(60);

  const generatedClips = [];
  
  for (let i = 0; i < clipsData.length; i++) {
    const aiClip = clipsData[i];
    const clipBaseName = `${job.id}_clip${i + 1}`;
    const outputFileName = `${clipBaseName}.mp4`;
    const srtFileName = `${clipBaseName}.srt`;
    
    const outputPath = path.join(outputDir, outputFileName);
    const srtPath = path.join(outputDir, srtFileName);
    
    fs.writeFileSync(srtPath, aiClip.srt);

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(aiClip.startTime) 
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

      // UPDATED CAPTION STYLE: Smaller font (18), clean outline (2), lower-center position (MarginV=35)
      filterChain += `,subtitles=${srtPath}:force_style='FontName=Impact,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=35'`;

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
    await job.updateProgress(60 + Math.floor(((i + 1) / clipsData.length) * 40));
  }

  if (youtubeUrl && fs.existsSync(inputPath)) {
     fs.unlinkSync(inputPath);
  }

  await job.updateProgress(100);
  return { clips: generatedClips };
}, { connection: redisConnection });