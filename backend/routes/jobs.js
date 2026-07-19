import { Router } from "express";
import multer from "multer";
import { createJob, getJobStatus, getCandidatesForJob } from "../jobStore.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("video"), async (req, res) => {
  const { ratio, mode, prompt, youtubeUrl } = req.body || {};
  const fileName = req.file ? req.file.originalname : (youtubeUrl || "Unknown File");

  if (!req.file && !youtubeUrl) {
    return res.status(400).json({ error: "No video file or YouTube URL provided" });
  }

  // AWAIT the queue injection
  const jobId = await createJob({ fileName, ratio, mode, prompt, youtubeUrl });
  res.json({ jobId });
});

router.get("/:id/status", async (req, res) => {
  // AWAIT the Redis lookup
  const status = await getJobStatus(req.params.id);
  if (!status) return res.status(404).json({ error: "job not found" });
  res.json(status);
});

router.get("/:id/candidates", async (req, res) => {
  // AWAIT the candidates
  const candidates = await getCandidatesForJob(req.params.id);
  res.json({ candidates });
});

export default router;