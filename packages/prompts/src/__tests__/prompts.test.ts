import { buildTopicScoutPrompt } from "../topic-scout";
import { buildResearchPrompt } from "../research-synthesizer";
import { buildScriptPrompt } from "../script-architect";
import { buildScenePlannerPrompt } from "../scene-planner";
import {
  buildStartFramePrompt,
  buildEndFramePrompt,
  buildVideoPrompt,
} from "../frame-generator";

describe("buildTopicScoutPrompt", () => {
  it("accepts a simple string niche", () => {
    const prompt = buildTopicScoutPrompt("space exploration");
    expect(prompt).toContain("space exploration");
    expect(prompt).toContain("Generate 10 topic candidates");
  });

  it("accepts custom count with string", () => {
    const prompt = buildTopicScoutPrompt("AI", 5);
    expect(prompt).toContain("Generate 5 topic candidates");
  });

  it("accepts options object with all fields", () => {
    const prompt = buildTopicScoutPrompt({
      niche: "biology",
      count: 8,
      platform: "youtube",
      videoType: "long",
      videoStyle: "documentary",
      toneKeywords: ["dramatic", "educational"],
    });
    expect(prompt).toContain("biology");
    expect(prompt).toContain("Generate 8 topic candidates");
    expect(prompt).toContain("YouTube (landscape 16:9)");
    expect(prompt).toContain("8-12 minutes");
    expect(prompt).toContain("documentary");
    expect(prompt).toContain("dramatic, educational");
  });

  it("uses short-form guidance for short videos", () => {
    const prompt = buildTopicScoutPrompt({
      niche: "tech",
      videoType: "short",
    });
    expect(prompt).toContain("30-60 seconds");
  });

  it("uses medium-form guidance for medium videos", () => {
    const prompt = buildTopicScoutPrompt({
      niche: "tech",
      videoType: "medium",
    });
    expect(prompt).toContain("3-5 minutes");
  });

  it("uses platform-specific guidance for instagram", () => {
    const prompt = buildTopicScoutPrompt({
      niche: "tech",
      platform: "instagram",
    });
    expect(prompt).toContain("scroll-stopping");
  });

  it("uses platform-specific guidance for linkedin", () => {
    const prompt = buildTopicScoutPrompt({
      niche: "business",
      platform: "linkedin",
    });
    expect(prompt).toContain("professional audience");
  });
});

describe("buildResearchPrompt", () => {
  it("includes topic and search results", () => {
    const prompt = buildResearchPrompt("quantum computing", "result 1\nresult 2");
    expect(prompt).toContain('Topic: "quantum computing"');
    expect(prompt).toContain("result 1\nresult 2");
    expect(prompt).toContain("Synthesize");
    expect(prompt).toContain("confidenceScore");
  });
});

describe("buildScriptPrompt", () => {
  it("includes topic, brief, tone, and word count", () => {
    const prompt = buildScriptPrompt("AI safety", "research brief here", "dramatic", 2500);
    expect(prompt).toContain('Topic: "AI safety"');
    expect(prompt).toContain("Tone: dramatic");
    expect(prompt).toContain("~2500 words");
    expect(prompt).toContain("research brief here");
  });

  it("defaults to curious tone and 2000 words", () => {
    const prompt = buildScriptPrompt("Topic X", "Brief Y");
    expect(prompt).toContain("Tone: curious");
    expect(prompt).toContain("~2000 words");
  });
});

describe("buildScenePlannerPrompt", () => {
  it("includes all sections and timestamps", () => {
    const prompt = buildScenePlannerPrompt(
      "Section 1\nSection 2",
      "0:00 - text here",
      "visual mission style",
      120,
    );
    expect(prompt).toContain("Section 1");
    expect(prompt).toContain("0:00 - text here");
    expect(prompt).toContain("visual mission style");
    expect(prompt).toContain("120.0");
  });

  it("calculates min/max scenes from duration", () => {
    const prompt = buildScenePlannerPrompt("sections", "timestamps", "style", 80);
    // 80/10 = 8 min, 80/6 = ~13 max
    expect(prompt).toContain("8-13 scenes");
  });

  it("includes platform context when provided", () => {
    const prompt = buildScenePlannerPrompt("s", "t", "style", 60, {
      platform: "instagram",
      aspectRatio: "9:16",
      videoStyle: "animated",
      toneKeywords: ["fun"],
    });
    expect(prompt).toContain("instagram");
    expect(prompt).toContain("VERTICAL");
    expect(prompt).toContain("animated");
    expect(prompt).toContain("fun");
  });

  it("defaults to landscape 16:9", () => {
    const prompt = buildScenePlannerPrompt("s", "t", "style", 60);
    expect(prompt).toContain("16:9");
  });
});

