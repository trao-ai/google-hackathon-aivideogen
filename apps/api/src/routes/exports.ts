import { Router } from "express";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";
import { createStorageProvider, resolveUrlToLocalPath } from "@atlas/integrations";
import * as fs from "fs";

export const exportRouter = Router();

const VALID_FORMATS = ["mp4", "mov", "webm"];
const VALID_RESOLUTIONS = ["720p", "1080p", "4k"];
const VALID_QUALITIES = ["standard", "high", "ultra"];

// POST /projects/:id/renders/:renderId/export — Queue a new export transcode job
exportRouter.post(
  "/:id/renders/:renderId/export",
  async (req, res, next) => {
    try {
      const render = await prisma.render.findUnique({
        where: { id: req.params.renderId },
      });
      if (!render) throw new ApiError(404, "Render not found");
      if (render.projectId !== req.params.id) {
        throw new ApiError(404, "Render not found for this project");
      }
      if (render.status !== "complete" || !render.videoUrl) {
        throw new ApiError(
          400,
          "Render must be complete before exporting variants.",
        );
      }

      const format = String(req.body.format ?? "mp4").toLowerCase();
      const resolution = String(req.body.resolution ?? "1080p").toLowerCase();
      const quality = String(req.body.quality ?? "high").toLowerCase();

      if (!VALID_FORMATS.includes(format)) {
        throw new ApiError(400, `Invalid format. Use: ${VALID_FORMATS.join(", ")}`);
      }
      if (!VALID_RESOLUTIONS.includes(resolution)) {
        throw new ApiError(
          400,
          `Invalid resolution. Use: ${VALID_RESOLUTIONS.join(", ")}`,
        );
      }
      if (!VALID_QUALITIES.includes(quality)) {
        throw new ApiError(
          400,
          `Invalid quality. Use: ${VALID_QUALITIES.join(", ")}`,
        );
      }

      // Create the export variant record
      const exportVariant = await prisma.exportVariant.create({
        data: {
          renderId: render.id,
          format,
          resolution,
          quality,
          status: "pending",
        },
      });

      // Queue the export job
      const queue = new Queue("export", {
        connection: getRedisConnection(),
      });
      const job = await queue.add("transcode", {
        renderId: render.id,
        exportId: exportVariant.id,
        format,
        resolution,
        quality,
      });

      res.json({
        exportId: exportVariant.id,
        jobId: job.id,
        message: "Export job queued",
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /projects/:id/renders/:renderId/exports — List all export variants for a render
exportRouter.get(
  "/:id/renders/:renderId/exports",
  async (req, res, next) => {
    try {
      const exports = await prisma.exportVariant.findMany({
        where: { renderId: req.params.renderId },
        orderBy: { createdAt: "desc" },
      });

      // Convert BigInt to number for JSON serialization
      const serialized = exports.map((e) => ({
        ...e,
        fileSizeBytes: e.fileSizeBytes ? Number(e.fileSizeBytes) : null,
      }));

      res.json(serialized);
    } catch (err) {
      next(err);
    }
  },
);

const MIME_MAP: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ass: "text/plain",
};

// GET /projects/:id/renders/:renderId/download?type=render|export&exportId=...&filename=...
// Serves the file with Content-Disposition: attachment to force browser download
exportRouter.get(
  "/:id/renders/:renderId/download",
  async (req, res, next) => {
    try {
      // Allow cross-origin fetch (helmet sets same-origin by default)
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      const { type, exportId, filename } = req.query as Record<string, string>;
      const renderId = req.params.renderId;

      let videoUrl: string | null = null;
      let ext = "mp4";

      if (type === "export" && exportId) {
        const ev = await prisma.exportVariant.findUnique({
          where: { id: exportId },
        });
        if (!ev || ev.renderId !== renderId) {
          throw new ApiError(404, "Export variant not found");
        }
        videoUrl = ev.videoUrl;
        ext = ev.format;
      } else if (type === "subtitle") {
        const render = await prisma.render.findUnique({
          where: { id: renderId },
        });
        if (!render) throw new ApiError(404, "Render not found");
        videoUrl = render.subtitleUrl;
        ext = "ass";
      } else {
        // Default: download the raw render
        const render = await prisma.render.findUnique({
          where: { id: renderId },
        });
        if (!render) throw new ApiError(404, "Render not found");
        videoUrl = render.videoUrl;
      }

      if (!videoUrl) throw new ApiError(404, "File not available");

      const safeName = (filename || `video.${ext}`).replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      // Try local path first
      const localPath = resolveUrlToLocalPath(videoUrl);
      if (localPath && fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${safeName}"`,
        );
        res.setHeader(
          "Content-Type",
          MIME_MAP[ext] || "application/octet-stream",
        );
        res.setHeader("Content-Length", stat.size);
        fs.createReadStream(localPath).pipe(res);
        return;
      }

      // Fetch from remote storage
      const storage = createStorageProvider();
      const keyMatch = videoUrl.match(/projects\/.+$/);
      const key = keyMatch ? keyMatch[0] : videoUrl;
      const buffer = await storage.download(key);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"`,
      );
      res.setHeader(
        "Content-Type",
        MIME_MAP[ext] || "application/octet-stream",
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
);
