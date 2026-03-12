import { Router } from "express";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const renderRouter = Router();

// POST /projects/:id/render — Queue a new render job
renderRouter.post("/:id/render", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    // Verify prerequisites
    const [sceneCount, clipCount, voiceover] = await Promise.all([
      prisma.scene.count({ where: { projectId: project.id } }),
      prisma.sceneClip.count({ where: { scene: { projectId: project.id } } }),
      prisma.voiceover.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (sceneCount === 0) {
      throw new ApiError(400, "No scenes found. Plan scenes first.");
    }
    if (clipCount === 0) {
      throw new ApiError(400, "No video clips found. Generate at least one scene video first.");
    }
    if (!voiceover) {
      throw new ApiError(400, "No voiceover found. Generate voice first.");
    }

    // Create the Render record
    const render = await prisma.render.create({
      data: {
        projectId: project.id,
        status: "pending",
      },
    });

    // Queue the render job
    const queue = new Queue("render", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("compose", {
      projectId: project.id,
      renderId: render.id,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "composition" },
    });

    res.json({
      renderId: render.id,
      jobId: job.id,
      message: "Render job queued",
    });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/renders — List all renders for a project
renderRouter.get("/:id/renders", async (req, res, next) => {
  try {
    const renders = await prisma.render.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(renders);
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/renders/:renderId — Get a specific render
renderRouter.get("/:id/renders/:renderId", async (req, res, next) => {
  try {
    const render = await prisma.render.findUnique({
      where: { id: req.params.renderId },
    });
    if (!render) throw new ApiError(404, "Render not found");
    res.json(render);
  } catch (err) {
    next(err);
  }
});
