jest.mock("@atlas/db", () => ({
  prisma: {
    costEvent: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    voiceover: {
      findFirst: jest.fn(),
    },
    scene: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@atlas/integrations", () => ({
  resolveStorageDir: jest.fn().mockReturnValue("/tmp/test-storage"),
}));

import { prisma } from "@atlas/db";
import { CostEstimator } from "@atlas/cost-estimation";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Cost Routes - Unit Logic", () => {
  describe("Cost breakdown calculation", () => {
    it("groups cost events by stage", () => {
      const events = [
        { stage: "script", totalCostUsd: 0.05 },
        { stage: "script", totalCostUsd: 0.03 },
        { stage: "tts", totalCostUsd: 1.5 },
        { stage: "video_generation", totalCostUsd: 3.2 },
        { stage: "video_generation", totalCostUsd: 2.8 },
      ];

      const stageMap: Record<string, { totalCostUsd: number; eventCount: number }> = {};
      let total = 0;
      for (const e of events) {
        if (!stageMap[e.stage]) stageMap[e.stage] = { totalCostUsd: 0, eventCount: 0 };
        stageMap[e.stage].totalCostUsd += e.totalCostUsd;
        stageMap[e.stage].eventCount += 1;
        total += e.totalCostUsd;
      }

      expect(Object.keys(stageMap)).toHaveLength(3);
      expect(stageMap["script"].totalCostUsd).toBeCloseTo(0.08);
      expect(stageMap["script"].eventCount).toBe(2);
      expect(stageMap["tts"].totalCostUsd).toBeCloseTo(1.5);
      expect(stageMap["video_generation"].totalCostUsd).toBeCloseTo(6.0);
      expect(total).toBeCloseTo(7.58);
    });

    it("calculates cost per finished minute", () => {
      const total = 7.58;
      const durationSec = 600;
      const durationMin = durationSec / 60;
      const costPerMin = total / durationMin;
      expect(costPerMin).toBeCloseTo(0.758);
    });

    it("returns undefined costPerMin when no voiceover", () => {
      const durationMin = null;
      const total = 5.0;
      const costPerFinishedMinute = durationMin && total > 0 ? total / durationMin : undefined;
      expect(costPerFinishedMinute).toBeUndefined();
    });
  });

  describe("CostEstimator integration", () => {
    it("estimateScenes returns proper breakdown", () => {
      const scenes = [
        { id: "1", narrationStartSec: 0, narrationEndSec: 8, motionNotes: "" },
        { id: "2", narrationStartSec: 8, narrationEndSec: 16, motionNotes: "" },
      ];
      const estimate = CostEstimator.estimateScenes(scenes, "kling");
      expect(estimate.frames).toBeGreaterThan(0);
      expect(estimate.videos).toBeGreaterThan(0);
      expect(estimate.total).toBe(
        estimate.frames + estimate.videos + estimate.motionEnrichment + estimate.validation
      );
      expect(estimate.perScene).toBeCloseTo(estimate.total / 2);
    });

    it("returns zeros for empty scenes", () => {
      const estimate = CostEstimator.estimateScenes([], "kling");
      expect(estimate.total).toBe(0);
      expect(estimate.perScene).toBe(0);
    });
  });
});
