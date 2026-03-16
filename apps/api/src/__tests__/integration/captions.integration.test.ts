import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Captions API Integration", () => {
  // ─── GET /api/projects/:id/captions ─────────────────────────────────────────
  describe("GET /api/projects/:id/captions", () => {
    it("returns existing caption settings", async () => {
      const settings = {
        projectId: "p1",
        font: "Arial",
        fontSize: 7,
        textColor: "#FFFFFF",
        position: "bottom",
        burnInCaptions: true,
      };
      mockPrisma.captionSettings.findUnique.mockResolvedValue(settings);

      const res = await request(app).get("/api/projects/p1/captions").expect(200);
      expect(res.body.font).toBe("Arial");
      expect(res.body.burnInCaptions).toBe(true);
    });

    it("creates default settings if none exist", async () => {
      mockPrisma.captionSettings.findUnique.mockResolvedValue(null);
      mockPrisma.captionSettings.create.mockResolvedValue({
        projectId: "p1",
        font: "Arial",
        fontSize: 7,
        textColor: "#FFFFFF",
        textOpacity: 100,
        bgColor: "#000000",
        bgOpacity: 80,
        position: "bottom",
        template: "standard",
        highlightKeywords: false,
        targetLanguage: "en",
        burnInCaptions: true,
      });

      const res = await request(app).get("/api/projects/p1/captions").expect(200);
      expect(res.body.font).toBe("Arial");
      expect(mockPrisma.captionSettings.create).toHaveBeenCalled();
    });
  });

  // ─── PUT /api/projects/:id/captions ─────────────────────────────────────────
  describe("PUT /api/projects/:id/captions", () => {
    it("upserts caption settings", async () => {
      mockPrisma.captionSettings.upsert.mockResolvedValue({
        projectId: "p1",
        font: "Montserrat",
        fontSize: 10,
        position: "top",
      });

      const res = await request(app)
        .put("/api/projects/p1/captions")
        .send({ font: "Montserrat", fontSize: 10, position: "top" })
        .expect(200);

      expect(res.body.font).toBe("Montserrat");
      expect(mockPrisma.captionSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: "p1" } }),
      );
    });
  });

  // ─── POST /api/projects/:id/captions/regenerate ────────────────────────────
  describe("POST /api/projects/:id/captions/regenerate", () => {
    it("queues caption regeneration", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });

      const res = await request(app)
        .post("/api/projects/p1/captions/regenerate")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith("regenerate", {
        projectId: "p1",
        voiceoverId: "vo1",
      });
    });

    it("returns 400 if no voiceover", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.voiceover.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/captions/regenerate")
        .expect(400);

      expect(res.body.error).toContain("No voiceover");
    });
  });

  // ─── POST /api/projects/:id/captions/translate ─────────────────────────────
  describe("POST /api/projects/:id/captions/translate", () => {
    it("queues translation job", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.render.findFirst.mockResolvedValue({
        id: "r1",
        subtitleUrl: "https://storage.example.com/subs.ass",
      });
      mockPrisma.captionSettings.upsert.mockResolvedValue({ targetLanguage: "es" });

      const res = await request(app)
        .post("/api/projects/p1/captions/translate")
        .send({ targetLanguage: "es" })
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
    });

    it("returns 400 if targetLanguage missing", async () => {
      const res = await request(app)
        .post("/api/projects/p1/captions/translate")
        .send({})
        .expect(400);

      expect(res.body.error).toContain("targetLanguage");
    });

    it("returns 400 if no subtitles exist", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.render.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/captions/translate")
        .send({ targetLanguage: "fr" })
        .expect(400);

      expect(res.body.error).toContain("No subtitles");
    });
  });

  // ─── POST /api/projects/:id/captions/apply ─────────────────────────────────
  describe("POST /api/projects/:id/captions/apply", () => {
    it("creates render with caption settings", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.captionSettings.findUnique.mockResolvedValue({
        font: "Arial",
        fontSize: 7,
        textColor: "#FFFFFF",
        textOpacity: 100,
        bgColor: "#000000",
        bgOpacity: 80,
        position: "bottom",
        burnInCaptions: true,
      });
      mockPrisma.scene.count.mockResolvedValue(5);
      mockPrisma.sceneClip.count.mockResolvedValue(5);
      mockPrisma.voiceover.findFirst.mockResolvedValue({ id: "vo1" });
      mockPrisma.render.create.mockResolvedValue({ id: "r1", status: "pending" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .post("/api/projects/p1/captions/apply")
        .expect(200);

      expect(res.body.renderId).toBe("r1");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "compose",
        expect.objectContaining({
          captionSettings: expect.objectContaining({ font: "Arial" }),
        }),
      );
    });

    it("returns 400 if no caption settings", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.captionSettings.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/captions/apply")
        .expect(400);

      expect(res.body.error).toContain("No caption settings");
    });
  });
});
