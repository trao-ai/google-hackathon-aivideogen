// ─── Shared mocks for all integration tests ────────────────────────────────
// better-auth modules are resolved via moduleNameMapper in jest.config.js

// Mock auth middleware — always passes, attaches test user
jest.mock("../../middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "test-user-id", email: "test@test.com", name: "Test" };
    req.session = { id: "test-session-id" };
    next();
  },
}));

// Mock auth lib
jest.mock("../../lib/auth", () => ({
  auth: {
    api: { getSession: jest.fn() },
  },
}));

// Mock @atlas/db
jest.mock("@atlas/db", () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    styleBible: { findFirst: jest.fn() },
    topic: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    channelProfile: { create: jest.fn() },
    researchBrief: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    script: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    scriptSection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    voiceover: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    scene: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sceneFrame: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    sceneClip: { count: jest.fn() },
    render: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    costEvent: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    captionSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    character: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    exportVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  trackLLMCost: jest.fn(),
  trackTTSCost: jest.fn(),
  trackImageCost: jest.fn(),
  trackVideoCost: jest.fn(),
}));

// Mock @atlas/integrations
jest.mock("@atlas/integrations", () => ({
  resolveStorageDir: jest.fn().mockReturnValue("/tmp/test-storage"),
  resolveUrlToLocalPath: jest.fn().mockReturnValue(null),
  createStorageProvider: jest.fn().mockReturnValue({
    upload: jest.fn().mockResolvedValue("https://storage.example.com/file"),
    download: jest.fn().mockResolvedValue(Buffer.alloc(100)),
    delete: jest.fn().mockResolvedValue(undefined),
  }),
  fetchElevenLabsVoices: jest.fn().mockResolvedValue([]),
  runAgent: jest.fn(),
  ELEVENLABS_TTS_MODEL: "eleven_multilingual_v2",
  ELEVENLABS_OUTPUT_FORMAT: "mp3_44100_128",
}));

// Mock @atlas/shared
jest.mock("@atlas/shared", () => ({
  calculateTTSCost: jest.fn().mockReturnValue(0.005),
  calculateLLMCost: jest.fn().mockReturnValue(0.001),
  calculateImageCost: jest.fn().mockReturnValue(0.04),
  calculateVideoCost: jest.fn().mockReturnValue(0.07),
}));

// Mock @atlas/cost-estimation
jest.mock("@atlas/cost-estimation", () => ({
  CostEstimator: {
    estimateScenes: jest.fn().mockReturnValue({
      frames: 0.5,
      videos: 2.0,
      motionEnrichment: 0.01,
      validation: 0.02,
      total: 2.53,
      perScene: [],
    }),
  },
}));

// Mock bullmq
const mockQueueAdd = jest.fn().mockResolvedValue({ id: "test-job-id" });
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockQueueAdd,
  })),
}));

// Mock queue service
jest.mock("../../services/queue", () => ({
  getRedisConnection: jest.fn().mockReturnValue({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
  }),
}));

export { mockQueueAdd };
