import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import type { Prisma } from "@atlas/db";
import { prisma, trackLLMCost } from "@atlas/db";
import { createYouTubeProvider, createLLMProvider } from "@atlas/integrations";

export class ChannelAnalysisWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("channel-analysis", this.process.bind(this), {
      connection,
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[channel-analysis] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string; channelProfileId: string }>,
  ): Promise<void> {
    const { projectId, channelProfileId } = job.data;
    console.log(
      `[channel-analysis] Analyzing channel profile ${channelProfileId}`,
    );

    const profile = await prisma.channelProfile.findUnique({
      where: { id: channelProfileId },
    });
    if (!profile)
      throw new Error(`ChannelProfile ${channelProfileId} not found`);

    const youtube = createYouTubeProvider();
    const llm = createLLMProvider();

    // Extract channel ID from URL (simplified)
    const urlParts = profile.channelUrl.split("/");
    const channelId = urlParts[urlParts.length - 1];

    const videos = await youtube.getChannelVideos(channelId, 50);
    const topVideos = videos
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 20);

    if (topVideos.length === 0) {
      console.warn(
        `[channel-analysis] No videos found for channel ${channelId}`,
      );
      return;
    }

    // Ask LLM to extract patterns
    const videoList = topVideos
      .map(
        (v, i) =>
          `${i + 1}. "${v.title}" — ${v.viewCount.toLocaleString()} views, ${Math.round((v.durationSec ?? 0) / 60)}min`,
      )
      .join("\n");

    const llmResponse = await llm.chat([
      {
        role: "system",
        content:
          "You are a YouTube content analyst. Analyze the following top-performing video titles and extract patterns.",
      },
      {
        role: "user",
        content: `Channel: ${profile.channelName}\n\nTop videos:\n${videoList}\n\nExtract:\n1. Top topic categories (array of strings)\n2. Title patterns (array of strings)\n3. Runtime range in minutes [min, max]\n4. Visual/narrative traits (array of strings)\n\nReturn JSON with keys: topics, titlePatterns, runtimeRange, visualTraits`,
      },
    ]);

    // Track cost
    await trackLLMCost({
      projectId,
      stage: "channel_analysis",
      vendor: "openai",
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      totalCostUsd: llmResponse.costUsd,
    });

    let patterns = {
      topics: [],
      titlePatterns: [],
      runtimeRange: [8, 15],
      visualTraits: [],
    } as {
      topics: string[];
      titlePatterns: string[];
      runtimeRange: number[];
      visualTraits: string[];
    };

    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) patterns = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[channel-analysis] Could not parse LLM patterns JSON");
    }

    await prisma.channelProfile.update({
      where: { id: channelProfileId },
      data: {
        topTopics: patterns.topics,
        titlePatterns: patterns.titlePatterns,
        runtimeRangeMinutes: patterns.runtimeRange,
        visualTraits: patterns.visualTraits,
        rawData: { topVideos } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`[channel-analysis] Done for ${profile.channelName}`);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
