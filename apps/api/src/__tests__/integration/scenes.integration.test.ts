import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Scenes API Integration", () => {
  // ─── POST /api/projects/:id/plan-scenes ─────────────────────────────────────
  describe("POST /api/projects/:id/plan-scenes", () => {
    it("queues scene planning", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1", projectId: "p1" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", status: "scene_planning" });

      const res = await request(app)
        .post("/api/projects/p1/plan-scenes")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith("plan", {
        projectId: "p1",
        voiceoverId: "vo1",
      });
    });

    it("returns 404 if project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await request(app).post("/api/projects/nope/plan-scenes").expect(404);
    });

    it("returns 400 if no voiceover", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.voiceover.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/plan-scenes")
        .expect(400);

      expect(res.body.error).toContain("No voiceover");
    });
  });

  // ─── GET /api/projects/:id/scenes ───────────────────────────────────────────
  describe("GET /api/projects/:id/scenes", () => {
    it("returns scenes with frames and clips", async () => {
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", orderIndex: 0, frames: [{ id: "f1" }], clip: { id: "c1" } },
        { id: "sc2", orderIndex: 1, frames: [], clip: null },
      ]);

      const res = await request(app).get("/api/projects/p1/scenes").expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].frames).toHaveLength(1);
    });
  });

  // ─── POST /:projectId/scenes/:sceneId/generate-video ───────────────────────
  describe("POST /:projectId/scenes/:sceneId/generate-video", () => {
    it("queues video generation when frames exist", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "p1",
        frames: [
          { id: "f1", frameType: "start" },
          { id: "f2", frameType: "end" },
        ],
      });
      mockPrisma.project.findUnique.mockResolvedValue({ videoProvider: "kling" });
      mockPrisma.scene.update.mockResolvedValue({ id: "sc1" });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-video")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "generate",
        expect.objectContaining({ projectId: "p1", sceneId: "sc1" }),
      );
    });

    it("returns 400 if no start frame", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "p1",
        frames: [],
      });
      mockPrisma.project.findUnique.mockResolvedValue({ videoProvider: "kling" });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-video")
        .expect(400);

      expect(res.body.error).toContain("start frame");
    });

    it("allows seedance with only start frame (no end frame needed)", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "p1",
        frames: [{ id: "f1", frameType: "start" }],
      });
      mockPrisma.project.findUnique.mockResolvedValue({ videoProvider: "seedance" });
      mockPrisma.scene.update.mockResolvedValue({ id: "sc1" });

      await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-video")
        .expect(200);
    });

    it("returns 400 for kling with only start frame (needs end frame)", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "p1",
        frames: [{ id: "f1", frameType: "start" }],
      });
      mockPrisma.project.findUnique.mockResolvedValue({ videoProvider: "kling" });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-video")
        .expect(400);

      expect(res.body.error).toContain("both start and end frames");
    });

    it("returns 400 if scene does not belong to project", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: "sc1",
        projectId: "other-project",
        frames: [{ frameType: "start" }, { frameType: "end" }],
      });
      mockPrisma.project.findUnique.mockResolvedValue({ videoProvider: "kling" });

      const res = await request(app)
        .post("/api/projects/p1/scenes/sc1/generate-video")
        .expect(400);

      expect(res.body.error).toContain("does not belong");
    });
  });

  // ─── POST /api/projects/:id/generate-videos ────────────────────────────────
  describe("POST /api/projects/:id/generate-videos", () => {
    it("queues video generation for all ready scenes", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        videoProvider: "veo",
      });
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", frames: [{ frameType: "start" }, { frameType: "end" }] },
        { id: "sc2", frames: [{ frameType: "start" }, { frameType: "end" }] },
        { id: "sc3", frames: [] },  // not ready
      ]);
      mockPrisma.scene.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.project.update.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .post("/api/projects/p1/generate-videos")
        .expect(200);

      expect(res.body.jobCount).toBe(2);
      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
    });

    it("returns 400 if no scenes have frames", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", videoProvider: "kling" });
      mockPrisma.scene.findMany.mockResolvedValue([
        { id: "sc1", frames: [] },
      ]);

      const res = await request(app)
        .post("/api/projects/p1/generate-videos")
        .expect(400);

      expect(res.body.error).toContain("frames");
    });
  });

  // ─── PATCH /:projectId/scenes/:sceneId/motion ──────────────────────────────
  describe("PATCH /:projectId/scenes/:sceneId/motion", () => {
    it("updates motion notes", async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({ id: "sc1", projectId: "p1" });
      mockPrisma.scene.update.mockResolvedValue({
        id: "sc1",
        motionNotes: "Slow zoom in",
        frames: [],
        clip: null,
      });

      const res = await request(app)
        .patch("/api/projects/p1/scenes/sc1/motion")
        .send({ motionNotes: "Slow zoom in" })
        .expect(200);

      expect(res.body.motionNotes).toBe("Slow zoom in");
    });
  });

  // ─── POST /api/projects/:id/plan-transitions ───────────────────────────────
  describe("POST /api/projects/:id/plan-transitions", () => {
    it("queues transition planning with >=2 scenes", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(5);

      const res = await request(app)
        .post("/api/projects/p1/plan-transitions")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
    });

    it("returns 400 with <2 scenes", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.scene.count.mockResolvedValue(1);

      const res = await request(app)
        .post("/api/projects/p1/plan-transitions")
        .expect(400);

      expect(res.body.error).toContain("at least 2 scenes");
    });
  });
});
