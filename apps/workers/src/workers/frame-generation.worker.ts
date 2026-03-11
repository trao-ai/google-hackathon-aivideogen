import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackImageCost } from "@atlas/db";
import {
  createImageProvider,
  createStorageProvider,
} from "@atlas/integrations";
import { getStylePrefix } from "@atlas/style-system";
import type { StyleBible } from "@atlas/shared";

export class FrameGenerationWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("frame-generation", this.process.bind(this), {
      connection,
      concurrency: 2,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[frame-gen] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{
      projectId: string;
      sceneId: string;
      frameId?: string;
      prompt?: string;
    }>,
  ): Promise<void> {
    const { projectId, sceneId, frameId, prompt } = job.data;

    // Single-frame regeneration path
    if (frameId) {
      await this.regenerateSingleFrame(projectId, sceneId, frameId, prompt!);
      return;
    }
    console.log(`[frame-gen] Generating frames for scene ${sceneId}`);

    const [scene, project] = await Promise.all([
      prisma.scene.findUnique({ where: { id: sceneId } }),
      prisma.project.findUnique({
        where: { id: projectId },
        include: { styleBible: true },
      }),
    ]);

    if (!scene) throw new Error(`Scene ${sceneId} not found`);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const imageProvider = createImageProvider();
    const storage = createStorageProvider();

    const stylePrefix = project.styleBible
      ? getStylePrefix(project.styleBible as unknown as StyleBible)
      : "flat-design, clean";

    // Extract style-bible negative prompts (e.g. photorealistic, 3D, anime, etc.)
    const styleBibleNegatives = project.styleBible
      ? ((project.styleBible as unknown as StyleBible).negativePrompts ?? [])
      : [];

    const allNegatives = [
      "text", "words", "letters", "numbers", "watermark",
      "caption", "subtitle", "label", "title", "writing", "typography",
      ...styleBibleNegatives,
    ];
    const negativesStr = allNegatives.join(", ");

    // Use the LLM-generated scene-specific prompts (startPrompt/endPrompt)
    // which are tailored to the script content, enriched with style bible context.
    const startPrompt = `${stylePrefix}

${scene.startPrompt}

Scene type: ${scene.sceneType}
${scene.bubbleText ? `Speech bubble visual indicator (no actual text): show an empty speech bubble shape` : ""}
IMPORTANT: Do NOT include any text, words, letters, numbers, labels, captions, or writing anywhere in the image.
Negative prompts: ${negativesStr}

Generate START FRAME only.`.trim();

    const endPrompt = `${stylePrefix}

${scene.endPrompt}

Scene type: ${scene.sceneType}
Motion from start: ${scene.motionNotes}
IMPORTANT: Do NOT include any text, words, letters, numbers, labels, captions, or writing anywhere in the image.
Negative prompts: ${negativesStr}

Generate END FRAME showing the scene's visual conclusion.`.trim();

    // Generate frames sequentially to avoid rate limits
    const startResult = await imageProvider.generate(startPrompt);
    const endResult = await imageProvider.generate(endPrompt);

    // Upload both frames
    const startKey = `projects/${projectId}/scenes/${sceneId}/frame-start.png`;
    const endKey = `projects/${projectId}/scenes/${sceneId}/frame-end.png`;

    const [startUrl, endUrl] = await Promise.all([
      storage.upload(startKey, startResult.imageBuffer, "image/png"),
      storage.upload(endKey, endResult.imageBuffer, "image/png"),
    ]);

    // Track image generation costs
    const totalCost = startResult.costUsd + endResult.costUsd;
    await trackImageCost({
      projectId,
      vendor: "gemini",
      model: startResult.model,
      imageCount: 2,
      totalCostUsd: totalCost,
    });

    // Save frame records
    await prisma.sceneFrame.createMany({
      data: [
        {
          sceneId,
          frameType: "start",
          imageUrl: startUrl,
          prompt: startPrompt,
          costUsd: startResult.costUsd,
        },
        {
          sceneId,
          frameType: "end",
          imageUrl: endUrl,
          prompt: endPrompt,
          costUsd: endResult.costUsd,
        },
      ],
    });

    // Check if all scenes in the project now have frames
    const [totalScenes, scenesWithFrames] = await Promise.all([
      prisma.scene.count({ where: { projectId } }),
      prisma.scene.count({
        where: {
          projectId,
          frames: { some: { frameType: "start" } },
        },
      }),
    ]);

    if (scenesWithFrames >= totalScenes) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "frames_done" },
      });
      console.log(
        `[frame-gen] All ${totalScenes} scenes have frames for project ${projectId}`,
      );
    }

    console.log(`[frame-gen] Frames generated for scene ${sceneId}`);
  }

  private async regenerateSingleFrame(
    projectId: string,
    sceneId: string,
    frameId: string,
    prompt: string,
  ): Promise<void> {
    console.log(`[frame-gen] Regenerating single frame ${frameId}`);

    const frame = await prisma.sceneFrame.findUnique({
      where: { id: frameId },
    });
    if (!frame) throw new Error(`Frame ${frameId} not found`);

    const imageProvider = createImageProvider();
    const storage = createStorageProvider();

    const result = await imageProvider.generate(prompt);

    const key = `projects/${projectId}/scenes/${sceneId}/frame-${frame.frameType}-${Date.now()}.png`;
    const imageUrl = await storage.upload(key, result.imageBuffer, "image/png");

    await prisma.sceneFrame.update({
      where: { id: frameId },
      data: { imageUrl, prompt, costUsd: result.costUsd },
    });

    await prisma.costEvent.create({
      data: {
        projectId,
        stage: "frame_regeneration",
        vendor: "gemini",
        units: 1,
        unitCost: result.costUsd,
        totalCostUsd: result.costUsd,
      },
    });

    console.log(`[frame-gen] Single frame ${frameId} regenerated`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
