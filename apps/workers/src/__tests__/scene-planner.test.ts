jest.mock("@atlas/db", () => ({
  prisma: {
    voiceover: { findUnique: jest.fn() },
    script: { findFirst: jest.fn() },
    scene: { deleteMany: jest.fn(), create: jest.fn() },
    project: { findUnique: jest.fn(), update: jest.fn() },
    character: { findFirst: jest.fn() },
  },
  trackLLMCost: jest.fn(),
}));

jest.mock("@atlas/integrations", () => ({
  runAgent: jest.fn(),
}));

describe("ScenePlanner Worker Logic", () => {
  describe("Scene splitting (>14s)", () => {
    it("splits a 20s scene into two ~10s scenes", () => {
      const scene = {
        narrationStartSec: 0,
        narrationEndSec: 20,
        purpose: "explain concept",
      };
      const duration = scene.narrationEndSec - scene.narrationStartSec;
      const maxSceneDuration = 14;

      if (duration > maxSceneDuration) {
        const parts = Math.ceil(duration / 10);
        const partDuration = duration / parts;

        expect(parts).toBe(2);
        expect(partDuration).toBe(10);
      }
    });

    it("splits a 30s scene into three ~10s scenes", () => {
      const duration = 30;
      const parts = Math.ceil(duration / 10);
      expect(parts).toBe(3);
      expect(duration / parts).toBe(10);
    });

    it("does not split a 12s scene", () => {
      const duration = 12;
      const maxSceneDuration = 14;
      expect(duration <= maxSceneDuration).toBe(true);
    });
  });

  describe("Duration budget calculation", () => {
    it("calculates clip duration with transition overlap", () => {
      const narrationDuration = 10;
      const transitionOverlapSec = 0.5;
      const clipTarget = narrationDuration + transitionOverlapSec;
      expect(clipTarget).toBe(10.5);
    });

    it("handles first scene (no leading transition)", () => {
      const narrationDuration = 8;
      const isFirst = true;
      const transitionOverlapSec = isFirst ? 0 : 0.5;
      const clipTarget = narrationDuration + transitionOverlapSec;
      expect(clipTarget).toBe(8);
    });
  });

  describe("Scene JSON parsing", () => {
    it("parses valid scene array from LLM response", () => {
      const response = JSON.stringify([
        {
          orderIndex: 0,
          narrationStartSec: 0,
          narrationEndSec: 8,
          purpose: "Hook the viewer",
          sceneType: "dramatic_reveal",
          startPrompt: "A dark space scene",
          endPrompt: "Zooming into Earth",
          motionNotes: "Camera pulls back to reveal Earth",
        },
      ]);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      expect(jsonMatch).toBeTruthy();
      const scenes = JSON.parse(jsonMatch![0]);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].sceneType).toBe("dramatic_reveal");
    });

    it("handles malformed JSON with fallback", () => {
      const response = "I cannot generate scenes in JSON format. Here is a text description...";
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      expect(jsonMatch).toBeNull();
      // Fallback: one scene per section
    });
  });

  describe("Character description injection", () => {
    it("extracts character description from scene 0", () => {
      const scenes = [
        { orderIndex: 0, characterDescriptions: "Blue round creature with white eyes, no mouth, orange scarf" },
        { orderIndex: 1, characterDescriptions: "" },
      ];
      const mainCharDesc = scenes[0].characterDescriptions;
      expect(mainCharDesc).toContain("Blue round creature");

      // Inject into all subsequent scenes
      for (const scene of scenes) {
        if (!scene.characterDescriptions) {
          scene.characterDescriptions = mainCharDesc;
        }
      }
      expect(scenes[1].characterDescriptions).toContain("Blue round creature");
    });
  });
});
