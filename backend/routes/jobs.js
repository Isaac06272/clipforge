import { Router } from "express";
import multer from "multer";
import { createJob, getJobStatus, getCandidatesForJob, getJob } from "../jobStore.js";

const router = Router();

// Configure multer to save files to an 'uploads' directory
const upload = multer({ dest: "uploads/" });

// POST /api/jobs — now accepts multipart/form-data
router.post("/", upload.single("video"), (req, res) => {
  // req.file contains the uploaded video (if they chose a file)
  // req.body contains the text fields (ratio, mode, prompt, youtubeUrl)
  const { ratio, mode, prompt, youtubeUrl } = req.body;
  
  // Figure out the filename based on what they provided
  const fileName = req.file ? req.file.originalname : (youtubeUrl || "Unknown File");

  if (!req.file && !youtubeUrl) {
    return res.status(400).json({ error: "No video file or YouTube URL provided" });
  }

  // Create the job (still using your mock store for now)
  const jobId = createJob({ fileName, ratio, mode, prompt, youtubeUrl });
  
  res.json({ jobId });
});

// GET /api/jobs/:id/status
router.get("/:id/status", (req, res) => {
  const status = getJobStatus(req.params.id);
  if (!status) return res.status(404).json({ error: "job not found" });
  res.json(status);
});

// GET /api/jobs/:id/candidates
router.get("/:id/candidates", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json({ candidates: getCandidatesForJob(req.params.id) });
});

export default router;