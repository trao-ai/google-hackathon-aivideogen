import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { calculateLLMCost } from "@atlas/shared";

interface TransitionPlan {
  type: string;
  durationSec: number;
  direction?: string | null;
  visualNotes: string;
  ffmpegTransition: string;
}

export class TransitionPlanningWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker(
      "transition-planning",
      this.process.bind(this),
      { connection, concurrency: 1 },
    );
    this.worker.on("failed", (job, err) => {
      console.error(`[transition-plan] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string }>,
  ): Promise<void> {
    const { projectId } = job.data;
    console.log(`[transition-plan] Planning transitions for project ${projectId}`);

    const scenes = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { orderIndex: "asc" },
    });

    if (scenes.length < 2) {
      console.log(`[transition-plan] Only ${scenes.length} scene(s), nothing to plan`);
      return;
    }

    // Build scene pairs for the prompt
    const scenePairs = [];
    for (let i = 0; i < scenes.length - 1; i++) {
      scenePairs.push({
        index: i,
        from: {
          purpose: scenes[i].purpose,
          sceneType: scenes[i].sceneType,
          endPrompt: scenes[i].endPrompt,
          motionNotes: scenes[i].motionNotes,
        },
        to: {
          purpose: scenes[i + 1].purpose,
          sceneType: scenes[i + 1].sceneType,
          startPrompt: scenes[i + 1].startPrompt,
        },
      });
    }

    const prompt = `You are a video editor planning transitions between consecutive scenes in an educational explainer video.

For each scene pair, recommend the ideal visual transition considering:
- Content continuity: similar topics should use soft transitions (crossfade, dissolve)
- Topic shifts: major changes should use stronger transitions (fade_to_black, wipe)
- Pacing: fast sections need quick cuts, slow sections need gentle dissolves
- The FFmpeg xfade filter supports these transitions: fade, fadeblack, fadewhite, dissolve, wipeleft, wiperight, wipeup, wipedown, slideleft, slideright, slideup, slidedown, smoothleft, smoothright, smoothup, smoothdown, circlecrop, circleopen, circleclose, vertopen, vertclose, horzopen, horzclose

Scene pairs:
${scenePairs
  .map(
    (p) =>
      `${p.index + 1}. FROM [${p.from.sceneType}] "${p.from.purpose}"
   End of scene ${p.index + 1}: ${p.from.endPrompt.slice(0, 150)}
   Motion: ${p.from.motionNotes.slice(0, 100)}
   → TO [${p.to.sceneType}] "${p.to.purpose}"
   Start of scene ${p.index + 2}: ${p.to.startPrompt.slice(0, 150)}`,
  )
  .join("\n\n")}

Respond with ONLY a JSON array. Each element must have:
{
  "type": "crossfade" | "dissolve" | "fade_to_black" | "cut" | "wipe" | "slide",
  "durationSec": number (0.3 to 1.5),
  "direction": "left" | "right" | "up" | "down" | null,
  "visualNotes": "brief description of the transition feel",
  "ffmpegTransition": "the xfade transition name from the list above"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[transition-plan] No GEMINI_API_KEY, using default transitions");
      await this.applyDefaults(scenes);
      return;
    }

    const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2000 },
          }),
        },
      );

      if (!res.ok) {
        console.warn(`[transition-plan] Gemini API error ${res.status}, using defaults`);
        await this.applyDefaults(scenes);
        return;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
        };
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

      // Track LLM cost
      if (inputTokens > 0 || outputTokens > 0) {
        const cost = calculateLLMCost(model, inputTokens, outputTokens);
        await trackLLMCost({
          projectId,
          stage: "transition_planning",
          vendor: "gemini",
          model,
          inputTokens,
          outputTokens,
          totalCostUsd: cost,
        });
        console.log(
          `[transition-plan] LLM cost: $${cost.toFixed(6)} (${inputTokens}in/${outputTokens}out)`,
        );
      }

      if (!text) {
        console.warn("[transition-plan] Empty response from Gemini, using defaults");
        await this.applyDefaults(scenes);
        return;
      }

      // Parse JSON from response (strip markdown fences if present)
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const plans: TransitionPlan[] = JSON.parse(cleaned);

      // Save each transition plan on the "from" scene
      for (let i = 0; i < Math.min(plans.length, scenes.length - 1); i++) {
        // Validate ffmpegTransition is a known value, fallback to "fade"
        const validTransitions = [
          "fade", "fadeblack", "fadewhite", "dissolve",
          "wipeleft", "wiperight", "wipeup", "wipedown",
          "slideleft", "slideright", "slideup", "slidedown",
          "smoothleft", "smoothright", "smoothup", "smoothdown",
          "circlecrop", "circleopen", "circleclose",
          "vertopen", "vertclose", "horzopen", "horzclose",
        ];
        if (!validTransitions.includes(plans[i].ffmpegTransition)) {
          plans[i].ffmpegTransition = "fade";
        }
        // Clamp duration
        plans[i].durationSec = Math.max(0.3, Math.min(1.5, plans[i].durationSec));

        await prisma.scene.update({
          where: { id: scenes[i].id },
          data: { transitionPlan: plans[i] as unknown as Record<string, string | number | null> },
        });
      }

      console.log(
        `[transition-plan] Planned ${Math.min(plans.length, scenes.length - 1)} transitions for project ${projectId}`,
      );
    } catch (err) {
      console.error("[transition-plan] Error:", (err as Error).message);
      await this.applyDefaults(scenes);
    }
  }

  /** Apply a sensible default transition plan when LLM is unavailable. */
  private async applyDefaults(
    scenes: Array<{ id: string }>,
  ): Promise<void> {
    const defaultPlan: TransitionPlan = {
      type: "crossfade",
      durationSec: 0.5,
      direction: null,
      visualNotes: "smooth crossfade transition",
      ffmpegTransition: "fade",
    };

    for (let i = 0; i < scenes.length - 1; i++) {
      await prisma.scene.update({
        where: { id: scenes[i].id },
        data: { transitionPlan: defaultPlan as unknown as Record<string, string | number | null> },
      });
    }

    console.log(`[transition-plan] Applied default transitions for ${scenes.length - 1} pairs`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
