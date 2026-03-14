import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import * as fs from "fs";
import * as path from "path";
import { prisma, trackImageCost, trackCost, trackLLMCost } from "@atlas/db";
import {
  createImageProvider,
  createStorageProvider,
  resolveStorageDir,
} from "@atlas/integrations";
import { getStylePrefix } from "@atlas/style-system";
import type { StyleBible } from "@atlas/shared";
import { FrameValidator } from "@atlas/validation";

export class FrameGenerationWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("frame-generation", this.process.bind(this), {
      connection,
      concurrency: 1, // Must be 1 — frames are chained (scene N references scene N-1)
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[frame-gen] job ${job?.id} failed:`, err.message);
      if (job?.data?.sceneId) {
        prisma.scene.update({
          where: { id: job.data.sceneId },
          data: { frameStatus: "failed" },
        }).catch(() => {});
      }
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

    // Mark this scene as generating frames
    await prisma.scene.update({
      where: { id: sceneId },
      data: { frameStatus: "generating" },
    });

    // Auto-assign default style bible if project doesn't have one
    if (!project.styleBible) {
      const defaultBible = await prisma.styleBible.findFirst({
        where: { name: "Atlas Default" },
      });
      if (defaultBible) {
        await prisma.project.update({
          where: { id: projectId },
          data: { styleBibleId: defaultBible.id },
        });
        (project as Record<string, unknown>).styleBible = defaultBible;
        console.log(`[frame-gen] Auto-assigned default style bible to project ${projectId}`);
      }
    }

    // Fetch adjacent scenes for visual continuity between scene boundaries
    const [prevScene, nextScene] = await Promise.all([
      prisma.scene.findFirst({
        where: { projectId, orderIndex: scene.orderIndex - 1 },
      }),
      prisma.scene.findFirst({
        where: { projectId, orderIndex: scene.orderIndex + 1 },
      }),
    ]);

    // Fetch narration text for this scene's time range (grounds visuals to script)
    let narrationText = "";
    try {
      const voiceover = await prisma.voiceover.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      if (voiceover && voiceover.segments) {
        const segments = voiceover.segments as Array<{
          text: string;
          start: number;
          end: number;
        }>;
        narrationText = segments
          .filter(
            (s) =>
              s.start < scene.narrationEndSec &&
              s.end > scene.narrationStartSec,
          )
          .map((s) => s.text)
          .join(" ")
          .trim();
      }
    } catch {
      // narration text is optional enrichment
    }

    const imageProvider = createImageProvider();
    const storage = createStorageProvider();

    // Authentic Kurzgesagt style — cinematic, detailed, NOT simple flat/Duolingo
    const KURZGESAGT_STYLE_PREFIX =
      "Masterpiece quality Kurzgesagt-style cinematic illustration, professional animation studio quality, " +
      "richly detailed with atmospheric depth, cinematic lighting, and polished premium production values, " +
      "vibrant colorful background that matches the scene mood — use bright, warm, or cool tones as appropriate, " +
      "glowing highlights and particle effects, " +
      "layered parallax composition with foreground, midground, and background elements, " +
      "smooth soft shapes with subtle gradients for volume and depth, NO hard outlines, " +
      "sophisticated simplified characters with expressive round eyes, NO mouth, NO lips, " +
      "rich vibrant color palette with bold accents, varied backgrounds from warm pastels to deep blues to bright gradients, " +
      "epic cinematic framing with natural balanced composition, educational infographic aesthetic with scientific precision, " +
      "rich environmental detail, atmospheric haze and glow effects, " +
      "no text or writing in the image";

    const KURZGESAGT_NEGATIVES = [
      "photorealistic", "photograph", "3D render", "anime", "painterly",
      "watercolor", "sketch", "pencil", "cluttered", "inconsistent anatomy",
      "thin lines", "sharp angular edges", "realistic photo shading",
      "mouth", "lips", "teeth", "speaking", "talking", "open mouth",
      "Duolingo", "simple flat cartoon", "clipart", "low detail", "childish",
      "awkward proportions", "stiff poses", "unnatural composition",
      "amateur", "low quality rendering", "blurry", "distorted",
      "ugly", "deformed", "disfigured", "bad anatomy", "poorly drawn",
    ];

    const stylePrefix = project.styleBible
      ? getStylePrefix(project.styleBible as unknown as StyleBible)
      : KURZGESAGT_STYLE_PREFIX;

    // Extract style-bible negative prompts (e.g. photorealistic, 3D, anime, etc.)
    const styleBibleNegatives = project.styleBible
      ? ((project.styleBible as unknown as StyleBible).negativePrompts ?? [])
      : KURZGESAGT_NEGATIVES;

    const allNegatives = [
      "text", "words", "letters", "numbers", "watermark",
      "caption", "subtitle", "label", "title", "writing", "typography",
      ...styleBibleNegatives,
    ];
    const negativesStr = allNegatives.join(", ");

    // Build continuity context from adjacent scenes so frames visually connect
    const prevContinuity = prevScene
      ? `\nVISUAL CONTINUITY — this scene immediately follows a scene that ended with:\n"${prevScene.endPrompt.slice(0, 300)}"\n${prevScene.continuityNotes ? `Transition: ${prevScene.continuityNotes}` : ""}\nYou MUST maintain the same art style, color palette, character designs, and visual language as the previous scene.\n`
      : "";

    const narrationContext = narrationText
      ? `\nNarration during this scene: "${narrationText.slice(0, 250)}"\nThe visual MUST depict what the narrator is describing.\n`
      : "";

    const startPrompt = `${stylePrefix}

${scene.startPrompt}

Scene purpose: ${scene.purpose}${narrationContext}
Scene type: ${scene.sceneType}${prevContinuity}
${scene.bubbleText ? `Speech bubble visual indicator (no actual text): show an empty speech bubble shape` : ""}
IMPORTANT: Do NOT include any text, words, letters, numbers, labels, captions, or writing anywhere in the image.
Negative prompts: ${negativesStr}

Generate START FRAME only.`.trim();

    const nextContinuity = nextScene
      ? `\nVISUAL CONTINUITY — this scene's end must naturally flow into the next scene:\n"${nextScene.startPrompt.slice(0, 300)}"\nMaintain consistent art style, colors, and visual language for a smooth transition.\n`
      : "";

    const endPrompt = `${stylePrefix}

${scene.endPrompt}

Scene purpose: ${scene.purpose}
Scene type: ${scene.sceneType}
Motion from start: ${scene.motionNotes}
${scene.continuityNotes ? `Continuity: ${scene.continuityNotes}` : ""}${nextContinuity}
IMPORTANT: Do NOT include any text, words, letters, numbers, labels, captions, or writing anywhere in the image.
Negative prompts: ${negativesStr}

Generate END FRAME showing the scene's visual conclusion.`.trim();

    // Determine if this project uses SeDance (start frame only, no end frame)
    const isSeDance = (project as Record<string, unknown>).videoProvider === "seedance";

    // Load previous scene's end frame as style reference for THIS scene's start frame
    // This creates a visual chain: Scene 1 End → Scene 2 Start → Scene 2 End → Scene 3 Start → ...
    // For SeDance, we use the previous scene's start frame instead (since no end frames exist)
    let prevRefFrameBuffer: Buffer | undefined;
    if (prevScene) {
      const prevRefFrame = await prisma.sceneFrame.findFirst({
        where: { sceneId: prevScene.id, frameType: isSeDance ? "start" : "end" },
        orderBy: { id: "desc" },
      });
      if (prevRefFrame) {
        prevRefFrameBuffer = await this.loadFrameBuffer(prevRefFrame.imageUrl);
      }
    }

    // Generate start frame (with previous scene's reference frame as style reference)
    const startResult = await imageProvider.generate(startPrompt, prevRefFrameBuffer);

    const validator = new FrameValidator();

    if (isSeDance) {
      // SeDance: only generate start frame
      console.log(`[frame-gen] SeDance mode: generating start frame only for scene ${sceneId}`);

      const startValidation = await validator.validateFrame({
        imageBuffer: startResult.imageBuffer,
        referenceBuffer: prevRefFrameBuffer,
        styleBible: project.styleBible as unknown as StyleBible,
      }).catch((err) => {
        console.warn(`[frame-gen] Start frame validation failed:`, err.message);
        return { qualityScore: 0, styleMatchScore: 0, issues: [], recommendations: [] };
      });

      // Track validation costs (1 frame)
      const validationInputTokens = 500;
      const validationOutputTokens = 200;
      const validationCost = (validationInputTokens * 0.000005) + (validationOutputTokens * 0.000015);
      await trackLLMCost({
        projectId,
        stage: "frame_validation",
        vendor: "gemini",
        model: "gemini-2.5-flash",
        inputTokens: validationInputTokens,
        outputTokens: validationOutputTokens,
        totalCostUsd: validationCost,
      });

      if (startValidation.qualityScore > 0) {
        console.log(
          `[frame-gen] Start frame quality: ${startValidation.qualityScore}/100, style: ${startValidation.styleMatchScore}/100`
        );
      }

      // Upload start frame only
      const startKey = `projects/${projectId}/scenes/${sceneId}/frame-start.png`;
      const startUrl = await storage.upload(startKey, startResult.imageBuffer, "image/png");

      await trackImageCost({
        projectId,
        vendor: "gemini",
        model: startResult.model,
        imageCount: 1,
        totalCostUsd: startResult.costUsd,
      });

      await prisma.sceneFrame.create({
        data: {
          sceneId,
          frameType: "start",
          imageUrl: startUrl,
          prompt: startPrompt,
          seed: startResult.seed || null,
          qualityScore: startValidation.qualityScore > 0 ? startValidation.qualityScore : null,
          styleMatchScore: startValidation.styleMatchScore > 0 ? startValidation.styleMatchScore : null,
          costUsd: startResult.costUsd,
        },
      });
    } else {
      // Veo/Kling: generate both start and end frames

      // Generate end frame (with THIS scene's start frame as style reference)
      // This guarantees within-scene consistency — the end frame SEES the start frame
      const endResult = await imageProvider.generate(endPrompt, startResult.imageBuffer);

      // Validate frames for quality and style consistency
      const [startValidation, endValidation] = await Promise.all([
        validator.validateFrame({
          imageBuffer: startResult.imageBuffer,
          referenceBuffer: prevRefFrameBuffer,
          styleBible: project.styleBible as unknown as StyleBible,
        }).catch((err) => {
          console.warn(`[frame-gen] Start frame validation failed:`, err.message);
          return { qualityScore: 0, styleMatchScore: 0, issues: [], recommendations: [] };
        }),
        validator.validateFrame({
          imageBuffer: endResult.imageBuffer,
          referenceBuffer: startResult.imageBuffer,
          styleBible: project.styleBible as unknown as StyleBible,
        }).catch((err) => {
          console.warn(`[frame-gen] End frame validation failed:`, err.message);
          return { qualityScore: 0, styleMatchScore: 0, issues: [], recommendations: [] };
        }),
      ]);

      // Track validation costs (using rough estimate: ~500 tokens input, ~200 tokens output per validation)
      const validationInputTokens = 500 * 2;
      const validationOutputTokens = 200 * 2;
      const validationCost = (validationInputTokens * 0.000005) + (validationOutputTokens * 0.000015);
      await trackLLMCost({
        projectId,
        stage: "frame_validation",
        vendor: "gemini",
        model: "gemini-2.5-flash",
        inputTokens: validationInputTokens,
        outputTokens: validationOutputTokens,
        totalCostUsd: validationCost,
      });

      if (startValidation.qualityScore > 0) {
        console.log(
          `[frame-gen] Start frame quality: ${startValidation.qualityScore}/100, style: ${startValidation.styleMatchScore}/100`
        );
      }
      if (endValidation.qualityScore > 0) {
        console.log(
          `[frame-gen] End frame quality: ${endValidation.qualityScore}/100, style: ${endValidation.styleMatchScore}/100`
        );
      }

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

      // Save frame records with validation scores and seeds
      await prisma.sceneFrame.createMany({
        data: [
          {
            sceneId,
            frameType: "start",
            imageUrl: startUrl,
            prompt: startPrompt,
            seed: startResult.seed || null,
            qualityScore: startValidation.qualityScore > 0 ? startValidation.qualityScore : null,
            styleMatchScore: startValidation.styleMatchScore > 0 ? startValidation.styleMatchScore : null,
            costUsd: startResult.costUsd,
          },
          {
            sceneId,
            frameType: "end",
            imageUrl: endUrl,
            prompt: endPrompt,
            seed: endResult.seed || null,
            qualityScore: endValidation.qualityScore > 0 ? endValidation.qualityScore : null,
            styleMatchScore: endValidation.styleMatchScore > 0 ? endValidation.styleMatchScore : null,
            costUsd: endResult.costUsd,
          },
        ],
      });
    }

    // Mark this scene's frames as done
    await prisma.scene.update({
      where: { id: sceneId },
      data: { frameStatus: "done" },
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

    await trackCost({
      projectId,
      stage: "frame_regeneration",
      vendor: "gemini",
      units: 1,
      unitCost: result.costUsd,
      totalCostUsd: result.costUsd,
      metadata: { model: result.model, frameId },
    });

    console.log(`[frame-gen] Single frame ${frameId} regenerated`);
  }

  /** Load a frame image from storage URL into a Buffer for use as reference image. */
  private async loadFrameBuffer(imageUrl: string): Promise<Buffer | undefined> {
    try {
      const storageDir = resolveStorageDir();

      if (imageUrl.startsWith("local:///")) {
        const rawPath = imageUrl.replace("local:///", "");
        const fileName = rawPath.split("/").pop() ?? rawPath;
        const filePath = path.join(storageDir, fileName);
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
      }

      if (imageUrl.includes("/api/storage/")) {
        const fileName = imageUrl.split("/api/storage/").pop() ?? "";
        const filePath = path.join(storageDir, fileName);
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
      }

      // Remote URL fallback
      const res = await fetch(imageUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn(`[frame-gen] Could not load reference frame: ${(err as Error).message}`);
    }
    return undefined;
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
