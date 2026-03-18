import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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
// Better Auth v1.5.5 uses basePath "/api" by default, so auth routes
// overlap with Express /api/* routes. We call auth.handler directly
// and only forward to Express if Better Auth returns 404.
app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();

  const proto =
    req.headers["x-forwarded-proto"] || (req.protocol === "https" ? "https" : "http");
  const host = req.headers.host || "localhost";
  const url = `${proto}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  // Read body for non-GET requests
  let bodyBuf: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    bodyBuf = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: bodyBuf || undefined,
  });

  const response = await auth.handler(request);

  // If Better Auth doesn't handle this route, pass to Express.
  // Pre-parse the body so express.json() doesn't try to re-read the consumed stream.
  if (response.status === 404) {
    if (bodyBuf && bodyBuf.length > 0) {
      try {
        (req as any).body = JSON.parse(bodyBuf.toString());
      } catch {
        (req as any).body = bodyBuf.toString();
      }
      // Mark as already read so body-parser skips it
      (req as any)._body = true;
    }
    return next();
  }

  // Forward Better Auth's response
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const text = await response.text();
  res.send(text);
});

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
