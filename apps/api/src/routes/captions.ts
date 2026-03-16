import { Router } from "express";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const captionRouter = Router();

// GET /projects/:id/captions — Get caption settings for a project
captionRouter.get("/:id/captions", async (req, res, next) => {
  try {
    const projectId = req.params.id;

    let settings = await prisma.captionSettings.findUnique({
      where: { projectId },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.captionSettings.create({
        data: {
          projectId,
          font: "Arial",
          fontSize: 7,
          textColor: "#FFFFFF",
          textOpacity: 100,
          bgColor: "#000000",
          bgOpacity: 80,
          position: "bottom",
          template: "standard",
          highlightKeywords: false,
          targetLanguage: "en",
          burnInCaptions: true,
        },
      });
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /projects/:id/captions — Update caption settings
captionRouter.put("/:id/captions", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const {
      font,
      fontSize,
      textColor,
      textOpacity,
      bgColor,
      bgOpacity,
      position,
      template,
      highlightKeywords,
      targetLanguage,
      burnInCaptions,
    } = req.body;

    const settings = await prisma.captionSettings.upsert({
      where: { projectId },
      update: {
        ...(font && { font }),
        ...(fontSize !== undefined && { fontSize }),
        ...(textColor && { textColor }),
        ...(textOpacity !== undefined && { textOpacity }),
        ...(bgColor && { bgColor }),
        ...(bgOpacity !== undefined && { bgOpacity }),
        ...(position && { position }),
        ...(template && { template }),
        ...(highlightKeywords !== undefined && { highlightKeywords }),
        ...(targetLanguage && { targetLanguage }),
        ...(burnInCaptions !== undefined && { burnInCaptions }),
      },
      create: {
        projectId,
        font: font || "Arial",
        fontSize: fontSize ?? 7,
        textColor: textColor || "#FFFFFF",
        textOpacity: textOpacity ?? 100,
        bgColor: bgColor || "#000000",
        bgOpacity: bgOpacity ?? 80,
        position: position || "bottom",
        template: template || "standard",
        highlightKeywords: highlightKeywords || false,
        targetLanguage: targetLanguage || "en",
        burnInCaptions: burnInCaptions ?? true,
      },
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/captions/regenerate — Queue caption regeneration job
captionRouter.post("/:id/captions/regenerate", async (req, res, next) => {
  try {
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new ApiError(404, "Project not found");

    // Check if there's a voiceover
    const voiceover = await prisma.voiceover.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    if (!voiceover) {
      throw new ApiError(400, "No voiceover found. Generate voice first.");
    }

    // Queue the caption generation job
    const queue = new Queue("caption", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("regenerate", {
      projectId,
      voiceoverId: voiceover.id,
    });

    res.json({
      jobId: job.id,
      message: "Caption regeneration job queued",
    });
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/captions/translate — Translate captions
captionRouter.post("/:id/captions/translate", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      throw new ApiError(400, "targetLanguage is required");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new ApiError(404, "Project not found");

    // Get the latest render with subtitles
    const render = await prisma.render.findFirst({
      where: {
        projectId,
        subtitleUrl: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!render || !render.subtitleUrl) {
      throw new ApiError(400, "No subtitles found. Generate video first.");
    }

    // Queue the translation job
    const queue = new Queue("caption", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("translate", {
      projectId,
      subtitleUrl: render.subtitleUrl,
      targetLanguage,
    });

    // Update caption settings
    await prisma.captionSettings.upsert({
      where: { projectId },
      update: { targetLanguage },
      create: {
        projectId,
        targetLanguage,
      },
    });

    res.json({
      jobId: job.id,
      message: "Caption translation job queued",
    });
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/captions/apply — Apply caption changes and trigger re-render
captionRouter.post("/:id/captions/apply", async (req, res, next) => {
  try {
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new ApiError(404, "Project not found");

    // Get caption settings
    const settings = await prisma.captionSettings.findUnique({
      where: { projectId },
    });

    if (!settings) {
      throw new ApiError(400, "No caption settings found. Update settings first.");
    }

    // Verify prerequisites
    const [sceneCount, clipCount, voiceover] = await Promise.all([
      prisma.scene.count({ where: { projectId } }),
      prisma.sceneClip.count({ where: { scene: { projectId } } }),
      prisma.voiceover.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (sceneCount === 0) {
      throw new ApiError(400, "No scenes found. Plan scenes first.");
    }
    if (clipCount === 0) {
      throw new ApiError(
        400,
        "No video clips found. Generate at least one scene video first.",
      );
    }
    if (!voiceover) {
      throw new ApiError(400, "No voiceover found. Generate voice first.");
    }

    // Create the Render record
    const render = await prisma.render.create({
      data: {
        projectId,
        status: "pending",
      },
    });

    // Queue the render job with caption settings
    const queue = new Queue("render", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("compose", {
      projectId,
      renderId: render.id,
      captionSettings: {
        font: settings.font,
        fontSize: settings.fontSize,
        textColor: settings.textColor,
        textOpacity: settings.textOpacity,
        bgColor: settings.bgColor,
        bgOpacity: settings.bgOpacity,
        position: settings.position,
        burnInCaptions: settings.burnInCaptions,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "composition" },
    });

    res.json({
      renderId: render.id,
      jobId: job.id,
      message: "Render job queued with caption settings",
    });
  } catch (err) {
    next(err);
  }
});
