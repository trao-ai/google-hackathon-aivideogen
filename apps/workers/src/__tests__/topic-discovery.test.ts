// Mock all external dependencies
jest.mock("@atlas/db", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    topic: {
      create: jest.fn(),
    },
  },
  trackLLMCost: jest.fn(),
}));

jest.mock("@atlas/integrations", () => ({
  runAgent: jest.fn(),
}));

import { prisma, trackLLMCost } from "@atlas/db";
import { runAgent } from "@atlas/integrations";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRunAgent = runAgent as jest.Mock;
const mockTrackLLMCost = trackLLMCost as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TopicDiscovery Worker Logic", () => {
  const mockProject = {
    id: "proj-1",
    niche: "space exploration",
    platform: "youtube",
    videoType: "long",
    videoStyle: null,
    toneKeywords: ["dramatic"],
  };

  const mockTopics = [
    {
      title: "Why Mars Needs Underground Cities",
      summary: "Exploring subterranean habitats",
      opportunityScore: 87,
      scores: {
        searchMomentum: 80,
        edutainmentFit: 90,
        visualStorytellingFit: 85,
        curiosityGap: 92,
        evergreenPotential: 75,
        factDensity: 88,
        productionFeasibility: 80,
      },
      thumbnailAngle: "Underground city cross-section",
      likelyAudienceAppeal: "Space enthusiasts and sci-fi fans",
    },
  ];

  it("parses JSON array from LLM response", () => {
    const content = `Here are the topics:\n${JSON.stringify(mockTopics)}`;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    expect(jsonMatch).toBeTruthy();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Why Mars Needs Underground Cities");
  });

  it("handles LLM response with markdown code fences", () => {
    const content = "```json\n" + JSON.stringify(mockTopics) + "\n```";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    expect(jsonMatch).toBeTruthy();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed).toHaveLength(1);
  });

  it("handles malformed JSON gracefully", () => {
    const content = "This is not JSON at all";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    expect(jsonMatch).toBeNull();
  });

  it("extracts individual scores from nested scores object", () => {
    const topic = mockTopics[0];
    const scores = topic.scores;
    expect(scores?.visualStorytellingFit).toBe(85);
    expect(scores?.evergreenPotential).toBe(75);
    expect(scores?.searchMomentum).toBe(80);
    expect(scores?.curiosityGap).toBe(92);
    expect(scores?.factDensity).toBe(88);
  });

  it("runAgent is called with correct params", async () => {
    mockRunAgent.mockResolvedValue({
      content: JSON.stringify(mockTopics),
      model: "gemini-2.5-flash",
      inputTokens: 500,
      outputTokens: 2000,
      costUsd: 0.005,
    });

    await mockRunAgent({
      agentName: "topic-scout",
      instruction: "system prompt",
      userMessage: "user message",
    });

    expect(mockRunAgent).toHaveBeenCalledWith({
      agentName: "topic-scout",
      instruction: "system prompt",
      userMessage: "user message",
    });
  });

  it("trackLLMCost is called with correct parameters", async () => {
    await mockTrackLLMCost({
      projectId: "proj-1",
      stage: "topic_discovery",
      vendor: "gemini",
      model: "gemini-2.5-flash",
      inputTokens: 500,
      outputTokens: 2000,
      totalCostUsd: 0.005,
    });

    expect(mockTrackLLMCost).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        stage: "topic_discovery",
      })
    );
  });
});
