import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Topics API Integration", () => {
  // ─── POST /api/projects/:id/discover-topics ─────────────────────────────────
  describe("POST /api/projects/:id/discover-topics", () => {
    it("queues topic discovery and returns jobId", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", niche: "science" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", status: "topic_discovery" });

      const res = await request(app)
        .post("/api/projects/p1/discover-topics")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(res.body.message).toContain("Topic discovery");
      expect(mockQueueAdd).toHaveBeenCalledWith("discover", { projectId: "p1" });
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "topic_discovery" },
        }),
      );
    });

    it("returns 404 when project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/nonexistent/discover-topics")
        .expect(404);

      expect(res.body.error).toBe("Project not found");
    });
  });

  // ─── GET /api/projects/:id/topics ───────────────────────────────────────────
  describe("GET /api/projects/:id/topics", () => {
    it("returns topics sorted by opportunityScore", async () => {
      const mockTopics = [
        { id: "t1", title: "Topic 1", opportunityScore: 90 },
        { id: "t2", title: "Topic 2", opportunityScore: 75 },
      ];
      mockPrisma.topic.findMany.mockResolvedValue(mockTopics);

      const res = await request(app).get("/api/projects/p1/topics").expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].opportunityScore).toBe(90);
      expect(mockPrisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: "p1" },
          orderBy: [{ opportunityScore: "desc" }, { id: "asc" }],
        }),
      );
    });
  });

  // ─── POST /api/projects/:projectId/topics/:topicId/approve ──────────────────
  describe("POST /:projectId/topics/:topicId/approve", () => {
    it("approves topic and updates project", async () => {
      mockPrisma.topic.update.mockResolvedValue({
        id: "t1",
        title: "Mars Habitats",
        status: "approved",
      });
      mockPrisma.project.update.mockResolvedValue({
        id: "p1",
        selectedTopicId: "t1",
        status: "topic_selected",
      });

      const res = await request(app)
        .post("/api/projects/p1/topics/t1/approve")
        .expect(200);

      expect(res.body.status).toBe("approved");
      expect(mockPrisma.topic.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "approved" },
      });
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            selectedTopicId: "t1",
            status: "topic_selected",
            title: "Mars Habitats",
          }),
        }),
      );
    });
  });

  // ─── POST /api/projects/:projectId/topics/:topicId/reject ──────────────────
  describe("POST /:projectId/topics/:topicId/reject", () => {
    it("rejects a topic", async () => {
      mockPrisma.topic.update.mockResolvedValue({ id: "t1", status: "rejected" });

      const res = await request(app)
        .post("/api/projects/p1/topics/t1/reject")
        .expect(200);

      expect(res.body.status).toBe("rejected");
    });
  });

  // ─── POST /api/projects/:id/channels ────────────────────────────────────────
  describe("POST /:id/channels", () => {
    it("creates channel profile and queues analysis", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.channelProfile.create.mockResolvedValue({
        id: "cp1",
        channelName: "Kurzgesagt",
        channelUrl: "https://youtube.com/@kurzgesagt",
      });

      const res = await request(app)
        .post("/api/projects/p1/channels")
        .send({
          channelName: "Kurzgesagt",
          channelUrl: "https://youtube.com/@kurzgesagt",
        })
        .expect(201);

      expect(res.body.id).toBe("cp1");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "analyze",
        expect.objectContaining({ projectId: "p1", channelProfileId: "cp1" }),
      );
    });

    it("rejects missing channelName", async () => {
      const res = await request(app)
        .post("/api/projects/p1/channels")
        .send({ channelUrl: "https://youtube.com/@test" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects invalid channelUrl", async () => {
      const res = await request(app)
        .post("/api/projects/p1/channels")
        .send({ channelName: "Test", channelUrl: "not-a-url" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("returns 404 when project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/nope/channels")
        .send({
          channelName: "Test",
          channelUrl: "https://youtube.com/@test",
        })
        .expect(404);

      expect(res.body.error).toBe("Project not found");
    });
  });
});
