import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { createSearchProvider, createLLMProvider } from "@atlas/integrations";
import {
  RESEARCH_SYNTHESIZER_SYSTEM_PROMPT,
  buildResearchPrompt,
} from "@atlas/prompts";

export class ResearchWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("research", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[research] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(job: Job<{ projectId: string }>): Promise<void> {
    const { projectId } = job.data;
    console.log(`[research] Starting research for project ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project?.selectedTopicId) {
      throw new Error(`Project ${projectId} has no selected topic`);
    }

    const selectedTopic = await prisma.topic.findUnique({
      where: { id: project.selectedTopicId },
    });

    if (!selectedTopic) {
      throw new Error(`Topic ${project.selectedTopicId} not found`);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "researching" },
    });

    const topicTitle = selectedTopic.title;
    const search = createSearchProvider();
    const llm = createLLMProvider();

    // Perform multiple search queries
    const queries = [
      topicTitle,
      `${topicTitle} science explained`,
      `${topicTitle} history facts`,
      `${topicTitle} latest research`,
    ];

    const allResults: Array<{ title: string; snippet: string; url: string }> =
      [];
    for (const q of queries) {
      try {
        const results = await search.search(q, 5);
        allResults.push(...results);
      } catch (err) {
        console.warn(
          `[research] Search failed for "${q}":`,
          (err as Error).message,
        );
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    const searchText = uniqueResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
      .join("\n\n");

    const llmResponse = await llm.chat([
      { role: "system", content: RESEARCH_SYNTHESIZER_SYSTEM_PROMPT },
      { role: "user", content: buildResearchPrompt(topicTitle, searchText) },
    ]);

    // Track LLM cost
    await trackLLMCost({
      projectId,
      stage: "research",
      vendor: "openai",
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      totalCostUsd: llmResponse.costUsd,
    });

    let brief: {
      summary: string;
      background?: string;
      currentDevelopments?: string;
      surprisingFacts?: string[];
      controversies?: string;
      stakes?: string;
      timeline?: string[];
      keyFacts?: string[];
      storyAngles?: string[];
      claims?: unknown;
      sources?: unknown;
      confidenceScore?: number;
    } = {
      summary: "",
    };

    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) brief = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: use the raw content as summary
      brief.summary = llmResponse.content.slice(0, 2000);
    }

    await prisma.researchBrief.create({
      data: {
        projectId,
        topicId: selectedTopic.id,
        summary: brief.summary || "",
        background: brief.background ?? undefined,
        currentDevelopments: brief.currentDevelopments ?? undefined,
        surprisingFacts: brief.surprisingFacts ?? [],
        controversies: brief.controversies ?? undefined,
        stakes: brief.stakes ?? undefined,
        timeline: brief.timeline ?? [],
        keyFacts: brief.keyFacts ?? [],
        storyAngles: brief.storyAngles ?? [],
        claims: (brief.claims as object) ?? [],
        sources: (brief.sources as object) ?? [],
        confidenceScore: brief.confidenceScore ?? 0,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "research_done" },
    });

    console.log(`[research] Done for project ${projectId}`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
