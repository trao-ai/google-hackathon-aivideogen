/**
 * Seed script: creates a default StyleBible and a sample project.
 * Run with: npm run seed (from packages/db)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Default style bible — Kurzgesagt + Duolingo inspired
  const styleBibleData = {
    name: "Atlas Default",
    version: "2.0",
    visualMission:
      "Kurzgesagt-inspired flat vector illustration with Duolingo-style friendly rounded characters. Bold, vibrant, and educational.",
    emotionalTone: "Curious, warm, playful yet informative",
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
      silhouette: "rounded_soft_blob_shapes_like_duolingo",
      proportions: "large_head_small_body_2_head_ratio",
      eyes: "large_round_expressive_dot_eyes",
      hands: "simple_rounded_mitten_hands",
      expressionStyle: "friendly_expressive_like_duolingo_characters",
      forbidden: [
        "photorealism",
        "anime_style",
        "realistic_skin_texture",
        "sharp_edges",
        "thin_lines",
      ],
    },
    lineWeights: "no_outlines_or_minimal_color_distinction_between_shapes",
    textureRules: "completely_flat_no_texture_no_grain_pure_vector",
    shadowRules: "subtle_flat_color_shadows_no_gradients",
    backgroundDensity: "rich_layered_like_kurzgesagt_with_depth",
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
      "realistic shading",
      "gradient meshes",
    ],
    promptPrimitives: {
      style_prefix:
        "Kurzgesagt-style flat vector illustration, bold vibrant colors on dark background, no outlines, soft rounded shapes, layered composition with depth, educational infographic aesthetic, Duolingo-style friendly characters,",
      character_prefix:
        "rounded blob-like character with large expressive dot eyes, simple mitten hands, large head small body, warm friendly expression, flat solid colors,",
      scene_suffix:
        "rich layered background with subtle depth, vibrant color palette, clean professional educational look, no text or writing in the image",
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
