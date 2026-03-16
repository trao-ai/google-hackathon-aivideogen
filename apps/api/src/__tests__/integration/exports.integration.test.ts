import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Exports API Integration", () => {
  // ─── POST /:id/renders/:renderId/export ─────────────────────────────────────
  describe("POST /:id/renders/:renderId/export", () => {
    const mockRender = {
      id: "r1",
      projectId: "p1",
      status: "complete",
      videoUrl: "https://storage.example.com/render.mp4",
    };

    it("queues export job with valid params", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(mockRender);
      mockPrisma.exportVariant.create.mockResolvedValue({
        id: "ev1",
        format: "webm",
        resolution: "720p",
        quality: "standard",
        status: "pending",
      });

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({ format: "webm", resolution: "720p", quality: "standard" })
        .expect(200);

      expect(res.body.exportId).toBe("ev1");
      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "transcode",
        expect.objectContaining({ format: "webm", resolution: "720p" }),
      );
    });

    it("defaults to mp4/1080p/high", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(mockRender);
      mockPrisma.exportVariant.create.mockResolvedValue({
        id: "ev1",
        format: "mp4",
        resolution: "1080p",
        quality: "high",
        status: "pending",
      });

      await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({})
        .expect(200);

      expect(mockPrisma.exportVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          format: "mp4",
          resolution: "1080p",
          quality: "high",
        }),
      });
    });

    it("returns 400 for invalid format", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(mockRender);

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({ format: "avi" })
        .expect(400);

      expect(res.body.error).toContain("Invalid format");
    });

    it("returns 400 for invalid resolution", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(mockRender);

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({ resolution: "8k" })
        .expect(400);

      expect(res.body.error).toContain("Invalid resolution");
    });

    it("returns 400 for invalid quality", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(mockRender);

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({ quality: "potato" })
        .expect(400);

      expect(res.body.error).toContain("Invalid quality");
    });

    it("returns 404 if render not found", async () => {
      mockPrisma.render.findUnique.mockResolvedValue(null);

      await request(app)
        .post("/api/projects/p1/renders/nope/export")
        .send({})
        .expect(404);
    });

    it("returns 404 if render belongs to different project", async () => {
      mockPrisma.render.findUnique.mockResolvedValue({
        ...mockRender,
        projectId: "other-project",
      });

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({})
        .expect(404);

      expect(res.body.error).toContain("not found for this project");
    });

    it("returns 400 if render not complete", async () => {
      mockPrisma.render.findUnique.mockResolvedValue({
        ...mockRender,
        status: "pending",
        videoUrl: null,
      });

      const res = await request(app)
        .post("/api/projects/p1/renders/r1/export")
        .send({})
        .expect(400);

      expect(res.body.error).toContain("complete");
    });
  });

  // ─── GET /:id/renders/:renderId/exports ─────────────────────────────────────
  describe("GET /:id/renders/:renderId/exports", () => {
    it("returns export variants with BigInt serialized", async () => {
      mockPrisma.exportVariant.findMany.mockResolvedValue([
        { id: "ev1", format: "mp4", status: "complete", fileSizeBytes: BigInt(1024000) },
        { id: "ev2", format: "webm", status: "pending", fileSizeBytes: null },
      ]);

      const res = await request(app)
        .get("/api/projects/p1/renders/r1/exports")
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].fileSizeBytes).toBe(1024000);
      expect(res.body[1].fileSizeBytes).toBeNull();
    });
  });
});
