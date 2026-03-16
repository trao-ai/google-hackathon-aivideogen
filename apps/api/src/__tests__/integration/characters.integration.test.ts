import "./setup";
import { mockQueueAdd } from "./setup";
import request from "supertest";
import app from "../../app";
import { prisma } from "@atlas/db";

const mockPrisma = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("Characters API Integration", () => {
  // ─── GET /api/projects/:id/characters ───────────────────────────────────────
  describe("GET /api/projects/:id/characters", () => {
    it("returns all characters for a project", async () => {
      mockPrisma.character.findMany.mockResolvedValue([
        { id: "ch1", name: "Dr. Nova", appearance: "Illustration" },
      ]);

      const res = await request(app).get("/api/projects/p1/characters").expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Dr. Nova");
    });
  });

  // ─── POST /api/projects/:id/characters/generate ────────────────────────────
  describe("POST /api/projects/:id/characters/generate", () => {
    it("creates character and queues generation", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.character.create.mockResolvedValue({
        id: "ch1",
        name: "Nova",
        gender: "Female",
        appearance: "Illustration",
        transparentBg: true,
      });
      mockPrisma.character.count.mockResolvedValue(1); // first character

      const res = await request(app)
        .post("/api/projects/p1/characters/generate")
        .send({
          name: "Nova",
          gender: "Female",
          appearance: "Illustration",
          transparentBg: true,
        })
        .expect(200);

      expect(res.body.characterId).toBe("ch1");
      expect(res.body.jobId).toBe("test-job-id");

      // Auto-selects first character
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { selectedCharacterId: "ch1" },
        }),
      );
    });

    it("does NOT auto-select if not first character", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.character.create.mockResolvedValue({ id: "ch2", name: "Bot" });
      mockPrisma.character.count.mockResolvedValue(2); // not first

      await request(app)
        .post("/api/projects/p1/characters/generate")
        .send({ name: "Bot" })
        .expect(200);

      // project.update should NOT be called for character selection
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });

    it("returns 404 if project not found", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await request(app)
        .post("/api/projects/nope/characters/generate")
        .send({ name: "X" })
        .expect(404);
    });
  });

  // ─── PUT /api/projects/:id/characters/:charId ──────────────────────────────
  describe("PUT /api/projects/:id/characters/:charId", () => {
    it("updates character fields", async () => {
      mockPrisma.character.update.mockResolvedValue({
        id: "ch1",
        name: "Updated Name",
        emotion: "Excited",
      });

      const res = await request(app)
        .put("/api/projects/p1/characters/ch1")
        .send({ name: "Updated Name", emotion: "Excited" })
        .expect(200);

      expect(res.body.name).toBe("Updated Name");
    });
  });

  // ─── POST /api/projects/:id/characters/:charId/select ─────────────────────
  describe("POST /api/projects/:id/characters/:charId/select", () => {
    it("selects a character for the project", async () => {
      mockPrisma.character.findUnique.mockResolvedValue({ id: "ch1" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1", selectedCharacterId: "ch1" });

      const res = await request(app)
        .post("/api/projects/p1/characters/ch1/select")
        .expect(200);

      expect(res.body.message).toBe("Character selected");
    });

    it("returns 404 if character not found", async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      await request(app)
        .post("/api/projects/p1/characters/nope/select")
        .expect(404);
    });
  });

  // ─── DELETE /api/projects/:id/characters/:charId ───────────────────────────
  describe("DELETE /api/projects/:id/characters/:charId", () => {
    it("deletes character and clears selection if selected", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        selectedCharacterId: "ch1",
      });
      mockPrisma.character.delete.mockResolvedValue({ id: "ch1" });
      mockPrisma.project.update.mockResolvedValue({ id: "p1" });

      await request(app).delete("/api/projects/p1/characters/ch1").expect(204);

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { selectedCharacterId: null },
        }),
      );
    });

    it("deletes character without clearing selection if not selected", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        selectedCharacterId: "other-char",
      });
      mockPrisma.character.delete.mockResolvedValue({ id: "ch1" });

      await request(app).delete("/api/projects/p1/characters/ch1").expect(204);

      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });
  });

  // ─── POST /api/projects/:id/characters/:charId/regenerate ─────────────────
  describe("POST /api/projects/:id/characters/:charId/regenerate", () => {
    it("queues regeneration for existing character", async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: "ch1",
        prompt: "blue creature",
        gender: "Male",
        ageStyle: "Young",
        emotion: "Happy",
        appearance: "3D Avatar",
        transparentBg: false,
      });

      const res = await request(app)
        .post("/api/projects/p1/characters/ch1/regenerate")
        .expect(200);

      expect(res.body.jobId).toBe("test-job-id");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "generate",
        expect.objectContaining({
          characterId: "ch1",
          gender: "Male",
          appearance: "3D Avatar",
        }),
      );
    });
  });
});
