import { Router } from "express";
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
    const job = await queue.add("generate-all", {
      projectId: project.id,
      sceneIds: scenes.map((s) => s.id),
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "frame_generation" },
    });

    res.json({
      jobId: job.id,
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
