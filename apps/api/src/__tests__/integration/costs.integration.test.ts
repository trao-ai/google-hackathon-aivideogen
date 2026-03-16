import "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Costs API Integration", () => {
  // ─── GET /api/projects/:id/costs ────────────────────────────────────────────
  describe("GET /api/projects/:id/costs", () => {
    it("returns cost breakdown by stage", async () => {
      mockPrisma.costEvent.findMany.mockResolvedValue([
        { stage: "script", totalCostUsd: 0.005 },
        { stage: "script", totalCostUsd: 0.003 },
        { stage: "video_generation", totalCostUsd: 3.2 },
        { stage: "frame_generation", totalCostUsd: 0.08 },
      ]);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ durationSec: 60 });

      const res = await request(app).get("/api/projects/p1/costs").expect(200);

      expect(res.body.total).toBeCloseTo(3.288);
      expect(res.body.breakdown).toHaveLength(3);
      expect(res.body.costPerFinishedMinute).toBeDefined();
      expect(res.body.costPerFinishedMinute).toBeCloseTo(3.288);
    });

    it("returns zero total when no cost events", async () => {
      mockPrisma.costEvent.findMany.mockResolvedValue([]);
      mockPrisma.voiceover.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/projects/p1/costs").expect(200);

      expect(res.body.total).toBe(0);
      expect(res.body.breakdown).toHaveLength(0);
      expect(res.body.costPerFinishedMinute).toBeUndefined();
    });
  });

  // ─── POST /api/projects/:id/estimate-costs ─────────────────────────────────
  describe("POST /api/projects/:id/estimate-costs", () => {
    it("returns cost estimate based on scenes", async () => {
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", narrationStartSec: 0, narrationEndSec: 10, motionNotes: "" },
        { id: "sc2", narrationStartSec: 10, narrationEndSec: 20, motionNotes: "" },
      ]);

      const res = await request(app)
        .post("/api/projects/p1/estimate-costs")
        .send({ provider: "veo" })
        .expect(200);

      expect(res.body.total).toBeDefined();
      expect(res.body.sceneCount).toBe(2);
      expect(res.body.provider).toBe("veo");
    });

    it("returns zero estimate when no scenes", async () => {
      mockPrisma.scene.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/projects/p1/estimate-costs")
        .send({})
        .expect(200);

      expect(res.body.total).toBe(0);
      expect(res.body.message).toContain("No scenes");
    });

    it("defaults provider to kling", async () => {
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", narrationStartSec: 0, narrationEndSec: 10, motionNotes: "" },
      ]);

      const res = await request(app)
        .post("/api/projects/p1/estimate-costs")
        .send({})
        .expect(200);

      expect(res.body.provider).toBe("kling");
    });
  });
});
