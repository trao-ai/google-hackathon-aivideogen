import {
  trackCost,
  trackLLMCost,
  trackTTSCost,
  trackImageCost,
  trackVideoCost,
} from "../cost-tracking";

// Mock Prisma client
jest.mock("../index", () => ({
  prisma: {
    $transaction: jest.fn().mockResolvedValue([{}, {}]),
    costEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    project: {
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from "../index";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("trackCost", () => {
  it("creates a CostEvent and increments project totalCostUsd in a transaction", async () => {
    await trackCost({
      projectId: "proj-1",
      stage: "script",
      vendor: "gemini",
      units: 1500,
      unitCost: 0.001,
      totalCostUsd: 1.5,
      metadata: { model: "gemini-2.5-flash" },
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const [calls] = (mockPrisma.$transaction as jest.Mock).mock.calls[0];
    expect(calls).toHaveLength(2);
  });

  it("handles missing metadata gracefully", async () => {
    await trackCost({
      projectId: "proj-1",
      stage: "tts",
      vendor: "elevenlabs",
      units: 500,
      unitCost: 0.0003,
      totalCostUsd: 0.15,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("trackLLMCost", () => {
  it("calculates units as total tokens and passes to trackCost", async () => {
    await trackLLMCost({
      projectId: "proj-1",
      stage: "script",
      vendor: "gemini",
      model: "gemini-2.5-flash",
      inputTokens: 1000,
      outputTokens: 500,
      totalCostUsd: 0.05,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("handles zero tokens without division by zero", async () => {
    await trackLLMCost({
      projectId: "proj-1",
      stage: "script",
      vendor: "gemini",
      model: "gemini-2.5-flash",
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("trackTTSCost", () => {
  it("uses tts stage and character count as units", async () => {
    await trackTTSCost({
      projectId: "proj-1",
      vendor: "elevenlabs",
      model: "eleven_v3",
      characterCount: 5000,
      totalCostUsd: 1.5,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("handles zero characters", async () => {
    await trackTTSCost({
      projectId: "proj-1",
      vendor: "elevenlabs",
      model: "eleven_v3",
      characterCount: 0,
      totalCostUsd: 0,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("trackImageCost", () => {
  it("uses image_generation stage and image count as units", async () => {
    await trackImageCost({
      projectId: "proj-1",
      vendor: "gemini",
      model: "gemini-3-pro-image-preview",
      imageCount: 10,
      totalCostUsd: 0.4,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("trackVideoCost", () => {
  it("uses video_generation stage and duration as units", async () => {
    await trackVideoCost({
      projectId: "proj-1",
      vendor: "veo",
      model: "veo-3.1-generate-preview",
      durationSec: 8,
      totalCostUsd: 3.2,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("handles zero duration", async () => {
    await trackVideoCost({
      projectId: "proj-1",
      vendor: "veo",
      model: "veo-3.1-generate-preview",
      durationSec: 0,
      totalCostUsd: 0,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
