import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { createLLMProvider } from "@atlas/integrations";
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

    const llm = createLLMProvider();

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
        text: s.text.slice(0, 200),
        startSec: seg?.startSec ?? 0,
        endSec: seg?.endSec ?? 0,
      };
    });

    const styleSummary = project.styleBible
      ? styleBibleToPromptSummary(project.styleBible as unknown as StyleBible)
      : "Flat-design educational infographic style, vibrant colors";

    const llmResponse = await llm.chat([
      { role: "system", content: SCENE_PLANNER_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildScenePlannerPrompt(
          JSON.stringify(sectionSummaries, null, 2),
          JSON.stringify(segments, null, 2),
          styleSummary,
        ),
      },
    ]);

    await trackLLMCost({
      projectId,
      stage: "scene_planning",
      vendor: "openai",
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
    }> = [];

    try {
      const jsonMatch = llmResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) scenes = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[scene-planner] Could not parse scene JSON");
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

    // Delete any old scenes for this project
    await prisma.scene.deleteMany({ where: { projectId } });

    await prisma.scene.createMany({
      data: scenes.map((sc) => ({
        projectId,
        orderIndex: sc.orderIndex,
        narrationStartSec: sc.narrationStartSec,
        narrationEndSec: sc.narrationEndSec,
        purpose: sc.purpose,
        sceneType: sc.sceneType ?? "infographic",
        startPrompt: sc.startPrompt,
        endPrompt: sc.endPrompt,
        motionNotes: sc.motionNotes ?? "",
        bubbleText: sc.bubbleText ?? null,
        continuityNotes: sc.continuityNotes ?? null,
        scriptSectionId: sc.scriptSectionId ?? null,
      })),
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "scenes_planned" },
    });

    console.log(
      `[scene-planner] Created ${scenes.length} scenes for project ${projectId}`,
    );
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
