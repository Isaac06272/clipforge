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

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function formatSrtTime(timeStr) {
  if (!timeStr) return "00:00:00,000";
  const parts = timeStr.split(":");
  let minutes = "00";
  let seconds = "00";
  if (parts.length === 2) {
    minutes = parts[0].padStart(2, "0");
    seconds = parts[1].padStart(2, "0");
  }
  return `00:${minutes}:${seconds},000`;
}

const worker = new Worker("video-jobs", async (job) => {
  const data = job.data;
  console.log(`[Worker] Starting job ${job.id}`);

  // ==========================================
  // PHASE 2: THE FINAL RENDER (FROM FRONTEND)
  // ==========================================
  if (data.isFinalRender) {
    console.log(`[Worker] Executing Final Render for ${data.sourceFileSlug}`);
    const inputPath = path.join(outputDir, data.sourceFileSlug);
    const outputFileName = `FINAL_${Date.now()}_${data.sourceFileSlug}`;
    const outputPath = path.join(outputDir, outputFileName);
    const srtPath = path.join(outputDir, `subtitles_${job.id}.srt`);

    let srtContent = "";
    data.transcript.forEach((line, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(line.startTime)} --> ${formatSrtTime(line.endTime)}\n`;
      let text = line.text;
      if (line.highlight && line.highlight.trim() !== "") {
         text += ` <font color="${data.highlightColor}">${line.highlight}</font>`;
      }
      srtContent += `${text}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent);

    let fontName = data.fontFamily || "Impact";
    let fontSizeNum = data.fontSize === "text-lg" ? 14 : data.fontSize === "text-4xl" ? 28 : 22;
    let marginV = data.position === "top" ? 320 : data.position === "center" ? 180 : 40;
    
    let primaryColor = "&H00FFFFFF"; 
    let outlineColor = "&H00000000"; 
    let outlineSize = 2;
    let shadow = 0;

    if (data.theme === "Neon") {
      primaryColor = "&H00FFFF00"; 
      outlineColor = "&H00D4B606"; 
      outlineSize = 3;
    } else if (data.theme === "Classic") {
      outlineColor = "&H00000000";
      outlineSize = 0;
      shadow = 2; 
    } else if (data.theme === "Typewriter") {
      primaryColor = "&H0000FF00"; 
      fontName = "Courier New";
      outlineSize = 1;
    }

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath).outputOptions(["-preset ultrafast", "-threads 2"]);
      let filterChain = `subtitles=${srtPath}:force_style='FontName=${fontName},FontSize=${fontSizeNum},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BorderStyle=1,Outline=${outlineSize},Shadow=${shadow},Alignment=2,MarginV=${marginV}'`;

      command
        .videoFilters(filterChain)
        .output(outputPath)
        .on("end", resolve)
        .on("error", (err) => {
          console.error("[Worker] FFmpeg Final Render Error:", err);
          reject(err);
        })
        .run();
    });

    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);

    return { 
      finalClip: {
        id: `FINAL_${job.id}`,
        name: "Custom Export",
        duration: "Final",
        ratio: data.ratio,
        mode: "Custom",
        url: `/outputs/${outputFileName}`,
        downloadUrl: `/outputs/${outputFileName}`
      }
    };
  }

  // ==========================================
  // PHASE 1: AI CLIP EXTRACTION (INITIAL UPLOAD)
  // ==========================================
  const { fileName, filePath, ratio, mode, prompt } = data;
  
  // Strict absolute path checking
  let inputPath = filePath; 
  if (!inputPath || !fs.existsSync(inputPath)) {
    inputPath = path.join(uploadsDir, fileName);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`[Worker] CRITICAL ERROR: File not found at ${inputPath}`);
    throw new Error("Uploaded video file could not be located on the server.");
  }

  await job.updateProgress(20);
  const fullAudioFileName = `${job.id}_full_audio.mp3`;
  const fullAudioPath = path.join(outputDir, fullAudioFileName);
  
  console.log(`[Worker] Extracting audio from ${inputPath}`);
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .output(fullAudioPath)
      .on("end", resolve)
      .on("error", (err) => {
        console.error("[Worker] FFmpeg Audio Extraction Error:", err);
        reject(err);
      })
      .run();
  });

  await job.updateProgress(40);
  console.log(`[Worker] Uploading audio to Gemini...`);
  const uploadResult = await fileManager.uploadFile(fullAudioPath, {
    mimeType: "audio/mp3",
    displayName: fullAudioFileName,
  });

  let clipsData = [];
  try {
    const aiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const basePrompt = `You are a professional video editor. Listen to this entire audio track and find the 3 most engaging segments (10-20 seconds each).`;
    const modePrompt = mode === "prompt" && prompt ? `CRITICAL INSTRUCTION: The user specifically requested: "${prompt}". You MUST find clips that match this request.` : `CRITICAL INSTRUCTION: Focus on rapid dialogue, punchlines, or key highlights.`;
    const schemaPrompt = `
    Analyze the audio and return a JSON array containing exactly 3 clip objects.
    Each object must have exactly these keys:
    - "startTime": the start time of the clip in the original video (in seconds, as a number).
    - "duration": the length of the clip (in seconds, as a number, between 10 and 20).
    - "score": a string representing how good the clip is (e.g. "98% match").
    - "transcript": An array of line objects representing the spoken text for this clip.
    
    TRANSCRIPT ARRAY RULES:
    1. Break the spoken text into segments of EXACTLY 1 to 3 words per line.
    2. Each line object must have these exact keys:
       - "startTime": "00:00" (String, relative to the clip's start).
       - "endTime": "00:02" (String, relative to the clip's start).
       - "text": The main words (ALL CAPS).
       - "highlight": ONE major punchline word from that line (ALL CAPS). If no word needs highlighting, leave it as an empty string "".
    `;

    const result = await aiModel.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      `${basePrompt}\n${modePrompt}\n${schemaPrompt}`
    ]);
    
    let rawText = result.response.text();
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    clipsData = JSON.parse(rawText);
    
    if (clipsData.clips) {
        clipsData = clipsData.clips;
    }

  } catch (err) {
    console.error("[Worker] Gemini API or JSON Parse Error:", err.message);
    throw new Error("Failed to process AI transcripts.");
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
    const outputPath = path.join(outputDir, outputFileName);
    
    const formattedTranscript = aiClip.transcript.map((line, index) => ({
      id: index + 1,
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.text,
      highlight: line.highlight || ""
    }));

    console.log(`[Worker] Rendering clean cut ${i + 1}...`);
    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(aiClip.startTime) 
        .setDuration(aiClip.duration)   
        .outputOptions(["-preset ultrafast", "-threads 2", "-crf 28", "-accurate_seek", "-async 1"]);

      let filterChain = ratio === "9:16" ? "scale=-1:720,crop=406:720" : ratio === "1:1" ? "scale=-1:720,crop=720:720" : "scale=-2:720";
      command
        .videoFilters(filterChain)
        .output(outputPath)
        .on("end", resolve)
        .on("error", (err) => {
           console.error(`[Worker] FFmpeg Cut Error for clip ${i + 1}:`, err);
           reject(err);
        })
        .run();
    });

    generatedClips.push({
      id: clipBaseName,
      score: aiClip.score || `${95 - (i * 2)}% match`,
      duration: `0:${Math.round(aiClip.duration).toString().padStart(2, "0")}`,
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio,
      transcript: formattedTranscript
    });
    
    await job.updateProgress(60 + Math.floor(((i + 1) / clipsData.length) * 40));
  }

  await job.updateProgress(100);
  return { clips: generatedClips };
}, { connection: redisConnection });

console.log("FFmpeg Master AI Editor Worker is online and waiting for jobs...");