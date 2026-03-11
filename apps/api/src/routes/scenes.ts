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
      include: { frames: true },
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
