import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Frames API Integration", () => {
  // ─── POST /api/projects/:id/generate-frames ────────────────────────────────
  describe("POST /api/projects/:id/generate-frames", () => {
    it("queues frame generation for all scenes", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", orderIndex: 0 },
        { id: "sc2", orderIndex: 1 },
        { id: "sc3", orderIndex: 2 },
      ]);
      mockPrisma.scene.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.project.update.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .post("/api/projects/p1/generate-frames")
        .expect(200);

      expect(res.body.jobCount).toBe(3);
      expect(mockQueueAdd).toHaveBeenCalledTimes(3);
      expect(mockPrisma.scene.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { frameStatus: "pending" },
        }),
      );
    });

    it("returns 400 if no scenes exist", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/projects/p1/generate-frames")
        .expect(400);

      expect(res.body.error).toContain("No scenes");
    });

    it("returns 404 if project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await request(app).post("/api/projects/nope/generate-frames").expect(404);
    });
  });

  // ─── POST /:projectId/scenes/:sceneId/generate-frames ─────────────────────
  describe("POST /:projectId/scenes/:sceneId/generate-frames", () => {
    it("queues frame generation for a single scene", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "p1",
        orderIndex: 0,
      });
      mockPrisma.scene.update.mockResolvedValue({ id: "sc1" });
      mockPrisma.sceneFrame.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-frames")
        .expect(200);

      expect(res.body.jobCount).toBe(1);
      // Deletes existing frames before fresh generation
      expect(mockPrisma.sceneFrame.deleteMany).toHaveBeenCalledWith({
        where: { sceneId: "sc1" },
      });
    });

    it("returns 400 if scene does not belong to project", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "other-project",
      });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-frames")
        .expect(400);

      expect(res.body.error).toContain("does not belong");
    });
  });

  // ─── GET /:projectId/scenes/:sceneId/frames ───────────────────────────────
  describe("GET /:projectId/scenes/:sceneId/frames", () => {
    it("returns frames for a scene", async () => {
      mockPrisma.sceneFrame.findMany.mockResolvedValue([
        { id: "f1", frameType: "start", imageUrl: "https://storage.example.com/start.png" },
        { id: "f2", frameType: "end", imageUrl: "https://storage.example.com/end.png" },
      ]);

      const res = await request(app)
        .get("/api/projects/p1/scenes/sc1/frames")
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  // ─── POST /:projectId/scenes/:sceneId/frames/:frameId/regenerate ──────────
  describe("POST /:projectId/scenes/:sceneId/frames/:frameId/regenerate", () => {
    it("queues frame regeneration with custom prompt", async () => {
      mockPrisma.sceneFrame.findUnique.mockResolvedValue({
        id: "f1",
        sceneId: "sc1",
        prompt: "original prompt",
      });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/frames/f1/regenerate")
        .send({ prompt: "new custom prompt" })
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "regenerate-single-frame",
        expect.objectContaining({
          frameId: "f1",
          prompt: "new custom prompt",
        }),
      );
    });

    it("uses existing prompt when no custom prompt provided", async () => {
      mockPrisma.sceneFrame.findUnique.mockResolvedValue({
        id: "f1",
        sceneId: "sc1",
        prompt: "original prompt",
      });

      await request(app)
        .post("/api/projects/p1/scenes/sc1/frames/f1/regenerate")
        .send({})
        .expect(200);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "regenerate-single-frame",
        expect.objectContaining({ prompt: "original prompt" }),
      );
    });

    it("returns 400 if frame does not belong to scene", async () => {
      mockPrisma.sceneFrame.findUnique.mockResolvedValue({
        id: "f1",
        sceneId: "other-scene",
      });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/frames/f1/regenerate")
        .expect(400);

      expect(res.body.error).toContain("does not belong");
    });
  });
});
