import { Router } from "express";
import { prisma } from "@atlas/db";

export const costRouter = Router();

// GET /projects/:id/costs
costRouter.get("/:id/costs", async (req, res, next) => {
  try {
    const events = await prisma.costEvent.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });

    const stageMap: Record<string, { totalCostUsd: number; eventCount: number }> = {};
    let total = 0;
    for (const e of events) {
      if (!stageMap[e.stage]) stageMap[e.stage] = { totalCostUsd: 0, eventCount: 0 };
      stageMap[e.stage].totalCostUsd += e.totalCostUsd;
      stageMap[e.stage].eventCount += 1;
      total += e.totalCostUsd;
    }
    const breakdown = Object.entries(stageMap).map(([stage, v]) => ({
      stage,
      totalCostUsd: v.totalCostUsd,
      eventCount: v.eventCount,
    }));

    const voiceover = await prisma.voiceover.findFirst({
      where: { projectId: req.params.id },
    });
    const durationMin = voiceover ? voiceover.durationSec / 60 : null;
    const costPerFinishedMinute = durationMin && total > 0 ? total / durationMin : undefined;

    res.json({ total, breakdown, costPerFinishedMinute });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/cost-summary  (mounted under /api/projects but returns all)
costRouter.get("/analytics/cost-summary", async (_req, res, next) => {
  try {
    const result = await prisma.costEvent.groupBy({
      by: ["stage"],
      _sum: { totalCostUsd: true },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
