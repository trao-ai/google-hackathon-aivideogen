import { Router } from "express";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const characterRouter = Router();

// GET /projects/:id/characters — List all characters for a project
characterRouter.get("/:id/characters", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const characters = await prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    res.json(characters);
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/characters/generate — Generate a new character image
characterRouter.post("/:id/characters/generate", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, "Project not found");

    const { prompt, name, gender, ageStyle, emotion, appearance, useInScenes, useAsNarrator, animateExpressions, transparentBg } = req.body;

    // Create character record
    const character = await prisma.character.create({
      data: {
        projectId,
        name: name || `Character ${Date.now().toString(36)}`,
        prompt: prompt || null,
        gender: gender || "Female",
        ageStyle: ageStyle || "Adult",
        emotion: emotion || "Friendly",
        appearance: appearance || "Illustration",
        useInScenes: useInScenes ?? true,
        useAsNarrator: useAsNarrator ?? false,
        animateExpressions: animateExpressions ?? true,
        transparentBg: transparentBg ?? false,
      },
    });

    // Auto-select if this is the first character
    const charCount = await prisma.character.count({ where: { projectId } });
    if (charCount === 1) {
      await prisma.project.update({
        where: { id: projectId },
        data: { selectedCharacterId: character.id },
      });
    }

    // Queue generation job
    const queue = new Queue("character-generation", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("generate", {
      projectId,
      characterId: character.id,
      prompt: prompt || null,
      gender: character.gender,
      ageStyle: character.ageStyle,
      emotion: character.emotion,
      appearance: character.appearance,
      transparentBg: character.transparentBg,
    });

    res.json({
      characterId: character.id,
      jobId: job.id,
      message: "Character generation queued",
    });
  } catch (err) {
    next(err);
  }
});

// PUT /projects/:id/characters/:charId — Update character settings
characterRouter.put("/:id/characters/:charId", async (req, res, next) => {
  try {
    const { charId } = req.params;
    const { name, description, gender, ageStyle, emotion, appearance, useInScenes, useAsNarrator, animateExpressions, transparentBg } = req.body;

    const character = await prisma.character.update({
      where: { id: charId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(gender !== undefined && { gender }),
        ...(ageStyle !== undefined && { ageStyle }),
        ...(emotion !== undefined && { emotion }),
        ...(appearance !== undefined && { appearance }),
        ...(useInScenes !== undefined && { useInScenes }),
        ...(useAsNarrator !== undefined && { useAsNarrator }),
        ...(animateExpressions !== undefined && { animateExpressions }),
        ...(transparentBg !== undefined && { transparentBg }),
      },
    });

    res.json(character);
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/characters/:charId/select — Select a character
characterRouter.post("/:id/characters/:charId/select", async (req, res, next) => {
  try {
    const { id: projectId, charId } = req.params;

    // Verify character exists
    const character = await prisma.character.findUnique({ where: { id: charId } });
    if (!character) throw new ApiError(404, "Character not found");

    await prisma.project.update({
      where: { id: projectId },
      data: { selectedCharacterId: charId },
    });

    res.json({ message: "Character selected" });
  } catch (err) {
    next(err);
  }
});

// DELETE /projects/:id/characters/:charId — Delete a character
characterRouter.delete("/:id/characters/:charId", async (req, res, next) => {
  try {
    const { id: projectId, charId } = req.params;

    // If this is the selected character, clear the selection
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.selectedCharacterId === charId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { selectedCharacterId: null },
      });
    }

    await prisma.character.delete({ where: { id: charId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/characters/:charId/regenerate — Regenerate character image
characterRouter.post("/:id/characters/:charId/regenerate", async (req, res, next) => {
  try {
    const { id: projectId, charId } = req.params;

    const character = await prisma.character.findUnique({ where: { id: charId } });
    if (!character) throw new ApiError(404, "Character not found");

    const queue = new Queue("character-generation", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("generate", {
      projectId,
      characterId: charId,
      prompt: character.prompt,
      gender: character.gender,
      ageStyle: character.ageStyle,
      emotion: character.emotion,
      appearance: character.appearance,
      transparentBg: character.transparentBg,
    });

    res.json({
      jobId: job.id,
      message: "Character regeneration queued",
    });
  } catch (err) {
    next(err);
  }
});
