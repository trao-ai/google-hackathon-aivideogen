import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma } from "@atlas/db";
import {
  createImageProvider,
  createStorageProvider,
} from "@atlas/integrations";
import { buildStartFramePrompt, buildEndFramePrompt } from "@atlas/prompts";
import { styleBibleToPromptSummary, getStylePrefix } from "@atlas/style-system";
import type { StyleBible } from "@atlas/shared";

export class FrameGenerationWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("frame-generation", this.process.bind(this), {
      connection,
      concurrency: 3,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[frame-gen] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string; sceneId: string }>,
  ): Promise<void> {
    const { projectId, sceneId } = job.data;
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

    const styleSummary = project.styleBible
      ? styleBibleToPromptSummary(project.styleBible as unknown as StyleBible)
      : "flat-design educational infographic";
    const stylePrefix = project.styleBible
      ? getStylePrefix(project.styleBible as unknown as StyleBible)
      : "flat-design, clean";

    // Build start frame prompt
    const startPrompt = buildStartFramePrompt({
      purpose: scene.purpose,
      narrationExcerpt: scene.purpose.slice(0, 100),
      sceneType: scene.sceneType,
      bubbleText: scene.bubbleText ?? undefined,
      palette: stylePrefix,
      negativePrompts: [],
      stylePrimitives: styleSummary,
    });

    // Build end frame prompt
    const endPrompt = buildEndFramePrompt(startPrompt, scene.motionNotes);

    // Generate both frames in parallel
    const [startResult, endResult] = await Promise.all([
      imageProvider.generate(startPrompt),
      imageProvider.generate(endPrompt),
    ]);

    // Upload both frames
    const startKey = `projects/${projectId}/scenes/${sceneId}/frame-start.png`;
    const endKey = `projects/${projectId}/scenes/${sceneId}/frame-end.png`;

    const [startUrl, endUrl] = await Promise.all([
      storage.upload(startKey, startResult.imageBuffer, "image/png"),
      storage.upload(endKey, endResult.imageBuffer, "image/png"),
    ]);

    // Track image generation costs
    const totalCost = startResult.costUsd + endResult.costUsd;
    await prisma.costEvent.create({
      data: {
        projectId,
        stage: "frame_generation",
        vendor: "gemini",
        units: 2,
        unitCost: totalCost / 2,
        totalCostUsd: totalCost,
      },
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

  async close(): Promise<void> {
    await this.worker.close();
  }
}
