import { Router } from "express";
import { z } from "zod";
import { prisma } from "@atlas/db";
import { ApiError } from "../middleware/error-handler";

export const projectRouter = Router();

const VIDEO_TYPE_RUNTIME: Record<string, number> = {
  short: 60,
  medium: 240,
  long: 600,
};

const createSchema = z.object({
  title: z.string().min(1).max(200),
  niche: z.string().min(1).max(200),
  targetRuntimeSec: z.number().int().min(30).max(3600).optional(),
  platform: z.enum(["youtube", "instagram", "tiktok", "linkedin"]).optional(),
  videoType: z.enum(["short", "medium", "long"]).optional(),
  videoStyle: z.string().max(100).optional(),
  toneKeywords: z.array(z.string().max(50)).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  niche: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  selectedTopicId: z.string().uuid().optional(),
  selectedScriptId: z.string().uuid().optional(),
  videoProvider: z.enum([
    "veo", "kling", "seedance",
    "replicate-veo", "replicate-kling",
    "replicate-seedance", "replicate-seedance-lite",
  ]).optional(),
  platform: z.enum(["youtube", "instagram", "tiktok", "linkedin"]).optional(),
  videoType: z.enum(["short", "medium", "long"]).optional(),
  videoStyle: z.string().max(100).optional(),
  toneKeywords: z.array(z.string().max(50)).optional(),
});

// GET /projects
projectRouter.get("/", async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { topics: true, scenes: true, costEvents: true },
        },
      },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /projects
projectRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    // Auto-assign the default Kurzgesagt style bible if it exists
    const defaultBible = await prisma.styleBible.findFirst({
      where: { name: "Atlas Default" },
      select: { id: true },
    });

    const targetRuntime = body.targetRuntimeSec
      ?? (body.videoType ? VIDEO_TYPE_RUNTIME[body.videoType] : 60);

    const project = await prisma.project.create({
      data: {
        title: body.title,
        niche: body.niche,
        targetRuntimeSec: targetRuntime,
        platform: body.platform,
        videoType: body.videoType,
        videoStyle: body.videoStyle,
        toneKeywords: body.toneKeywords ?? [],
        ...(defaultBible ? { styleBibleId: defaultBible.id } : {}),
      },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id
projectRouter.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        topics: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        researchBriefs: { orderBy: { createdAt: "desc" }, take: 1 },
        scripts: { include: { sections: { orderBy: { orderIndex: "asc" } } }, orderBy: { createdAt: "desc" } },
        voiceovers: { orderBy: { createdAt: "desc" } },
        scenes: { include: { frames: true, clip: true }, orderBy: { orderIndex: "asc" } },
        renders: true,
        costEvents: true,
        characters: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) throw new ApiError(404, "Project not found");
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// PATCH /projects/:id
projectRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /projects/:id
projectRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
