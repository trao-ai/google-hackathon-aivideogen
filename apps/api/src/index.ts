import dotenv from "dotenv";
import path from "path";

// Load .env from monorepo root (two levels up from apps/api)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { projectRouter } from "./routes/projects";
import { topicRouter } from "./routes/topics";
import { discoverRouter } from "./routes/discover";
import { researchRouter } from "./routes/research";
import { scriptRouter } from "./routes/scripts";
import { voiceRouter } from "./routes/voice";
import { sceneRouter } from "./routes/scenes";
import { frameRouter } from "./routes/frames";
import { costRouter } from "./routes/costs";
import { renderRouter } from "./routes/renders";
import { captionRouter } from "./routes/captions";
import previewRouter from "./routes/preview";
import { errorHandler } from "./middleware/error-handler";
import { resolveStorageDir } from "@atlas/integrations";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "10mb" }));

// Static files — allow cross-origin audio playback from the web app
app.use("/api/audio", (_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "../public/audio")));

// Serve local storage files (images, videos) for dev mode
const localStorageDir = resolveStorageDir();
app.use("/api/storage", (_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(localStorageDir));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/discover", discoverRouter);
app.use("/api/projects", voiceRouter);    // before projectRouter so /voice-presets doesn't match /:id
app.use("/api/projects", projectRouter);
app.use("/api/projects", topicRouter);
app.use("/api/projects", researchRouter);
app.use("/api/projects", scriptRouter);
app.use("/api/projects", sceneRouter);
app.use("/api/projects", frameRouter);
app.use("/api/projects", costRouter);
app.use("/api/projects", renderRouter);
app.use("/api/projects", captionRouter);
app.use("/api/projects", previewRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Atlas API running on http://localhost:${PORT}`);
});

export default app;
