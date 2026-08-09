import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createJob, getJobStatus, getCandidatesForJob, getJobById } from "../jobStore.js";
import { renderFinal } from "../worker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// --- STRICT ABSOLUTE PATHING FOR FILE UPLOADS ---
const uploadsDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Safely enforce an extension so FFmpeg never crashes
    const ext = path.extname(file.originalname) || ".mp4";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("video"), (req, res) => {
  const { ratio, mode, prompt, clipCount, clipLength } = req.body || {};

  if (!req.file) {
    return res.status(400).json({ error: "No video file provided" });
  }

  const fileName = req.file.originalname;
  const filePath = req.file.path; // This is now a guaranteed absolute path

  const job = createJob({ fileName, filePath, ratio, mode, prompt, clipCount, clipLength });
  res.json({ jobId: job.id });
});

router.get("/:id/status", (req, res) => {
  const status = getJobStatus(req.params.id);
  if (!status) return res.status(404).json({ error: "job not found" });
  res.json(status);
});

router.get("/:id/candidates", (req, res) => {
  res.json({ candidates: getCandidatesForJob(req.params.id) });
});

router.post("/render-final", async (req, res) => {
  console.log("Received final render request from Editor!");

  const { jobId, ...config } = req.body || {};
  const job = getJobById(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  try {
    // Direct await — the HTTP thread stays free while FFmpeg renders.
    // No more unbounded while(true) polling loop.
    const result = await renderFinal(job, config);
    res.json(result);
  } catch (error) {
    console.error("Final render routing error:", error);
    res.status(500).json({ error: "Failed to process the final video render." });
  }
});

export default router;
