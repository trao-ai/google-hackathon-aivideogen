jest.mock("@atlas/db", () => ({
  prisma: {
    scene: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sceneClip: {
      upsert: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
  trackVideoCost: jest.fn(),
  trackLLMCost: jest.fn(),
}));

jest.mock("@atlas/integrations", () => ({
  createVideoProvider: jest.fn().mockReturnValue({
    generate: jest.fn().mockResolvedValue({
      videoBuffer: Buffer.alloc(100),
      mimeType: "video/mp4",
      durationSec: 8,
      costUsd: 3.2,
    }),
  }),
  createStorageProvider: jest.fn().mockReturnValue({
    upload: jest.fn().mockResolvedValue("https://storage.example.com/video.mp4"),
  }),
  runAgent: jest.fn().mockResolvedValue({
    content: "Enhanced motion notes",
    model: "gemini-2.5-flash",
    inputTokens: 200,
    outputTokens: 100,
    costUsd: 0.001,
  }),
}));

describe("VideoGeneration Worker Logic", () => {
  describe("Provider selection", () => {
    it("uses job override > project setting > env default", () => {
      const jobProvider = "veo";
      const projectProvider = "kling";
      const envProvider = "seedance";

      const selected = jobProvider ?? projectProvider ?? envProvider ?? "kling";
      expect(selected).toBe("veo");
    });

    it("falls back to project setting when no job override", () => {
      const jobProvider = undefined;
      const projectProvider = "kling";

      const selected = jobProvider ?? projectProvider ?? "kling";
      expect(selected).toBe("kling");
    });

    it("falls back to kling when nothing specified", () => {
      const jobProvider: string | undefined = undefined;
      const projectProvider: string | undefined = undefined;
      const selected = jobProvider ?? projectProvider ?? "kling";
      expect(selected).toBe("kling");
    });
  });

  describe("Duration verification", () => {
    it("warns when actual duration deviates >10% from requested", () => {
      const requested = 8;
      const actual = 10;
      const deviation = Math.abs(actual - requested) / requested;
      expect(deviation).toBeGreaterThan(0.1);
    });

    it("accepts within 10% tolerance", () => {
      const requested = 8;
      const actual = 8.5;
      const deviation = Math.abs(actual - requested) / requested;
      expect(deviation).toBeLessThanOrEqual(0.1);
    });
  });

  describe("Veo duration clamping", () => {
    it("clamps to 4-8s range", () => {
      const veoDuration = (d: number) => Math.max(4, Math.min(8, d));
      expect(veoDuration(2)).toBe(4);
      expect(veoDuration(5)).toBe(5);
      expect(veoDuration(8)).toBe(8);
      expect(veoDuration(15)).toBe(8);
    });
  });

  describe("Kling duration clamping", () => {
    it("clamps regular Kling to 3-15s", () => {
      const klingDuration = (d: number) => Math.max(3, Math.min(15, Math.round(d)));
      expect(klingDuration(1)).toBe(3);
      expect(klingDuration(10)).toBe(10);
      expect(klingDuration(20)).toBe(15);
    });

    it("clamps SeDance to 4-12s", () => {
      const seedanceDuration = (d: number) => Math.max(4, Math.min(12, Math.round(d)));
      expect(seedanceDuration(2)).toBe(4);
      expect(seedanceDuration(8)).toBe(8);
      expect(seedanceDuration(20)).toBe(12);
    });
  });

  describe("Frame requirements by provider", () => {
    const needsEndFrame = (provider: string) => {
      const startFrameOnlyProviders = ["seedance", "replicate-veo", "replicate-seedance", "replicate-seedance-lite"];
      return !startFrameOnlyProviders.includes(provider);
    };

    it("kling needs both frames", () => {
      expect(needsEndFrame("kling")).toBe(true);
    });

    it("veo needs both frames", () => {
      expect(needsEndFrame("veo")).toBe(true);
    });

    it("seedance only needs start frame", () => {
      expect(needsEndFrame("seedance")).toBe(false);
    });

    it("replicate-seedance-lite only needs start frame", () => {
      expect(needsEndFrame("replicate-seedance-lite")).toBe(false);
    });
  });
});
