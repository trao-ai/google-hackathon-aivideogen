import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackImageCost, trackLLMCost } from "@atlas/db";
import {
  createImageProvider,
  createStorageProvider,
  runAgent,
} from "@atlas/integrations";
import { getStylePrefix } from "@atlas/style-system";
import { calculateLLMCost } from "@atlas/shared";
import type { StyleBible } from "@atlas/shared";

export class CharacterGenerationWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker(
      "character-generation",
      this.process.bind(this),
      { connection, concurrency: 1 },
    );
    this.worker.on("failed", (job, err) => {
      console.error(`[character-gen] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{
      projectId: string;
      characterId: string;
      prompt: string | null;
      gender: string;
      ageStyle: string;
      emotion: string;
      appearance: string;
      transparentBg: boolean;
    }>,
  ): Promise<void> {
    const { projectId, characterId, prompt, gender, ageStyle, emotion, appearance, transparentBg } = job.data;
    console.log(`[character-gen] Generating character ${characterId} for project ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { styleBible: true },
    });
    if (!project) throw new Error("Project not found");

    // Build the image generation prompt
    const imagePrompt = this.buildPrompt({
      userPrompt: prompt,
      gender,
      ageStyle,
      emotion,
      appearance,
      transparentBg,
      niche: project.niche,
      styleBible: project.styleBible as unknown as StyleBible | null,
    });

    console.log(`[character-gen] Image prompt: ${imagePrompt.substring(0, 200)}...`);

    // Generate the character image
    const imageProvider = createImageProvider();
    const result = await imageProvider.generate(imagePrompt, undefined, undefined, "1:1");

    // Upload to storage
    const storage = createStorageProvider();
    const storageKey = `projects/${projectId}/character-${characterId}.png`;
    const imageUrl = await storage.upload(storageKey, result.imageBuffer, result.mimeType);
    console.log(`[character-gen] Image uploaded → ${storageKey}`);

    // Generate a canonical text description for use in scene prompts
    const description = await this.generateDescription({
      projectId,
      gender,
      ageStyle,
      emotion,
      appearance,
      userPrompt: prompt,
      niche: project.niche,
    });

    // Update the character record
    await prisma.character.update({
      where: { id: characterId },
      data: {
        imageUrl,
        description,
        costUsd: result.costUsd,
        seed: result.seed || null,
      },
    });

    // Track cost
    await trackImageCost({
      projectId,
      vendor: "gemini",
      model: result.model || "gemini-3-pro-image-preview",
      imageCount: 1,
      totalCostUsd: result.costUsd,
    });

    console.log(`[character-gen] Complete: ${imageUrl} (cost: $${result.costUsd.toFixed(4)})`);
  }

  private buildPrompt(params: {
    userPrompt: string | null;
    gender: string;
    ageStyle: string;
    emotion: string;
    appearance: string;
    transparentBg: boolean;
    niche: string;
    styleBible: StyleBible | null;
  }): string {
    const { userPrompt, gender, ageStyle, emotion, appearance, transparentBg, niche, styleBible } = params;

    // Style-specific prefix
    let stylePrefix = "";
    if (appearance === "Illustration" && styleBible) {
      stylePrefix = getStylePrefix(styleBible) + "\n";
    } else if (appearance === "Realistic") {
      stylePrefix = "Photorealistic high-quality portrait photograph. Natural lighting, shallow depth of field. ";
    } else if (appearance === "3D Avatar") {
      stylePrefix = "3D rendered character, Pixar/Disney-quality, soft lighting, clean background. ";
    } else if (appearance === "Cartoon") {
      stylePrefix = "Vibrant cartoon character illustration, bold outlines, flat colors, expressive design. ";
    }

    const characterCore = userPrompt
      ? userPrompt
      : `A knowledgeable and engaging presenter for a video about ${niche}`;

    const bgInstruction = transparentBg
      ? "on a plain solid white background with NO objects, NO shadows, and NO gradients — the background must be completely clean and flat white so it can be easily removed. Frame the FULL character with generous padding so nothing is cropped."
      : "clean simple background.";

    const prompt = `${stylePrefix}Generate a character portrait: A ${ageStyle.toLowerCase()} ${gender.toLowerCase()} character with a ${emotion.toLowerCase()} expression. ${characterCore}. Shown from waist up, facing slightly to the side, ${bgInstruction} IMPORTANT: Do NOT include any text, words, letters, or writing in the image.`;

    return prompt;
  }

  private async generateDescription(params: {
    projectId: string;
    gender: string;
    ageStyle: string;
    emotion: string;
    appearance: string;
    userPrompt: string | null;
    niche: string;
  }): Promise<string> {
    const { projectId, gender, ageStyle, emotion, appearance, userPrompt, niche } = params;

    try {
      const result = await runAgent({
        agentName: "character-describer",
        instruction: `You write concise visual character descriptions for use in AI image generation prompts. The description should be detailed enough to reproduce the character consistently across multiple images. Include: body type, proportions, hair, clothing, color scheme, and distinguishing features. Keep it to 2-3 sentences. Do NOT include background descriptions.`,
        userMessage: `Describe a ${ageStyle.toLowerCase()} ${gender.toLowerCase()} character with a ${emotion.toLowerCase()} expression in ${appearance.toLowerCase()} style. Context: ${userPrompt || `presenter for a video about ${niche}`}`,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      });

      // Track character description LLM cost
      if (result.inputTokens > 0 || result.outputTokens > 0) {
        const descCost = calculateLLMCost(
          result.model,
          result.inputTokens,
          result.outputTokens,
        );
        await trackLLMCost({
          projectId,
          stage: "character_generation",
          vendor: "gemini",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalCostUsd: descCost,
          metadata: { task: "character_description" },
        });
      }

      return result.content.trim();
    } catch (err) {
      console.warn(`[character-gen] Description generation failed:`, (err as Error).message);
      // Fallback to a basic description
      return `A ${ageStyle.toLowerCase()} ${gender.toLowerCase()} character with a ${emotion.toLowerCase()} expression in ${appearance.toLowerCase()} style.`;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