describe("buildStartFramePrompt", () => {
  it("includes all parameters in output", () => {
    const prompt = buildStartFramePrompt({
      purpose: "introduce character",
      narrationExcerpt: "Meet our hero",
      sceneType: "character_explanation",
      visualMetaphor: "light bulb moment",
      characterNotes: "blue round character",
      bubbleText: "Hello!",
      palette: "warm amber tones",
      negativePrompts: ["violence"],
      stylePrimitives: "Kurzgesagt style",
    });
    expect(prompt).toContain("introduce character");
    expect(prompt).toContain("Meet our hero");
    expect(prompt).toContain("character_explanation");
    expect(prompt).toContain("light bulb moment");
    expect(prompt).toContain("blue round character");
    expect(prompt).toContain("warm amber tones");
    expect(prompt).toContain("violence");
    expect(prompt).toContain("Kurzgesagt style");
    expect(prompt).toContain("Generate START FRAME only");
  });

  it("always includes default negative prompts for text", () => {
    const prompt = buildStartFramePrompt({
      purpose: "test",
      narrationExcerpt: "test",
      sceneType: "metaphor",
      palette: "blue",
      negativePrompts: [],
      stylePrimitives: "",
    });
    expect(prompt).toContain("text");
    expect(prompt).toContain("watermark");
    expect(prompt).toContain("caption");
  });

  it("shows empty bubble when no bubbleText", () => {
    const prompt = buildStartFramePrompt({
      purpose: "test",
      narrationExcerpt: "test",
      sceneType: "metaphor",
      palette: "blue",
      negativePrompts: [],
      stylePrimitives: "",
    });
    expect(prompt).toContain("Speech bubble: none");
  });
});

describe("buildEndFramePrompt", () => {
  it("extends start frame prompt with progression", () => {
    const endPrompt = buildEndFramePrompt("start frame content", "camera zooms in");
    expect(endPrompt).toContain("start frame content");
    expect(endPrompt).toContain("camera zooms in");
    expect(endPrompt).toContain("Generate END FRAME");
  });
});

describe("buildVideoPrompt", () => {
  it("includes all animation parameters", () => {
    const prompt = buildVideoPrompt({
      purpose: "explain concept",
      sceneType: "metaphor",
      motionNotes: "slow zoom into cell",
      startFramePrompt: "Scene purpose: start\nNarration excerpt: text",
      endFramePrompt: "Scene purpose: end\nNarration excerpt: text",
      durationSec: 8,
    });
    expect(prompt).toContain("explain concept");
    expect(prompt).toContain("metaphor");
    expect(prompt).toContain("slow zoom into cell");
    expect(prompt).toContain("8 seconds");
    expect(prompt).toContain("MOUTH RULE");
  });

  it("defaults to 5 second duration", () => {
    const prompt = buildVideoPrompt({
      purpose: "test",
      sceneType: "test",
      motionNotes: "test",
      startFramePrompt: "start",
      endFramePrompt: "end",
    });
    expect(prompt).toContain("5 seconds");
  });

  it("includes next scene context when provided", () => {
    const prompt = buildVideoPrompt({
      purpose: "test",
      sceneType: "test",
      motionNotes: "test",
      startFramePrompt: "start",
      endFramePrompt: "end",
      nextSceneStartPrompt: "Next scene starts with a close-up of a neuron",
    });
    expect(prompt).toContain("NEXT SCENE CONTEXT");
    expect(prompt).toContain("neuron");
  });
});
