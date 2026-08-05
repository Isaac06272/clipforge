# 🎬 Clipforge

**An AI-powered video editing agent that transforms long-form content and YouTube links into short, viral, caption-ready clips.**

## 📖 App Description
Clipforge is an intelligent, automated video processing pipeline designed for content creators. Instead of manually scrubbing through timelines to find the best moments, users simply upload a video (or paste a YouTube link), choose their desired aspect ratio, and let the AI take over. 

Powered by Google's Gemini AI and FFmpeg, Clipforge acts as a virtual video editor. It listens to the entire audio track, dynamically identifies the most engaging segments, cuts the video into short-form clips (TikTok, Shorts, Reels), and burns in perfectly timed subtitles.

## ⚡ The Problem It Solves
Creating short-form content from podcasts, lectures, or vlogs is historically a massive time sink. The traditional workflow requires:
1. Watching the entire video to find a 15-second highlight.
2. Manually keyframing and cropping a 16:9 landscape video into a 9:16 vertical format.
3. Transcribing the audio by hand (or using expensive third-party tools) and manually syncing SRT timestamps.

**Clipforge reduces a multi-hour editing workflow into a 2-minute automated background job.** It democratizes high-quality video editing, allowing anyone to generate ready-to-post social media assets instantly.

## ✨ Key Features
*   **Smart AI Highlight Extraction:** Analyzes full video audio to intelligently window the most engaging 10-20 second highlights.
*   **Custom Prompt Editing:** Includes an agentic "Custom Mode" where users can instruct the AI (e.g., *"Find the part where they talk about coffee"*), and the engine will actively seek and cut that specific segment.
*   **Dynamic Auto-Cropping:** Converts standard 16:9 footage into true 9:16 (Portrait) or 1:1 (Square) formats without stretching or distortion.
*   **Zero-Friction YouTube Support:** Natively downloads and processes YouTube URLs on the backend.
*   **Burned-in AI Subtitles:** Generates highly accurate, perfectly synced, high-visibility subtitles burned directly into the output MP4.
*   **Resilient Background Processing:** Utilizes a Redis/BullMQ worker architecture to ensure long FFmpeg renders never crash the frontend UI.

## 🛠️ Tech Stack
This project leverages a modern, decoupled architecture to handle heavy computational rendering alongside real-time AI inference.

**Frontend:**
*   React & React Router (Single Page Application)
*   Tailwind CSS (Responsive, modern UI/UX)
*   Vite (Build tool)

**Backend & Processing:**
*   Node.js & Express (API & File routing)
*   FFmpeg / `fluent-ffmpeg` (Core video/audio manipulation engine)
*   `@distube/ytdl-core` (YouTube stream extraction)

**AI & Queue Infrastructure:**
*   Google Gemini API (Gemini 2.5 Flash for multimodal audio transcription and JSON-structured decision making)
*   BullMQ & Redis (Robust job queuing for handling heavy video files without timeouts)
*   Render (Cloud hosting with customized Node environments)

## ⚙️ How It Works (The AI Pipeline)
1.  **Ingestion:** The user uploads a file or provides a YouTube URL.
2.  **Extraction:** The background worker extracts the full master audio track using FFmpeg.
3.  **AI Analysis:** The audio is sent to Gemini, heavily prompted to act as a senior video editor. It returns a strict JSON array containing optimal timestamps, durations, and generated SRT subtitle strings.
4.  **Execution:** The worker loops through the AI's choices, instructing FFmpeg to seek exactly to the timestamps, apply the dynamic crop filters, and burn the SRT text onto the video frames.
5.  **Delivery:** The user UI updates in real-time via polling, finally presenting multiple finished clip candidates ready for download.
