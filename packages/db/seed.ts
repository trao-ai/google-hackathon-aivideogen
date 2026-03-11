/**
 * Seed script: creates a default StyleBible and a sample project.
 * Run with: npm run seed (from packages/db)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Default style bible
  const styleBible = await prisma.styleBible.upsert({
    where: { id: "default-style-bible" },
    update: {},
    create: {
      id: "default-style-bible",
      name: "Atlas Default",
      version: "1.0",
      visualMission:
        "Premium 2D editorial explainer style that prioritizes clarity and intellectual engagement",
      emotionalTone: "Curious, intelligent, slightly dramatic",
      narrativeStance: "Authoritative but approachable narrator",
      palette: {
        primary: ["#2E5BFF", "#0F172A", "#F8FAFC"],
        accent: ["#FFB703", "#FB7185", "#34D399"],
        backgroundModes: {
          clean_light: ["#F8FAFC", "#E2E8F0"],
          dramatic_dark: ["#0F172A", "#1E293B"],
        },
      },
      characterRules: {
        silhouette: "rounded_geometric",
        proportions: "simplified_3_head_ratio",
        eyes: "minimal",
        hands: "gesture_readable_simplified",
        expressionStyle: "clear_not_hyper_detailed",
        forbidden: ["photorealism", "anime_style", "realistic_skin_texture"],
      },
      lineWeights: "medium_consistent_2px",
      textureRules: "flat_with_subtle_grain",
      shadowRules: "soft_drop_minimal",
      backgroundDensity: "medium",
      motionRules: "pan_zoom_parallax_object_morph",
      bubbleRules: "minimal_only_when_clarity_improves_retention",
      negativePrompts: [
        "photorealistic",
        "3D render",
        "anime",
        "painterly",
        "cluttered",
        "inconsistent anatomy",
        "heavy typography",
        "random style drift",
      ],
      promptPrimitives: {
        style_prefix: "Premium 2D editorial explainer illustration,",
        character_prefix:
          "simplified geometric character, 3-head-height proportions,",
        scene_suffix:
          "high contrast focal hierarchy, rich but restrained background",
      },
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
