import { Router } from "express";
import { z } from "zod";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const frameRouter = Router();

// POST /projects/:id/generate-frames
frameRouter.post("/:id/generate-frames", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const scenes = await prisma.scene.findMany({
      where: { projectId: project.id },
    });
    if (scenes.length === 0)
      throw new ApiError(400, "No scenes found. Run scene planning first.");

    const queue = new Queue("frame-generation", {
      connection: getRedisConnection(),
    });

    // Queue one job per scene so the worker receives individual sceneId
    for (const scene of scenes) {
      await queue.add("generate", {
        projectId: project.id,
        sceneId: scene.id,
      });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "frame_generation" },
    });

    res.json({
      jobCount: scenes.length,
      message: `Frame generation queued for ${scenes.length} scenes`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:projectId/scenes/:sceneId/frames
frameRouter.get(
  "/:projectId/scenes/:sceneId/frames",
  async (req, res, next) => {
    try {
      const frames = await prisma.sceneFrame.findMany({
        where: { sceneId: req.params.sceneId },
        orderBy: { frameType: "asc" },
      });
      res.json(frames);
    } catch (err) {
      next(err);
    }
  },
);

// POST /projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate
frameRouter.post(
  "/:projectId/scenes/:sceneId/frames/:frameId/regenerate",
  async (req, res, next) => {
    try {
      const schema = z.object({ prompt: z.string().optional() });
      const body = schema.parse(req.body);

      const frame = await prisma.sceneFrame.findUnique({
        where: { id: req.params.frameId },
      });
      if (!frame) throw new ApiError(404, "Frame not found");
      if (frame.sceneId !== req.params.sceneId)
        throw new ApiError(400, "Frame does not belong to this scene");

      const queue = new Queue("frame-generation", {
        connection: getRedisConnection(),
      });
      const job = await queue.add("regenerate-single-frame", {
        projectId: req.params.projectId,
        sceneId: req.params.sceneId,
        frameId: req.params.frameId,
        prompt: body.prompt ?? frame.prompt,
      });

      res.json({ jobId: job.id, message: "Frame regeneration queued" });
    } catch (err) {
      next(err);
    }
  },
);
