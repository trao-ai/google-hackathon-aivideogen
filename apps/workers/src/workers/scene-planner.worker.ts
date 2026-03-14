import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { runAgent } from "@atlas/integrations";
import {
  SCENE_PLANNER_SYSTEM_PROMPT,
  buildScenePlannerPrompt,
} from "@atlas/prompts";
import { styleBibleToPromptSummary } from "@atlas/style-system";
import type { StyleBible } from "@atlas/shared";

export class ScenePlannerWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("scene-planning", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[scene-planner] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string; voiceoverId: string }>,
  ): Promise<void> {
    const { projectId, voiceoverId } = job.data;
    console.log(`[scene-planner] Planning scenes for project ${projectId}`);

    const [project, voiceover] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        include: { styleBible: true },
      }),
      prisma.voiceover.findUnique({ where: { id: voiceoverId } }),
    ]);

    if (!project) throw new Error(`Project ${projectId} not found`);
    if (!voiceover) throw new Error(`Voiceover ${voiceoverId} not found`);
    if (!project.selectedScriptId) throw new Error("No selected script");

    const script = await prisma.script.findUnique({
      where: { id: project.selectedScriptId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });
    if (!script)
      throw new Error(`Script ${project.selectedScriptId} not found`);

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "planning_scenes" },
    });

    // Build section summaries with timestamps
    const segments = voiceover.segments as Array<{
      sectionId: string;
      text: string;
      startSec: number;
      endSec: number;
    }>;
    const sectionSummaries = script.sections.map((s) => {
      const seg = segments.find((sg) => sg.sectionId === s.id);
      return {
        order: s.orderIndex,
        type: s.sectionType,
        text: s.text,
        startSec: seg?.startSec ?? 0,
        endSec: seg?.endSec ?? 0,
      };
    });

    const styleSummary = project.styleBible
      ? styleBibleToPromptSummary(project.styleBible as unknown as StyleBible)
      : "Kurzgesagt-style cinematic illustration, vibrant colorful backgrounds that match scene mood, glowing highlights, sophisticated simplified characters with expressive eyes and no mouth, atmospheric depth";

    const llmResponse = await runAgent({
      agentName: "scene-planner",
      instruction: SCENE_PLANNER_SYSTEM_PROMPT,
      userMessage: buildScenePlannerPrompt(
        JSON.stringify(sectionSummaries, null, 2),
        JSON.stringify(segments, null, 2),
        styleSummary,
        voiceover.durationSec,
      ),
      model: "gemini-3.1-pro-preview",
    });

    await trackLLMCost({
      projectId,
      stage: "scene_planning",
      vendor: "gemini",
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      totalCostUsd: llmResponse.costUsd,
    });

    let scenes: Array<{
      orderIndex: number;
      narrationStartSec: number;
      narrationEndSec: number;
      purpose: string;
      sceneType: string;
      startPrompt: string;
      endPrompt: string;
      motionNotes: string;
      bubbleText?: string | null;
      continuityNotes?: string | null;
      scriptSectionId?: string | null;
      characterDescriptions?: string | null;
    }> = [];

    try {
      const jsonMatch = llmResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) scenes = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[scene-planner] Could not parse scene JSON");
    }

    // Enforce character consistency: extract character descriptions from scene 0
    // and inject into all subsequent scenes' prompts
    if (scenes.length > 0 && scenes[0].characterDescriptions) {
      const canonical = scenes[0].characterDescriptions;
      console.log(`[scene-planner] Character descriptions from scene 0: "${canonical.slice(0, 100)}..."`);
      for (let i = 1; i < scenes.length; i++) {
        if (!scenes[i].characterDescriptions) {
          scenes[i].characterDescriptions = canonical;
        }
        // Prepend character descriptions to prompts if not already present
        const charPrefix = `Characters: ${canonical}\n`;
        if (!scenes[i].startPrompt.includes(canonical.slice(0, 50))) {
          scenes[i].startPrompt = charPrefix + scenes[i].startPrompt;
        }
        if (!scenes[i].endPrompt.includes(canonical.slice(0, 50))) {
          scenes[i].endPrompt = charPrefix + scenes[i].endPrompt;
        }
      }
    }

    if (scenes.length === 0) {
      // Fallback: one scene per section
      scenes = sectionSummaries.map((s, i) => ({
        orderIndex: i,
        narrationStartSec: s.startSec,
        narrationEndSec: s.endSec,
        purpose: s.text,
        sceneType: "infographic",
        startPrompt: s.text,
        endPrompt: s.text,
        motionNotes: "",
      }));
    }

    // Post-validation: auto-split any scene longer than 14s into ~10s sub-scenes
    const MAX_SCENE_SEC = 14;
    const validated: typeof scenes = [];
    for (const sc of scenes) {
      const dur = sc.narrationEndSec - sc.narrationStartSec;
      if (dur <= MAX_SCENE_SEC) {
        validated.push({ ...sc, orderIndex: validated.length });
      } else {
        // Split into ~10s parts
        const parts = Math.ceil(dur / 10);
        const partDur = dur / parts;
        console.log(
          `[scene-planner] Auto-splitting scene "${sc.purpose.slice(0, 50)}" (${dur.toFixed(1)}s) into ${parts} parts of ~${partDur.toFixed(1)}s`,
        );
        for (let p = 0; p < parts; p++) {
          validated.push({
            ...sc,
            orderIndex: validated.length,
            narrationStartSec: parseFloat((sc.narrationStartSec + p * partDur).toFixed(2)),
            narrationEndSec: parseFloat((sc.narrationStartSec + (p + 1) * partDur).toFixed(2)),
            purpose: parts > 1 ? `${sc.purpose} (part ${p + 1}/${parts})` : sc.purpose,
          });
        }
      }
    }

    if (validated.length !== scenes.length) {
      console.log(
        `[scene-planner] Post-validation: ${scenes.length} scenes → ${validated.length} scenes after splitting`,
      );
    }

    // Ensure scenes cover the full audio duration with no gaps
    if (voiceover.durationSec > 0 && validated.length > 0) {
      const audioDuration = voiceover.durationSec;

      // If first scene doesn't start at 0, fix it
      if (validated[0].narrationStartSec > 0.5) {
        console.log(
          `[scene-planner] First scene starts at ${validated[0].narrationStartSec.toFixed(1)}s — resetting to 0`,
        );
        validated[0].narrationStartSec = 0;
      }

      // Check for gaps between scenes and close them
      for (let i = 1; i < validated.length; i++) {
        const gap = validated[i].narrationStartSec - validated[i - 1].narrationEndSec;
        if (gap > 0.5) {
          console.log(
            `[scene-planner] Gap of ${gap.toFixed(1)}s between scenes ${i - 1} and ${i} — closing`,
          );
          validated[i - 1].narrationEndSec = validated[i].narrationStartSec;
        }
      }

      // If last scene ends more than 1s before audio end, extend it
      const lastScene = validated[validated.length - 1];
      if (lastScene.narrationEndSec < audioDuration - 1) {
        console.log(
          `[scene-planner] Last scene ends at ${lastScene.narrationEndSec.toFixed(1)}s but audio is ${audioDuration.toFixed(1)}s — extending`,
        );
        lastScene.narrationEndSec = parseFloat(audioDuration.toFixed(2));
      }
    }

    // ─── Duration budget: compute clip target durations so video matches audio ───
    // When clips are joined with xfade transitions, each transition overlaps two
    // clips, making the final video shorter by sum(transitionDurations).
    // To compensate, we extend each clip proportionally so:
    //   sum(clipTargetDurations) - totalTransitionOverlap = audioDuration
    const DEFAULT_TRANSITION_SEC = 0.5;
    const numTransitions = Math.max(0, validated.length - 1);
    const totalTransitionOverlap = numTransitions * DEFAULT_TRANSITION_SEC;
    const audioDuration = voiceover.durationSec;
    const totalBaseDuration = validated.reduce(
      (sum, sc) => sum + (sc.narrationEndSec - sc.narrationStartSec),
      0,
    );

    const clipTargetDurations: number[] = validated.map((sc) => {
      const baseDur = sc.narrationEndSec - sc.narrationStartSec;
      // Distribute the transition overlap proportionally to each scene's share
      const compensation =
        totalBaseDuration > 0
          ? (baseDur / totalBaseDuration) * totalTransitionOverlap
          : 0;
      // Clamp to Kling's 3-15s range
      return Math.max(3, Math.min(15, parseFloat((baseDur + compensation).toFixed(2))));
    });

    console.log(
      `[scene-planner] Duration budget: audio=${audioDuration.toFixed(1)}s, ` +
        `scenes=${validated.length}, transitions=${numTransitions}×${DEFAULT_TRANSITION_SEC}s=${totalTransitionOverlap.toFixed(1)}s, ` +
        `totalClipTarget=${clipTargetDurations.reduce((a, b) => a + b, 0).toFixed(1)}s`,
    );

    // Set default transition plans on each scene (except last)
    for (let i = 0; i < validated.length; i++) {
      if (i < validated.length - 1) {
        (validated[i] as Record<string, unknown>).transitionPlan = {
          type: "fade",
          durationSec: DEFAULT_TRANSITION_SEC,
          ffmpegTransition: "fade",
          visualNotes: "smooth cross-fade",
        };
      }
    }

    // Delete any old scenes for this project
    await prisma.scene.deleteMany({ where: { projectId } });

    await prisma.scene.createMany({
      data: validated.map((sc, i) => ({
        projectId,
        orderIndex: sc.orderIndex,
        narrationStartSec: sc.narrationStartSec,
        narrationEndSec: sc.narrationEndSec,
        clipTargetDurationSec: clipTargetDurations[i],
        purpose: sc.purpose,
        sceneType: sc.sceneType ?? "infographic",
        startPrompt: sc.startPrompt,
        endPrompt: sc.endPrompt,
        motionNotes: sc.motionNotes ?? "",
        bubbleText: sc.bubbleText ?? null,
        continuityNotes: sc.continuityNotes ?? null,
        scriptSectionId: sc.scriptSectionId ?? null,
        transitionPlan: (sc as Record<string, unknown>).transitionPlan as object ?? null,
      })),
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "scenes_planned" },
    });

    console.log(
      `[scene-planner] Created ${validated.length} scenes for project ${projectId}`,
    );
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
