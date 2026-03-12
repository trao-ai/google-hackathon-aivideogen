import { Router } from "express";
import { z } from "zod";
import { prisma } from "@atlas/db";
import { ApiError } from "../middleware/error-handler";

export const projectRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  niche: z.string().min(1).max(200),
  targetRuntimeSec: z.number().int().min(300).max(3600).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  niche: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  selectedTopicId: z.string().uuid().optional(),
  selectedScriptId: z.string().uuid().optional(),
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

    const project = await prisma.project.create({
      data: {
        title: body.title,
        niche: body.niche,
        targetRuntimeSec: body.targetRuntimeSec ?? 60,
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
        topics: true,
        researchBriefs: { orderBy: { createdAt: "desc" }, take: 1 },
        scripts: { include: { sections: { orderBy: { orderIndex: "asc" } } }, orderBy: { createdAt: "desc" } },
        voiceovers: { orderBy: { createdAt: "desc" } },
        scenes: { include: { frames: true, clip: true }, orderBy: { orderIndex: "asc" } },
        renders: true,
        costEvents: true,
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
