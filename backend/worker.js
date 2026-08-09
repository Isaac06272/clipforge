import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ==========================================
// PHASE 1: AI CLIP EXTRACTION (INITIAL UPLOAD)
// Runs in-process, writing progress/candidates
// straight onto the job record in jobStore.
// ==========================================
export async function processJob(job) {
  const { fileName, filePath, ratio, mode, prompt, clipCount, clipLength, captionLang } = job.data;
  job.status = "processing";

  let inputPath = filePath;
  if (!inputPath || !fs.existsSync(inputPath)) {
    inputPath = path.join(uploadsDir, fileName);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`[Worker] CRITICAL ERROR: File not found at ${inputPath}`);
    throw new Error("Uploaded video file could not be located on the server.");
  }

  job.progress = 20;
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

  job.progress = 40;
  console.log(`[Worker] Uploading audio to Gemini...`);
  const uploadResult = await fileManager.uploadFile(fullAudioPath, {
    mimeType: "audio/mp3",
    displayName: fullAudioFileName,
  });

  let clipsData = [];
  try {
    const aiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    // Clip count + duration band from the Configure page (with safe defaults)
    const clipNum = Math.max(1, Math.min(6, parseInt(clipCount, 10) || 3));
    const band = { auto: [10, 20], "30": [25, 35], "45": [40, 50], "60": [55, 70] }[clipLength] || [10, 20];

    const basePrompt = `You are a professional video editor. Listen to this entire audio track and find the ${clipNum} most engaging segments (${band[0]}-${band[1]} seconds each).`;
    const modePrompt =
      mode === "prompt" && prompt
        ? `CRITICAL INSTRUCTION: The user specifically requested: "${prompt}". You MUST find clips that match this request.`
        : `CRITICAL INSTRUCTION: Focus on rapid dialogue, punchlines, or key highlights.`;
    const langPrompt =
      captionLang && captionLang !== "English"
        ? `CRITICAL INSTRUCTION: The audio is spoken in ${captionLang}. Transcribe the speech in ${captionLang} exactly as spoken (keep words in ALL CAPS).`
        : "";
    const schemaPrompt = `
    Analyze the audio and return a JSON array containing exactly ${clipNum} clip objects.
    Each object must have exactly these keys:
    - "startTime": the start time of the clip in the original video (in seconds, as a number).
    - "duration": the length of the clip (in seconds, as a number, between ${band[0]} and ${band[1]}).
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

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await aiModel.generateContent([
          { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
          `${basePrompt}\n${modePrompt}\n${langPrompt}\n${schemaPrompt}`,
        ]);
        break;
      } catch (err) {
        retries--;
        console.warn(`[Worker] Gemini API hiccup. Retries left: ${retries}. Message: ${err.message}`);
        if (retries === 0) throw err;

        console.log(`[Worker] Waiting 5 seconds before retrying Gemini...`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    let rawText = result.response.text();
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    clipsData = JSON.parse(rawText);

    if (clipsData.clips) {
      clipsData = clipsData.clips;
    }
  } catch (err) {
    console.error("[Worker] Gemini API or JSON Parse Error:", err.message);
    throw new Error("Failed to process AI transcripts after multiple attempts.");
  } finally {
    await fileManager.deleteFile(uploadResult.file.name);
    if (fs.existsSync(fullAudioPath)) fs.unlinkSync(fullAudioPath);
  }

  job.progress = 60;
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
      highlight: line.highlight || "",
    }));

    console.log(`[Worker] Rendering clean cut ${i + 1}...`);
    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(aiClip.startTime)
        .setDuration(aiClip.duration)
        .outputOptions(["-preset ultrafast", "-threads 2", "-crf 28"]);

      let filterChain =
        ratio === "9:16" ? "scale=-1:720,crop=406:720" : ratio === "1:1" ? "scale=-1:720,crop=720:720" : "scale=-2:720";
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
      score: aiClip.score || `${95 - i * 2}% match`,
      duration: `0:${Math.round(aiClip.duration).toString().padStart(2, "0")}`,
      url: `/outputs/${outputFileName}`,
      fileSlug: outputFileName,
      ratio: ratio,
      transcript: formattedTranscript,
    });

    job.progress = 60 + Math.floor(((i + 1) / clipsData.length) * 40);
  }

  job.progress = 100;
  job.candidates = generatedClips;
  job.status = "done";
  return { clips: generatedClips };
}

// ==========================================
// PHASE 2: THE FINAL RENDER (FROM FRONTEND)
// config = the request body sent by the Editor:
//   sourceFileSlug, transcript, theme, highlightColor,
//   fontFamily, fontSize, position (9-grid), ratio, captionBg, ...
// ==========================================

// ASS Alignment codes for the 9 caption positions (row = t/m/b, col = l/c/r)
const ASS_ALIGN = { tl: 7, tc: 8, tr: 9, ml: 4, mc: 5, mr: 6, bl: 1, bc: 2, br: 3 };

export async function renderFinal(job, config) {
  console.log(`[Worker] Executing Final Render for ${config.sourceFileSlug}`);
  const inputPath = path.join(outputDir, config.sourceFileSlug);

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Source file not found: ${config.sourceFileSlug}. ` +
        "The server may have restarted and lost the file. Please re-upload and try again."
    );
  }
  const outputFileName = `FINAL_${Date.now()}_${config.sourceFileSlug}`;
  const outputPath = path.join(outputDir, outputFileName);
  const srtPath = path.join(outputDir, `subtitles_${job.id}.srt`);

  let srtContent = "";
  config.transcript.forEach((line, index) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${formatSrtTime(line.startTime)} --> ${formatSrtTime(line.endTime)}\n`;
    let text = line.text;
    if (line.highlight && line.highlight.trim() !== "") {
      text += ` <font color="${config.highlightColor}">${line.highlight}</font>`;
    }
    srtContent += `${text}\n\n`;
  });
  fs.writeFileSync(srtPath, srtContent);

  let fontName = config.fontFamily || "Impact";
  let fontSizeNum = config.fontSize === "text-lg" ? 14 : config.fontSize === "text-4xl" ? 28 : 22;

  // 9-grid position → ASS alignment + margins
  const pos = config.position || "mc";
  const row = pos[0] || "m";
  const col = pos[1] || "c";
  const alignment = ASS_ALIGN[pos] || 5;
  const marginV = row === "t" || row === "b" ? 40 : 0;
  const marginL = col === "l" ? 40 : 0;
  const marginR = col === "r" ? 40 : 0;

  let primaryColor = "&H00FFFFFF";
  let outlineColor = "&H00000000";
  let outlineSize = 2;
  let shadow = 0;
  let borderStyle = 1; // outline-only (ASS)
  let backColour = "&H00000000";

  if (config.theme === "Neon") {
    primaryColor = "&H00FFFF00";
    outlineColor = "&H00D4B606";
    outlineSize = 3;
  } else if (config.theme === "Classic") {
    outlineColor = "&H00000000";
    outlineSize = 0;
    shadow = 2;
  } else if (config.theme === "Typewriter") {
    primaryColor = "&H0000FF00";
    fontName = "Courier New";
    outlineSize = 1;
  }

  // Caption background: BoxStyle 3 = solid box behind text, using BackColour.
  // ASS colors are &HAABBGGRR (AA 00 = opaque, FF = transparent).
  const bg = config.captionBg || "none";
  if (bg === "solid") {
    borderStyle = 3;
    backColour = "&H00000000";
    outlineSize = 0;
    shadow = 0;
  } else if (bg === "semi") {
    borderStyle = 3;
    backColour = "&H66000000"; // ~60% opaque black
    outlineSize = 0;
    shadow = 0;
  }

  const filters = [
    {
      filter: "subtitles",
      options: `${srtPath.replace(/\\/g, "/")}:force_style='FontName=${fontName},FontSize=${fontSizeNum},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BorderStyle=${borderStyle},BackColour=${backColour},Outline=${outlineSize},Shadow=${shadow},Alignment=${alignment},MarginV=${marginV},MarginL=${marginL},MarginR=${marginR}'`,
      inputs: "0:v",
      outputs: "cap",
    },
  ];

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(filters)
      .outputOptions(["-preset ultrafast", "-threads 2"])
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
      ratio: config.ratio,
      mode: "Custom",
      url: `/outputs/${outputFileName}`,
      downloadUrl: `/outputs/${outputFileName}`,
    },
  };
}
