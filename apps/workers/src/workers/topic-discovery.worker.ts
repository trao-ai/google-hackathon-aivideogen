import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { prisma, trackLLMCost } from "@atlas/db";
import { runAgent } from "@atlas/integrations";
import {
  TOPIC_SCOUT_SYSTEM_PROMPT,
  buildTopicScoutPrompt,
} from "@atlas/prompts";

export class TopicDiscoveryWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("topic-discovery", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[topic-discovery] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(job: Job<{ projectId: string }>): Promise<void> {
    const { projectId } = job.data;
    console.log(`[topic-discovery] Starting for project ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    try {
      const prompt = buildTopicScoutPrompt({
        niche: project.niche,
        count: 10,
        platform: project.platform,
        videoType: project.videoType,
        videoStyle: project.videoStyle,
        toneKeywords: project.toneKeywords ?? [],
      });

      const response = await runAgent({
        agentName: "topic-scout",
        instruction: TOPIC_SCOUT_SYSTEM_PROMPT,
        userMessage: prompt,
      });

      // Track LLM cost
      await trackLLMCost({
        projectId,
        stage: "topic_discovery",
        vendor: "gemini",
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalCostUsd: response.costUsd,
      });

      // Parse LLM response — try to extract JSON array
      let topics: {
        title: string;
        summary: string;
        opportunityScore: number;
        scores?: {
          visualStorytellingFit?: number;
          evergreenPotential?: number;
          searchMomentum?: number;
          curiosityGap?: number;
          factDensity?: number;
        };
        thumbnailAngle?: string;
        likelyAudienceAppeal?: string;
      }[] = [];

      try {
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          topics = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.warn(
          "[topic-discovery] Failed to parse LLM JSON, using raw response as single topic",
        );
        topics = [
          {
            title: `Topics for: ${project.niche}`,
            summary: response.content.substring(0, 500),
            opportunityScore: 50,
          },
        ];
      }

      // Persist topics
      await prisma.topic.createMany({
        data: topics.map((t) => ({
          projectId,
          title: t.title,
          summary: t.summary,
          opportunityScore: t.opportunityScore ?? 0,
          visualStorytellingScore: t.scores?.visualStorytellingFit ?? 0,
          evergreenScore: t.scores?.evergreenPotential ?? 0,
          trendScore: t.scores?.searchMomentum ?? 0,
          curiosityGapScore: t.scores?.curiosityGap ?? 0,
          factDensityScore: t.scores?.factDensity ?? 0,
          thumbnailAngle: t.thumbnailAngle,
          likelyAudienceAppeal: t.likelyAudienceAppeal,
          status: "candidate",
        })),
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "topic_discovery" },
      });

      console.log(
        `[topic-discovery] Created ${topics.length} topics for project ${projectId}`,
      );
    } catch (err) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "topic_failed" },
      });
      throw err;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
