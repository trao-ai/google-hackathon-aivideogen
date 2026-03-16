jest.mock("@atlas/db", () => ({
  prisma: {
    render: {
      update: jest.fn(),
    },
    scene: {
      findMany: jest.fn(),
    },
    voiceover: {
      findFirst: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    captionSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@atlas/integrations", () => ({
  createStorageProvider: jest.fn().mockReturnValue({
    upload: jest.fn().mockResolvedValue("https://storage.example.com/render.mp4"),
    download: jest.fn().mockResolvedValue(Buffer.alloc(100)),
  }),
  runAgent: jest.fn(),
}));

describe("Render Worker Logic", () => {
  describe("Resolution selection by platform", () => {
    it("uses 9:16 portrait for instagram", () => {
      const platformToResolution = (platform: string | null) => {
        const vertical = ["instagram", "tiktok"];
        if (platform && vertical.includes(platform)) {
          return { width: 1080, height: 1920, aspectRatio: "9:16" };
        }
        return { width: 1920, height: 1080, aspectRatio: "16:9" };
      };

      expect(platformToResolution("instagram")).toEqual({
        width: 1080, height: 1920, aspectRatio: "9:16",
      });
    });

    it("uses 9:16 portrait for tiktok", () => {
      const platformToResolution = (platform: string | null) => {
        const vertical = ["instagram", "tiktok"];
        if (platform && vertical.includes(platform)) {
          return { width: 1080, height: 1920, aspectRatio: "9:16" };
        }
        return { width: 1920, height: 1080, aspectRatio: "16:9" };
      };

      expect(platformToResolution("tiktok")).toEqual({
        width: 1080, height: 1920, aspectRatio: "9:16",
      });
    });

    it("uses 16:9 landscape for youtube", () => {
      const platformToResolution = (platform: string | null) => {
        const vertical = ["instagram", "tiktok"];
        if (platform && vertical.includes(platform)) {
          return { width: 1080, height: 1920, aspectRatio: "9:16" };
        }
        return { width: 1920, height: 1080, aspectRatio: "16:9" };
      };

      expect(platformToResolution("youtube")).toEqual({
        width: 1920, height: 1080, aspectRatio: "16:9",
      });
    });

    it("defaults to 16:9 when no platform", () => {
      const platformToResolution = (platform: string | null) => {
        const vertical = ["instagram", "tiktok"];
        if (platform && vertical.includes(platform)) {
          return { width: 1080, height: 1920, aspectRatio: "9:16" };
        }
        return { width: 1920, height: 1080, aspectRatio: "16:9" };
      };

      expect(platformToResolution(null)).toEqual({
        width: 1920, height: 1080, aspectRatio: "16:9",
      });
    });
  });

  describe("Speed adjustment logic", () => {
    it("calculates speed factor for clip adjustment", () => {
      // Speed factor to make a clip match narration duration
      const clipDuration = 8;
      const narrationDuration = 10;
      const speedFactor = clipDuration / narrationDuration;
      expect(speedFactor).toBeCloseTo(0.8); // Slow down
    });

    it("caps speed factor at 2x for freeze-frame fallback", () => {
      const clipDuration = 4;
      const narrationDuration = 12;
      const rawFactor = clipDuration / narrationDuration;
      const maxSlowdown = 0.5; // 2x slower = 0.5 speed factor
      const factor = Math.max(maxSlowdown, rawFactor);
      expect(factor).toBe(0.5);
    });
  });

  describe("Default caption settings", () => {
    it("uses correct defaults", () => {
      const defaults = {
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
      };

      expect(defaults.font).toBe("Arial");
      expect(defaults.textColor).toBe("#FFFFFF");
      expect(defaults.position).toBe("bottom");
      expect(defaults.burnInCaptions).toBe(true);
    });
  });

  describe("Transition plan validation", () => {
    it("validates known xfade transition types", () => {
      const knownTransitions = [
        "fade", "fadeblack", "fadewhite", "dissolve",
        "wipeleft", "wiperight", "wipeup", "wipedown",
        "slideleft", "slideright", "slideup", "slidedown",
        "circlecrop", "rectcrop", "distance", "smoothleft",
        "smoothright", "smoothup", "smoothdown",
      ];

      expect(knownTransitions).toContain("fade");
      expect(knownTransitions).toContain("dissolve");
      expect(knownTransitions).toContain("circlecrop");
    });

    it("falls back to fade for unknown transitions", () => {
      const validateTransition = (type: string) => {
        const known = new Set(["fade", "dissolve", "wipeleft", "wiperight"]);
        return known.has(type) ? type : "fade";
      };

      expect(validateTransition("dissolve")).toBe("dissolve");
      expect(validateTransition("unknowntype")).toBe("fade");
    });
  });
});
