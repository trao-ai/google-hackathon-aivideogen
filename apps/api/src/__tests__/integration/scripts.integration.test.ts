import "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";
import { runAgent } from "@atlas/integrations";

const mockPrisma = prisma as any;
const mockRunAgent = runAgent as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("Scripts API Integration", () => {
  // ─── POST /api/projects/:id/generate-scripts ───────────────────────────────
  describe("POST /api/projects/:id/generate-scripts", () => {
    const mockProject = {
      id: "p1",
      niche: "space",
      selectedTopicId: "t1",
      videoType: "long",
      platform: "youtube",
      videoStyle: null,
      toneKeywords: ["dramatic"],
      topics: [{ id: "t1", title: "Mars Underground Cities", status: "approved" }],
    };

    const mockBrief = {
      id: "b1",
      summary: "Research on Mars habitation",
      background: "Background info",
      currentDevelopments: "Latest developments",
      keyFacts: ["Fact 1", "Fact 2"],
      controversies: "Some debate",
      stakes: "Future of humanity",
      storyAngles: ["Angle 1", "Angle 2"],
      sources: [{ title: "Source 1", url: "https://example.com", year: 2024 }],
    };

    it("generates a script and returns it", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.researchBrief.findFirst.mockResolvedValue(mockBrief);
      mockRunAgent.mockResolvedValue({
        content: JSON.stringify({
          titleCandidates: ["Title 1"],
          thumbnailAngles: ["Angle 1"],
          estimatedDurationSec: 270,
          wordCount: 650,
          sections: [
            { sectionType: "cold_open", text: "Opening text...", estimatedDurationSec: 30, wordCount: 75 },
            { sectionType: "hook", text: "Hook text...", estimatedDurationSec: 20, wordCount: 50 },
          ],
        }),
        model: "gemini-2.5-flash",
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.005,
      });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", status: "script_selected" });
      mockPrisma.script.create.mockResolvedValue({
        id: "s1",
        fullText: "Opening text...\n\nHook text...",
        sections: [
          { id: "sec1", sectionType: "cold_open", text: "Opening text..." },
          { id: "sec2", sectionType: "hook", text: "Hook text..." },
        ],
      });

      const res = await request(app)
        .post("/api/projects/p1/generate-scripts")
        .send({})
        .expect(200);

      expect(res.body.id).toBe("s1");
      expect(mockRunAgent).toHaveBeenCalled();
      expect(mockPrisma.script.create).toHaveBeenCalled();
    });

    it("returns 404 if project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/nope/generate-scripts")
        .expect(404);

      expect(res.body.error).toBe("Project not found");
    });

    it("returns 400 if no topic approved", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        selectedTopicId: null,
        topics: [],
      });

      const res = await request(app)
        .post("/api/projects/p1/generate-scripts")
        .expect(400);

      expect(res.body.error).toContain("No approved topic");
    });

    it("returns 400 if no research brief", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.researchBrief.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/projects/p1/generate-scripts")
        .expect(400);

      expect(res.body.error).toContain("No research brief");
    });
  });

  // ─── GET /api/projects/:id/scripts ──────────────────────────────────────────
  describe("GET /api/projects/:id/scripts", () => {
    it("returns all scripts for a project", async () => {
      mockPrisma.script.findMany.mockResolvedValue([
        { id: "s1", status: "draft", sections: [] },
        { id: "s2", status: "approved", sections: [] },
      ]);

      const res = await request(app).get("/api/projects/p1/scripts").expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ─── POST /:projectId/scripts/:scriptId/approve ────────────────────────────
  describe("POST /:projectId/scripts/:scriptId/approve", () => {
    it("approves script via transaction", async () => {
      mockPrisma.$transaction.mockResolvedValue([
        { id: "s1", status: "approved" },
        { id: "p1", selectedScriptId: "s1", status: "script_selected" },
      ]);

      const res = await request(app)
        .post("/api/projects/p1/scripts/s1/approve")
        .expect(200);

      expect(res.body.message).toBe("Script approved");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── DELETE /:projectId/scripts/:scriptId ──────────────────────────────────
  describe("DELETE /:projectId/scripts/:scriptId", () => {
    it("deletes script and rolls back status if selected", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        selectedScriptId: "s1",
      });
      mockPrisma.voiceover.findMany.mockResolvedValue([]);
      mockPrisma.voiceover.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.script.delete.mockResolvedValue({ id: "s1" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", selectedScriptId: null });

      await request(app).delete("/api/projects/p1/scripts/s1").expect(204);

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { selectedScriptId: null, status: "research_done" },
        }),
      );
    });

    it("returns 404 if project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/projects/nope/scripts/s1")
        .expect(404);

      expect(res.body.error).toBe("Project not found");
    });
  });

  // ─── POST /:projectId/scripts/:scriptId/rewrite-section ────────────────────
  describe("POST /:projectId/scripts/:scriptId/rewrite-section", () => {
    it("returns 400 if sectionId or instructions missing", async () => {
      const res = await request(app)
        .post("/api/projects/p1/scripts/s1/rewrite-section")
        .send({})
        .expect(400);

      expect(res.body.error).toContain("sectionId and instructions are required");
    });
  });
});
