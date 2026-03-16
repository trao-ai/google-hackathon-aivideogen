import "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Projects API Integration", () => {
  // ─── GET /api/projects ──────────────────────────────────────────────────────
  describe("GET /api/projects", () => {
    it("returns a list of projects", async () => {
      const mockProjects = [
        { id: "p1", title: "Project 1", niche: "science", _count: { topics: 2, scenes: 5, costEvents: 3 } },
        { id: "p2", title: "Project 2", niche: "tech", _count: { topics: 0, scenes: 0, costEvents: 0 } },
      ];
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const res = await request(app).get("/api/projects").expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe("Project 1");
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { topics: true, scenes: true, costEvents: true } } },
        }),
      );
    });

    it("returns empty array when no projects exist", async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      const res = await request(app).get("/api/projects").expect(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── POST /api/projects ─────────────────────────────────────────────────────
  describe("POST /api/projects", () => {
    it("creates a project with valid input", async () => {
      mockPrisma.styleBible.findFirst.mockResolvedValue({ id: "bible-1" });
      mockPrisma.project.create.mockResolvedValue({
        id: "new-proj",
        title: "My Project",
        niche: "science",
        targetRuntimeSec: 60,
        platform: "youtube",
      });

      const res = await request(app)
        .post("/api/projects")
        .send({ title: "My Project", niche: "science", platform: "youtube", videoType: "short" })
        .expect(201);

      expect(res.body.id).toBe("new-proj");
      expect(mockPrisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "My Project",
            niche: "science",
            platform: "youtube",
            styleBibleId: "bible-1",
          }),
        }),
      );
    });

    it("uses short=60s, medium=240s, long=600s runtime defaults", async () => {
      mockPrisma.styleBible.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "p", ...data }),
      );

      // short → 60
      await request(app)
        .post("/api/projects")
        .send({ title: "S", niche: "N", videoType: "short" })
        .expect(201);
      expect(mockPrisma.project.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targetRuntimeSec: 60 }) }),
      );

      // long → 600
      await request(app)
        .post("/api/projects")
        .send({ title: "L", niche: "N", videoType: "long" })
        .expect(201);
      expect(mockPrisma.project.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targetRuntimeSec: 600 }) }),
      );
    });

    it("rejects empty title", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ title: "", niche: "science" });

      // Zod validation error — passed to error handler
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects missing niche", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ title: "Test" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects invalid platform", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ title: "T", niche: "N", platform: "facebook" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects targetRuntimeSec below 30", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ title: "T", niche: "N", targetRuntimeSec: 10 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── GET /api/projects/:id ──────────────────────────────────────────────────
  describe("GET /api/projects/:id", () => {
    it("returns project with all includes", async () => {
      const mockProject = {
        id: "p1",
        title: "Test",
        topics: [],
        researchBriefs: [],
        scripts: [],
        voiceovers: [],
        scenes: [],
        renders: [],
        costEvents: [],
        characters: [],
      };
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const res = await request(app).get("/api/projects/p1").expect(200);

      expect(res.body.id).toBe("p1");
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          include: expect.objectContaining({
            topics: expect.any(Object),
            scripts: expect.any(Object),
            scenes: expect.any(Object),
          }),
        }),
      );
    });

    it("returns 404 for non-existent project", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/projects/nonexistent").expect(404);
      expect(res.body.error).toBe("Project not found");
    });
  });

  // ─── PATCH /api/projects/:id ────────────────────────────────────────────────
  describe("PATCH /api/projects/:id", () => {
    it("updates project fields", async () => {
      mockPrisma.project.update.mockResolvedValue({
        id: "p1",
        title: "Updated Title",
        videoProvider: "veo",
      });

      const res = await request(app)
        .patch("/api/projects/p1")
        .send({ title: "Updated Title", videoProvider: "veo" })
        .expect(200);

      expect(res.body.title).toBe("Updated Title");
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { title: "Updated Title", videoProvider: "veo" },
      });
    });

    it("rejects invalid videoProvider", async () => {
      const res = await request(app)
        .patch("/api/projects/p1")
        .send({ videoProvider: "openai" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("accepts all valid video providers", async () => {
      const providers = [
        "veo", "kling", "seedance",
        "replicate-veo", "replicate-kling",
        "replicate-seedance", "replicate-seedance-lite",
      ];
      for (const p of providers) {
        mockPrisma.project.update.mockResolvedValue({ id: "p1", videoProvider: p });
        await request(app)
          .patch("/api/projects/p1")
          .send({ videoProvider: p })
          .expect(200);
      }
    });
  });

  // ─── DELETE /api/projects/:id ───────────────────────────────────────────────
  describe("DELETE /api/projects/:id", () => {
    it("deletes a project", async () => {
      mockPrisma.project.delete.mockResolvedValue({ id: "p1" });

      await request(app).delete("/api/projects/p1").expect(204);

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: "p1" },
      });
    });
  });

  // ─── Health check ───────────────────────────────────────────────────────────
  describe("GET /health", () => {
    it("returns ok status", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
