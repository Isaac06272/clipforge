import { Router } from "express";
import multer from "multer";
import path from "path";
import { createJob, getJobStatus, getCandidatesForJob, videoQueue } from "../jobStore.js";

const router = Router();

// --- FIX 1: Tell Multer to keep the original file extension (.mp4, .mov, etc) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post("/", upload.single("video"), async (req, res) => {
  const { ratio, mode, prompt } = req.body || {};
  
  if (!req.file) {
    return res.status(400).json({ error: "No video file provided" });
  }

  const fileName = req.file.originalname;
  const filePath = req.file.path; 

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