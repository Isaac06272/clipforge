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

  // --- FIX 1: THE NEW YOUTUBE DOWNLOADER ---
  if (youtubeUrl) {
    console.log(`[Worker] Downloading YouTube video using youtube-dl-exec...`);
    inputPath = path.join(__dirname, "uploads", `${job.id}_youtube.mp4`);
    try {
      await youtubedl(youtubeUrl, {
        output: inputPath,
        format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4", 
      });
      console.log(`[Worker] YouTube download successful!`);
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
    console.log(`[Worker] Asking Gemini to find the best cuts and generate MrBeast-style captions...`);
    
    const aiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    // --- FIX 2: THE "VIRAL EDITOR" AI PROMPT ---
    const basePrompt = `You are a highly skilled social media video editor (like the ones who edit for MrBeast). Listen to this entire audio track. Find the 3 most engaging, high-energy, or funny segments (10-20 seconds each) to turn into viral TikToks/Shorts.`;
    
    const modePrompt = mode === "prompt" && prompt
      ? `CRITICAL INSTRUCTION: The user specifically requested: "${prompt}". You MUST find clips that match this request.`
      : `CRITICAL INSTRUCTION: Focus on rapid back-and-forth dialogue, punchlines, or sudden shifts in emotion.`;

    const schemaPrompt = `
    Analyze the audio and return a JSON array containing exactly 3 clip objects.
    Each object must have exactly these keys:
    - "startTime": the start time of the clip in the original audio (in seconds, as a number).
    - "duration": the length of the clip (in seconds, as a number, between 10 and 20).
    - "score": a string representing how good the clip is (e.g. "98% match").
    - "srt": The complete, valid SRT subtitle string for this specific clip. 
    
    SRT FORMATTING RULES (CRITICAL FOR VIRAL STYLE):
    1. The SRT timestamps MUST reset to 00:00:00,000 for the beginning of the clip!
    2. Pace the text extremely fast. MAXIMUM 1 to 3 words per line.
    3. ALL TEXT MUST BE WRITTEN IN ALL CAPS (UPPERCASE).
    4. HIGHLIGHT KEYWORDS: To emulate the viral MrBeast style, you MUST highlight one important punchline word per line using HTML font tags. Alternate between yellow and bright green for the highlights.
       Example 1: THIS IS <font color="yellow">CRAZY</font>
       Example 2: <font color="#00FF00">FOUR HUNDRED</font> DOLLARS
    `;

    const finalInstruction = `${basePrompt}\n${modePrompt}\n${schemaPrompt}`;

    const result = await aiModel.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      finalInstruction
    ]);
    
    clipsData = JSON.parse(result.response.text());
    console.log(`[Worker] Gemini successfully picked ${clipsData.length} clips!`);
    
  } catch (err) {
    console.error("Gemini API Error or JSON Parse Error:", err.message);
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

    console.log(`[Clip ${i+1}] Rendering AI choice: Start ${aiClip.startTime}s, Duration ${aiClip.duration}s`);

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

      // --- FIX 3: MR. BEAST STYLE CAPTION SETTINGS ---
      filterChain += `,subtitles=${srtPath}:force_style='FontName=Impact,FontSize=28,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=4,Shadow=0,Alignment=2,MarginV=90'`;

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
  console.log(`[Worker] Job ${job.id} completely finished!`);
  
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Master AI Editor Worker is online and waiting for jobs...");