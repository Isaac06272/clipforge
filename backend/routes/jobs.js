import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createJob, getJobStatus, getCandidatesForJob, videoQueue } from "../jobStore.js";

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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

router.post("/", upload.single("video"), async (req, res) => {
  const { ratio, mode, prompt } = req.body || {};
  
  if (!req.file) {
    return res.status(400).json({ error: "No video file provided" });
  }

  const fileName = req.file.originalname;
  const filePath = req.file.path; // This is now a guaranteed absolute path

  const jobId = await createJob({ fileName, filePath, ratio, mode, prompt });
  res.json({ jobId });
});

router.get("/:id/status", async (req, res) => {
  const status = await getJobStatus(req.params.id);
  if (!status) return res.status(404).json({ error: "job not found" });
  res.json(status);
});

router.get("/:id/candidates", async (req, res) => {
  const candidates = await getCandidatesForJob(req.params.id);
  res.json({ candidates });
});

router.post("/render-final", async (req, res) => {
  console.log("Received final render request from Editor!");
  
  try {
    const job = await videoQueue.add("video-jobs", req.body);
    
    let jobStatus;
    let result;
    
    while (true) {
      const currentJob = await videoQueue.getJob(job.id);
      if (!currentJob) throw new Error("Job lost in queue");
      
      jobStatus = await currentJob.getState();
      
      if (jobStatus === 'completed') {
        result = currentJob.returnvalue;
        break;
      }
      if (jobStatus === 'failed') {
        throw new Error(currentJob.failedReason);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    res.json(result);

  } catch (error) {
    console.error("Final render routing error:", error);
    res.status(500).json({ error: "Failed to process the final video render." });
  }
});

export default router;