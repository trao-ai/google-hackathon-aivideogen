import "dotenv/config";

import { TopicDiscoveryWorker } from "./workers/topic-discovery.worker";
import { ChannelAnalysisWorker } from "./workers/channel-analysis.worker";
import { ResearchWorker } from "./workers/research.worker";
import { ScriptWorker } from "./workers/script.worker";
import { TTSWorker } from "./workers/tts.worker";
import { ScenePlannerWorker } from "./workers/scene-planner.worker";
import { FrameGenerationWorker } from "./workers/frame-generation.worker";
import { VideoGenerationWorker } from "./workers/video-generation.worker";
import { RenderWorker } from "./workers/render.worker";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379", 10),
  ...(redisUrl.password ? { password: redisUrl.password } : {}),
  maxRetriesPerRequest: null as null, // Required for BullMQ
};

const workers = [
  new TopicDiscoveryWorker(connection),
  new ChannelAnalysisWorker(connection),
  new ResearchWorker(connection),
  new ScriptWorker(connection),
  new TTSWorker(connection),
  new ScenePlannerWorker(connection),
  new FrameGenerationWorker(connection),
  new VideoGenerationWorker(connection),
  new RenderWorker(connection),
];

console.log(`🔧 Atlas workers started (${workers.length} queues listening)`);

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});
