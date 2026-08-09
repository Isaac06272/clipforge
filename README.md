# 🎬 Clipforge

**An AI-powered video editing agent that turns long videos into short, caption-ready clips — then lets you fine-tune every detail before exporting.**

## 📖 App Description
Clipforge is an intelligent video pipeline for content creators. Instead of scrubbing timelines to find the best moments, you upload a video, pick how many clips you want and how long they should be, and the AI takes over.

Powered by Google's Gemini AI and FFmpeg, Clipforge acts as a virtual video editor. It listens to the entire audio track, identifies the most engaging segments, cuts them into short-form clips (TikTok, Shorts, Reels), and burns in perfectly timed subtitles — then hands you an interactive editor to style everything before export.

## ⚡ The Problem It Solves
Creating short-form content from podcasts, lectures, or vlogs is historically a massive time sink:
1. Watching the entire video to find a 15-second highlight.
2. Manually keyframing and cropping 16:9 footage into 9:16 vertical format.
3. Transcribing audio by hand and syncing SRT timestamps.

**Clipforge reduces a multi-hour editing workflow into a 2-minute automated job** followed by a quick, CapCut-style polish pass.

## ✨ Key Features
*   **Smart AI Highlight Extraction:** Analyzes full video audio to find the most engaging segments — with a configurable clip count (1–6) and target length (Auto/30s/45s/60s).
*   **Accurate Transcripts:** Per-clip transcription in your chosen language, with punchline highlighting.
*   **Interactive Editor:** Pick a highlight, then restyle it — caption themes, highlight color, fonts, a 9-position caption grid, caption backgrounds, and saved style presets.
*   **Dynamic Auto-Cropping:** Converts 16:9 footage into 9:16 (Portrait) or 1:1 (Square) without stretching or distortion.
*   **Burned-in Subtitles:** SRT subtitles are rendered directly into the final MP4, not just overlaid in a player.

## 🛠️ Tech Stack
**Frontend:**
*   React & React Router (Single Page Application)
*   Tailwind CSS (Responsive, modern UI/UX)
*   Vite (Build tool)

**Backend & Processing:**
*   Node.js & Express (API & file routing)
*   FFmpeg / `fluent-ffmpeg` (Core video/audio manipulation engine)
*   Google Gemini API (Gemini 2.5 Flash — audio transcription and structured clip decisions)
*   In-process job queue (no Redis, no external services — the worker runs inside the API process)

## ⚙️ How It Works (The AI Pipeline)
1.  **Ingest & Configure:** The user uploads a video and picks the output ratio, clip count, target clip length, and spoken language.
2.  **Extraction:** The worker extracts the full master audio track using FFmpeg.
3.  **AI Analysis:** The audio is sent to Gemini, which acts as a senior video editor and returns a strict JSON array of timestamps, durations, and transcript lines.
4.  **Cut & Preview:** FFmpeg cuts each highlight with the ratio-based crop filter; the frontend lists them for selection.
5.  **Edit:** The user opens a clip in the interactive editor to restyle captions, position, and background.
6.  **Render & Export:** The editor's settings are sent back; FFmpeg burns the subtitles (and any title overlay) and applies the final fit/corner treatments. The finished MP4 is served for download.

## 🚀 Local Development
**Backend** (`backend/`):
```bash
npm install
GEMINI_API_KEY=your_key npm run dev   # starts on :4000
```
No Redis needed — jobs run in-process.

**Frontend** (`frontend/`):
```bash
npm install
# make sure .env sets VITE_API_URL=http://localhost:4000
npm run dev                           # starts Vite dev server
```

## ☁️ Deployment
The backend is a single Express process (Dockerfile provided) — the only required env var is `GEMINI_API_KEY`. The frontend is a static site with `VITE_API_URL` pointing at the backend's public URL. A connected Render repo auto-deploys on push.
