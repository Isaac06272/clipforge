import { Router } from "express";

const router = Router();

const LETTERS = "ABCDEFGH";

function buildClip(clipId, index, ratio, mode) {
  const name = `Clip ${LETTERS[index] || index}`;
  const fileSlug = name.replace(/\s+/g, "_");
  return {
    id: clipId,
    name,
    duration: "0:4" + ((index % 5) + 1), // placeholder duration
    ratio,
    mode,
    // Points at the dummy download route below — in a real build this
    // would be a signed URL to the rendered MP4 in object storage.
    downloadUrl: `/api/download/${fileSlug}`,
  };
}

// POST /api/export — render the selected candidate clips
router.post("/export", (req, res) => {
  const { jobId, clipIds, ratio, mode } = req.body || {};
  if (!jobId || !Array.isArray(clipIds) || clipIds.length === 0) {
    return res.status(400).json({ error: "jobId and clipIds are required" });
  }
  const clips = clipIds.map((id, i) => buildClip(id, i, ratio, mode));
  res.json({ clips });
});

// POST /api/reexport — re-render existing clips at a new ratio, reusing
// the same edit plan (zoom/caption/keep-segment data would be looked up
// by jobId in a real build, not regenerated).
router.post("/reexport", (req, res) => {
  const { jobId, clipIds, ratio, mode } = req.body || {};
  if (!jobId || !Array.isArray(clipIds)) {
    return res.status(400).json({ error: "jobId and clipIds are required" });
  }
  const clips = clipIds.map((id, i) => buildClip(id, i, ratio, mode || "auto"));
  res.json({ clips });
});

// GET /api/download/:name — placeholder file so the Download button in
// the UI has something real to fetch. Swap for real rendered MP4 bytes.
router.get("/download/:name", (req, res) => {
  const { name } = req.params;
  res.setHeader("Content-Disposition", `attachment; filename="${name}.txt"`);
  res.setHeader("Content-Type", "text/plain");
  res.send(`This is a placeholder file standing in for ${name}.mp4`);
});

export default router;
