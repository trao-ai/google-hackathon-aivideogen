import { Router } from "express";
import { z } from "zod";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const sceneRouter = Router();

// POST /projects/:id/plan-scenes
sceneRouter.post("/:id/plan-scenes", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const voiceover = await prisma.voiceover.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    });
    if (!voiceover)
      throw new ApiError(400, "No voiceover found. Generate voice first.");

    const queue = new Queue("scene-planning", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("plan", {
      projectId: project.id,
      voiceoverId: voiceover.id,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "scene_planning" },
    });

    res.json({ jobId: job.id, message: "Scene planning queued" });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/scenes
sceneRouter.get("/:id/scenes", async (req, res, next) => {
  try {
    const scenes = await prisma.scene.findMany({
      where: { projectId: req.params.id },
      orderBy: { orderIndex: "asc" },
      include: { frames: true, clip: true },
    });
    res.json(scenes);
  } catch (err) {
    next(err);
  }
});

// POST /projects/:projectId/scenes/:sceneId/regenerate
sceneRouter.post(
  "/:projectId/scenes/:sceneId/regenerate",
  async (req, res, next) => {
    try {
      const schema = z.object({ reason: z.string().optional() });
      const body = schema.parse(req.body);

      const scene = await prisma.scene.findUnique({
        where: { id: req.params.sceneId },
      });
      if (!scene) throw new ApiError(404, "Scene not found");

      const queue = new Queue("scene-planning", {
        connection: getRedisConnection(),
      });
      const job = await queue.add("regenerate-scene", {
        projectId: req.params.projectId,
        sceneId: req.params.sceneId,
        reason: body.reason,
      });

      res.json({ jobId: job.id, message: "Scene regeneration queued" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /projects/:projectId/scenes/:sceneId/generate-video
sceneRouter.post(
  "/:projectId/scenes/:sceneId/generate-video",
  async (req, res, next) => {
    try {
      const scene = await prisma.scene.findUnique({
        where: { id: req.params.sceneId },
        include: { frames: true },
      });
      if (!scene) throw new ApiError(404, "Scene not found");
      if (scene.projectId !== req.params.projectId)
        throw new ApiError(400, "Scene does not belong to this project");

      const hasStart = scene.frames.some((f) => f.frameType === "start");
      const hasEnd = scene.frames.some((f) => f.frameType === "end");
      if (!hasStart || !hasEnd)
        throw new ApiError(
          400,
          "Scene needs both start and end frames before generating video.",
        );

      // Reset clip status for this scene
      await prisma.scene.update({
        where: { id: req.params.sceneId },
        data: { clipStatus: "pending" },
      });

      const queue = new Queue("video-generation", {
        connection: getRedisConnection(),
      });
      const job = await queue.add("generate", {
        projectId: req.params.projectId,
        sceneId: req.params.sceneId,
      });

      res.json({ jobId: job.id, message: "Video generation queued" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /projects/:id/generate-videos (all scenes)
sceneRouter.post("/:id/generate-videos", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const scenes = await prisma.scene.findMany({
      where: { projectId: project.id },
      include: { frames: true },
    });

    const readyScenes = scenes.filter((s) => {
      const hasStart = s.frames.some((f) => f.frameType === "start");
      const hasEnd = s.frames.some((f) => f.frameType === "end");
      return hasStart && hasEnd;
    });

    if (readyScenes.length === 0)
      throw new ApiError(
        400,
        "No scenes have both start and end frames. Generate frames first.",
      );

    const queue = new Queue("video-generation", {
      connection: getRedisConnection(),
    });

    // Reset clip status for all scenes being queued
    await prisma.scene.updateMany({
      where: { id: { in: readyScenes.map((s) => s.id) } },
      data: { clipStatus: "pending" },
    });

    for (const scene of readyScenes) {
      await queue.add("generate", {
        projectId: project.id,
        sceneId: scene.id,
      });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "video_generation" },
    });

    res.json({
      message: `Video generation queued for ${readyScenes.length} scenes`,
      jobCount: readyScenes.length,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /projects/:projectId/scenes/:sceneId/motion
sceneRouter.patch(
  "/:projectId/scenes/:sceneId/motion",
  async (req, res, next) => {
    try {
      const schema = z.object({ motionNotes: z.string().optional() });
      const body = schema.parse(req.body);

      const scene = await prisma.scene.findUnique({
        where: { id: req.params.sceneId },
      });
      if (!scene) throw new ApiError(404, "Scene not found");
      if (scene.projectId !== req.params.projectId)
        throw new ApiError(400, "Scene does not belong to this project");

      const updated = await prisma.scene.update({
        where: { id: req.params.sceneId },
        data: body,
        include: { frames: true, clip: true },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
