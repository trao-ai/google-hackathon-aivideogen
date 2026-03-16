import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { runAgent } from "@atlas/integrations";
import {
  SCRIPT_ARCHITECT_SYSTEM_PROMPT,
  buildScriptPrompt,
  type ScriptTone,
} from "@atlas/prompts";

interface ScriptJobData {
  projectId: string;
  tone: ScriptTone;
  targetWordCount: number;
  /** If set, only rewrite a single section */
  rewriteSectionId?: string;
  rewriteInstructions?: string;
}

export class ScriptWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("script-generation", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[script] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(job: Job<ScriptJobData>): Promise<void> {
    const {
      projectId,
      tone,
      targetWordCount,
      rewriteSectionId,
      rewriteInstructions,
    } = job.data;

    if (rewriteSectionId) {
      await this.rewriteSection(
        projectId,
        rewriteSectionId,
        rewriteInstructions ?? "",
      );
      return;
    }

    console.log(`[script] Generating script for project ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project?.selectedTopicId) throw new Error("No selected topic");

    const [selectedTopic, researchBriefs] = await Promise.all([
      prisma.topic.findUnique({ where: { id: project.selectedTopicId } }),
      prisma.researchBrief.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

    if (!selectedTopic) throw new Error("Selected topic not found");
    if (!researchBriefs.length) throw new Error("No research brief found");

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "scripting" },
    });

    const brief = researchBriefs[0];

    const briefSummary = `Summary: ${brief.summary}\n\nAngles: ${(brief.storyAngles as string[]).join(", ")}`;

    const llmResponse = await runAgent({
      agentName: "script-architect",
      instruction: SCRIPT_ARCHITECT_SYSTEM_PROMPT,
      userMessage: buildScriptPrompt(
        selectedTopic.title,
        briefSummary,
        tone,
        targetWordCount,
      ),
      model: "gemini-3.1-pro-preview",
    });

    await trackLLMCost({
      projectId,
      stage: "script",
      vendor: "gemini",
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      totalCostUsd: llmResponse.costUsd,
    });

    let parsed: {
      titleCandidates?: string[];
      thumbnailAngles?: string[];
      outline?: string;
      sections: Array<{
        sectionType: string;
        text: string;
        estimatedDurationSec?: number;
        sourceRefs?: string[];
      }>;
      qualityScore?: object | null;
    } = {
      sections: [],
    };
    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[script] Could not parse LLM JSON, using raw content");
      parsed.sections = [
        { sectionType: "narration", text: llmResponse.content },
      ];
    }

    const fullText = parsed.sections.map((s) => s.text).join("\n\n");
    const estimatedDurationSec = parsed.sections.reduce(
      (acc, s) =>
        acc +
        (s.estimatedDurationSec ??
          Math.round(s.text.split(/\s+/).length / 2.5)),
      0,
    );

    const script = await prisma.script.create({
      data: {
        projectId,
        titleCandidates: parsed.titleCandidates ?? [selectedTopic.title],
        thumbnailAngles: parsed.thumbnailAngles ?? [],
        outline: parsed.outline ?? "",
        fullText,
        estimatedDurationSec,
        status: "draft",
        qualityScore: parsed.qualityScore ?? {},
        sections: {
          create: parsed.sections.map((s, i) => ({
            orderIndex: i,
            sectionType: s.sectionType ?? "narration",
            text: s.text,
            estimatedDurationSec: s.estimatedDurationSec ?? 0,
            sourceRefs: s.sourceRefs ?? [],
          })),
        },
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "script_draft" },
    });

    console.log(
      `[script] Created script ${script.id} (${selectedTopic.title}) with ${parsed.sections.length} sections`,
    );
  }

  private async rewriteSection(
    projectId: string,
    sectionId: string,
    instructions: string,
  ): Promise<void> {
    console.log(`[script] Rewriting section ${sectionId}`);
    const section = await prisma.scriptSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new Error(`ScriptSection ${sectionId} not found`);

    const llmResponse = await runAgent({
      agentName: "script-rewriter",
      instruction:
        "You are a script editor. Rewrite the given script section based on the instructions. Return only the rewritten text, no JSON wrapper.",
      userMessage: `Section type: ${section.sectionType}\nOriginal text:\n${section.text}\n\nInstructions: ${instructions}`,
      model: "gemini-3.1-pro-preview",
    });

    await trackLLMCost({
      projectId,
      stage: "script",
      vendor: "gemini",
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      totalCostUsd: llmResponse.costUsd,
      metadata: { rewriteSectionId: sectionId },
    });

    await prisma.scriptSection.update({
      where: { id: sectionId },
      data: { text: llmResponse.content.trim() },
    });

    console.log(`[script] Section ${sectionId} rewritten`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
