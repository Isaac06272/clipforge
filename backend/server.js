import express from "express";
import cors from "cors";
import jobsRouter from "./routes/jobs.js";
import exportRouter from "./routes/export.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/jobs", jobsRouter);
app.use("/api", exportRouter); // exposes /api/export, /api/reexport, /api/download/:name

app.listen(PORT, () => {
  console.log(`clipforge backend running on http://localhost:${PORT}`);
});
