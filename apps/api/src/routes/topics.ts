import { Router } from "express";
import { z } from "zod";
import { prisma } from "@atlas/db";
import { Queue } from "bullmq";
import { ApiError } from "../middleware/error-handler";
import { getRedisConnection } from "../services/queue";

export const topicRouter = Router();

// POST /projects/:id/discover-topics
topicRouter.post("/:id/discover-topics", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const queue = new Queue("topic-discovery", {
      connection: getRedisConnection(),
    });
    const job = await queue.add("discover", { projectId: project.id });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "topic_discovery" },
    });

    res.json({ jobId: job.id, message: "Topic discovery queued" });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/topics
topicRouter.get("/:id/topics", async (req, res, next) => {
  try {
    const topics = await prisma.topic.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ opportunityScore: "desc" }, { id: "asc" }],
    });
    res.json(topics);
  } catch (err) {
    next(err);
  }
});

// POST /topics/:topicId/approve
topicRouter.post(
  "/:projectId/topics/:topicId/approve",
  async (req, res, next) => {
    try {
      const { projectId, topicId } = req.params;
      const topic = await prisma.topic.update({
        where: { id: topicId },
        data: { status: "approved" },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: {
          selectedTopicId: topicId,
          status: "topic_selected",
          title: topic.title,
        },
      });
      res.json(topic);
    } catch (err) {
      next(err);
    }
  },
);

// POST /topics/:topicId/reject
topicRouter.post(
  "/:projectId/topics/:topicId/reject",
  async (req, res, next) => {
    try {
      const topic = await prisma.topic.update({
        where: { id: req.params.topicId },
        data: { status: "rejected" },
      });
      res.json(topic);
    } catch (err) {
      next(err);
    }
  },
);

// POST /projects/:id/channels — add reference channel
topicRouter.post("/:id/channels", async (req, res, next) => {
  try {
    const schema = z.object({
      channelName: z.string().min(1),
      channelUrl: z.string().url(),
    });
    const body = schema.parse(req.body);
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const profile = await prisma.channelProfile.create({
      data: {
        projectId: project.id,
        channelName: body.channelName,
        channelUrl: body.channelUrl,
        topTopics: [],
        titlePatterns: [],
        runtimeRangeMinutes: [],
        visualTraits: [],
      },
    });

    // Queue channel analysis
    const queue = new Queue("channel-analysis", {
      connection: getRedisConnection(),
    });
    await queue.add("analyze", {
      projectId: project.id,
      channelProfileId: profile.id,
    });

    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});
