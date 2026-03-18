import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/auth";
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
import { exportRouter } from "./routes/exports";
import { captionRouter } from "./routes/captions";
import { characterRouter } from "./routes/characters";
import previewRouter from "./routes/preview";
import { errorHandler } from "./middleware/error-handler";
import { resolveStorageDir } from "@atlas/integrations";
import path from "path";

const app = express();

// Trust proxy (behind nginx)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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

// Better Auth handler — must be mounted BEFORE express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json({ limit: "10mb" }));

// Static files — allow cross-origin audio playback from the web app
app.use(
  "/api/audio",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../public/audio")),
);

// Serve local storage files (images, videos) for dev mode
const localStorageDir = resolveStorageDir();
app.use(
  "/api/storage",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(localStorageDir),
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes — all /api/projects routes require authentication
app.use("/api/discover", requireAuth, discoverRouter);
app.use("/api/projects", requireAuth, voiceRouter); // before projectRouter so /voice-presets doesn't match /:id
app.use("/api/projects", requireAuth, projectRouter);
app.use("/api/projects", requireAuth, topicRouter);
app.use("/api/projects", requireAuth, researchRouter);
app.use("/api/projects", requireAuth, scriptRouter);
app.use("/api/projects", requireAuth, sceneRouter);
app.use("/api/projects", requireAuth, frameRouter);
app.use("/api/projects", requireAuth, costRouter);
app.use("/api/projects", requireAuth, renderRouter);
app.use("/api/projects", requireAuth, exportRouter);
app.use("/api/projects", requireAuth, captionRouter);
app.use("/api/projects", requireAuth, characterRouter);
app.use("/api/projects", requireAuth, previewRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
