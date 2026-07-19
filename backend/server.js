import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import jobsRouter from "./routes/jobs.js";
import exportRouter from "./routes/export.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads and outputs folders exist so the server doesn't crash
if (!fs.existsSync(path.join(__dirname, "uploads"))) fs.mkdirSync(path.join(__dirname, "uploads"));
if (!fs.existsSync(path.join(__dirname, "outputs"))) fs.mkdirSync(path.join(__dirname, "outputs"));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// This line is magic: it lets your frontend load files directly from the outputs folder!
app.use("/outputs", express.static(path.join(__dirname, "outputs")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/jobs", jobsRouter);
app.use("/api", exportRouter);

app.listen(PORT, () => {
  console.log(`clipforge backend running on http://localhost:${PORT}`);
});