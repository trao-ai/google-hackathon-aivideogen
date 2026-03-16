/**
 * Seed script: creates a default StyleBible and a sample project.
 * Run with: npm run seed (from packages/db)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Default style bible — Kurzgesagt inspired
  const styleBibleData = {
    name: "Atlas Default",
    version: "3.0",
    visualMission:
      "Kurzgesagt-style cinematic illustration with rich detail, atmospheric depth, and scientific precision. Epic, vibrant, and educational.",
    emotionalTone: "Curious, awe-inspiring, epic yet approachable",
    narrativeStance: "Friendly and approachable narrator",
    palette: {
      primary: ["#1A1A2E", "#16213E", "#0F3460"],
      accent: ["#E94560", "#FFB703", "#53D769", "#00BBF9", "#F15BB5"],
      backgroundModes: {
        clean_light: ["#F0F4FF", "#E8ECFB"],
        dramatic_dark: ["#1A1A2E", "#16213E", "#0F3460"],
      },
    },
    characterRules: {
      silhouette: "smooth_rounded_simplified_shapes_with_volume",
      proportions: "large_head_small_body_2_head_ratio",
      eyes: "large_round_expressive_eyes_with_subtle_highlights",
      hands: "simple_rounded_hands",
      mouth: "NO_MOUTH_EVER",
      expressionStyle: "expressive_through_eyes_and_body_language_only_no_mouth",
      forbidden: [
        "photorealism",
        "anime_style",
        "realistic_skin_texture",
        "sharp_edges",
        "thin_lines",
        "mouth",
        "lips",
        "teeth",
        "speaking_animation",
        "Duolingo_style",
        "clipart",
      ],
    },
    lineWeights: "no_hard_outlines_shapes_defined_by_color_and_subtle_shadow",
    textureRules: "smooth_with_subtle_gradients_for_depth_and_volume",
    shadowRules: "soft_ambient_shadows_and_atmospheric_lighting",
    backgroundDensity: "richly_detailed_cinematic_backgrounds_with_parallax_depth",
    motionRules: "smooth_parallax_pan_zoom_organic_morphing",
    bubbleRules: "minimal_only_when_clarity_improves_retention",
    negativePrompts: [
      "photorealistic",
      "photograph",
      "3D render",
      "anime",
      "painterly",
      "watercolor",
      "sketch",
      "pencil",
      "cluttered",
      "inconsistent anatomy",
      "heavy typography",
      "text",
      "words",
      "letters",
      "thin lines",
      "sharp angular edges",
      "realistic photo shading",
      "mouth",
      "lips",
      "teeth",
      "speaking",
      "talking",
      "open mouth",
      "Duolingo",
      "simple flat cartoon",
      "clipart",
      "low detail",
      "childish",
    ],
    promptPrimitives: {
      style_prefix:
        "Kurzgesagt-style cinematic illustration, richly detailed with atmospheric depth and subtle lighting, dark navy or deep space background with glowing highlights and particle effects, layered parallax composition, smooth soft shapes with subtle gradients for volume, NO hard outlines, educational infographic aesthetic with scientific precision,",
      character_prefix:
        "sophisticated simplified character with expressive round eyes and subtle eye highlights, NO mouth, NO lips, smooth rounded body with volume and depth, warm organic colors, expression conveyed through eyes and body language only,",
      scene_suffix:
        "rich environmental detail with atmospheric haze and glow effects, vibrant saturated color palette against dark background, epic cinematic framing, clean professional educational look, no text or writing in the image",
    },
  };

  const styleBible = await prisma.styleBible.upsert({
    where: { id: "default-style-bible" },
    update: styleBibleData,
    create: {
      id: "default-style-bible",
      ...styleBibleData,
    },
  });

  console.log(`✅ StyleBible: ${styleBible.name} (${styleBible.id})`);

  // Sample project
  const project = await prisma.project.upsert({
    where: { id: "sample-project-001" },
    update: {},
    create: {
      id: "sample-project-001",
      title: "Sample: Why Earth Once Froze Over",
      niche: "Science / Earth history",
      status: "draft",
      targetRuntimeSec: 750,
      totalCostUsd: 0,
      styleBibleId: styleBible.id,
    },
  });

  console.log(`✅ Sample project: ${project.title} (${project.id})`);

  // Sample topic
  const topic = await prisma.topic.upsert({
    where: { id: "sample-topic-001" },
    update: {},
    create: {
      id: "sample-topic-001",
      projectId: project.id,
      title: "Snowball Earth: When Our Planet Froze for Millions of Years",
      summary:
        "Approximately 700 million years ago, Earth experienced a catastrophic global glaciation event that may have covered the entire planet in ice.",
      opportunityScore: 82,
      visualStorytellingScore: 90,
      evergreenScore: 88,
      trendScore: 65,
      curiosityGapScore: 92,
      factDensityScore: 85,
      thumbnailAngle:
        "Split-frame: lush Earth vs. completely ice-covered Earth",
      likelyAudienceAppeal:
        "Science enthusiasts, curious generalists, climate-interested viewers",
      status: "candidate",
    },
  });

  console.log(`✅ Sample topic: ${topic.title} (${topic.id})`);

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
