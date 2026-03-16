import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Renders API Integration", () => {
  // ─── POST /api/projects/:id/render ──────────────────────────────────────────
  describe("POST /api/projects/:id/render", () => {
    it("queues render when all prerequisites met", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(5);
      mockPrisma.sceneClip.count.mockResolvedValue(5);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });
      mockPrisma.render.create.mockResolvedValue({ id: "r1", status: "pending" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", status: "composition" });

      const res = await request(app)
        .post("/api/projects/p1/render")
        .send({})
        .expect(200);

      expect(res.body.renderId).toBe("r1");
      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "compose",
        expect.objectContaining({ projectId: "p1", renderId: "r1" }),
      );
    });

    it("passes durationLimitSec when provided", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(5);
      mockPrisma.sceneClip.count.mockResolvedValue(5);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });
      mockPrisma.render.create.mockResolvedValue({ id: "r1", status: "pending" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1" });

      await request(app)
        .post("/api/projects/p1/render")
        .send({ durationLimitSec: 30 })
        .expect(200);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "compose",
        expect.objectContaining({ durationLimitSec: 30 }),
      );
    });

    it("returns 400 if no scenes", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(0);
      mockPrisma.sceneClip.count.mockResolvedValue(0);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });

      const res = await request(app)
        .post("/api/projects/p1/render")
        .expect(400);

      expect(res.body.error).toContain("No scenes");
    });

    it("returns 400 if no video clips", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(5);
      mockPrisma.sceneClip.count.mockResolvedValue(0);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });

      const res = await request(app)
        .post("/api/projects/p1/render")
        .expect(400);

      expect(res.body.error).toContain("No video clips");
    });

    it("returns 400 if no voiceover", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(5);
      mockPrisma.sceneClip.count.mockResolvedValue(5);
      mockPrisma.voiceover.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/render")
        .expect(400);

      expect(res.body.error).toContain("No voiceover");
    });
  });

  // ─── GET /api/projects/:id/renders ──────────────────────────────────────────
  describe("GET /api/projects/:id/renders", () => {
    it("returns all renders for a project", async () => {
      mockPrisma.render.findMany.mockResolvedValue([
        { id: "r1", status: "complete" },
        { id: "r2", status: "pending" },
      ]);

      const res = await request(app).get("/api/projects/p1/renders").expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ─── GET /api/projects/:id/renders/:renderId ───────────────────────────────
  describe("GET /api/projects/:id/renders/:renderId", () => {
    it("returns a specific render", async () => {
      mockPrisma.render.findUnique.mockResolvedValue({
        id: "r1",
        status: "complete",
        videoUrl: "https://storage.example.com/render.mp4",
      });

      const res = await request(app)
        .get("/api/projects/p1/renders/r1")
        .expect(200);

      expect(res.body.status).toBe("complete");
    });

    it("returns 404 if render not found", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(null);

      await request(app).get("/api/projects/p1/renders/nope").expect(404);
    });
  });
});
