import { Router } from "express";
import { createLLMProvider } from "@atlas/integrations";
import { prisma, trackLLMCost } from "@atlas/db";

export const discoverRouter = Router();

// ─── Internet scrapers (no extra API keys needed) ─────────────────────────────

interface RawSignal {
  title: string;
  source: string;
  score?: number;
  url?: string;
}

async function fetchReddit(subreddit: string, limit = 15): Promise<RawSignal[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/top/.json?limit=${limit}&t=week`,
      {
        headers: {
          "User-Agent": "ProjectAtlas/1.0 (educational content research tool)",
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { children?: { data: { title: string; score: number; url: string } }[] };
    };
    return (data.data?.children ?? []).map((c) => ({
      title: c.data.title,
      source: `reddit/r/${subreddit}`,
      score: c.data.score,
      url: c.data.url,
    }));
  } catch {
    return [];
  }
}

async function fetchHackerNews(limit = 10): Promise<RawSignal[]> {
  try {
    const idsRes = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
    );
    if (!idsRes.ok) return [];
    const ids = ((await idsRes.json()) as number[]).slice(0, limit);

    const stories = await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          );
          const s = (await r.json()) as {
            title?: string;
            score?: number;
            url?: string;
          };
          return s.title
            ? { title: s.title, source: "hackernews", score: s.score, url: s.url }
            : null;
        } catch {
          return null;
        }
      }),
    );

    return stories.filter(Boolean) as RawSignal[];
  } catch {
    return [];
  }
}

async function fetchGoogleTrends(): Promise<RawSignal[]> {
  try {
    const res = await fetch(
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
      { headers: { Accept: "application/rss+xml, application/xml, text/xml" } },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)].map(
      (m) => m[1],
    );
    return titles.slice(0, 15).map((t) => ({
      title: t,
      source: "google-trends",
    }));
  } catch {
    return [];
  }
}

// ─── POST /api/discover ───────────────────────────────────────────────────────

discoverRouter.post("/", async (_req, res, next) => {
  try {
    console.log("[discover] Fetching live internet signals...");

    // Fetch from multiple sources in parallel
    const [til, science, worldnews, technology, futurology, hn, trends] =
      await Promise.all([
        fetchReddit("todayilearned", 20),
        fetchReddit("science", 15),
        fetchReddit("worldnews", 10),
        fetchReddit("technology", 10),
        fetchReddit("Futurology", 10),
        fetchHackerNews(15),
        fetchGoogleTrends(),
      ]);

    const allSignals = [
      ...til,
      ...science,
      ...worldnews,
      ...technology,
      ...futurology,
      ...hn,
      ...trends,
    ];

    console.log(`[discover] Collected ${allSignals.length} signals. Synthesizing with AI...`);

    if (allSignals.length === 0) {
      return next(new Error("Could not fetch any internet signals. Check network."));
    }

    // Format signals for the LLM
    const signalText = allSignals
      .map((s) => `[${s.source}${s.score ? ` ↑${s.score}` : ""}] ${s.title}`)
      .join("\n");

    const llm = createLLMProvider();

    const response = await llm.chat([
      {
        role: "system",
        content: `You are the world's best edutainment topic researcher and viral content strategist.
You have deep expertise in what makes YouTube videos go viral, specifically for educational animation
channels like Kurzgesagt (50M subs), The Infographics Show (14M subs), and Veritasium (18M subs).

YOUR BACKGROUND:
- You have studied thousands of viral edutainment videos and know exactly what makes people click, watch, and share
- You understand the "curiosity gap" — the psychological trigger that makes people NEED to know more
- You know that the best edutainment topics are ones where the truth is MORE surprising than fiction
- You understand visual storytelling: what can be explained with flat-design animation vs what can't
- You know YouTube's algorithm: watch time, CTR, share triggers, comment bait

WHAT MAKES A PERFECT EDUTAINMENT TOPIC:
1. COUNTERINTUITIVE TRUTH — the real answer is the opposite of what most people assume
2. SCALE SHOCK — numbers so big or small they break people's brains
3. HIDDEN MECHANISM — a common thing works in a way nobody knows
4. CONSEQUENCE CASCADE — one small thing leads to massive unexpected effects
5. HISTORICAL REFRAME — something we think we know, but we have it completely wrong
6. EXISTENTIAL STAKES — makes the viewer think differently about their own life or the future

WHAT MAKES A TOPIC VISUALLY RICH (for flat-design animation):
- Can be shown with characters, diagrams, timelines, comparisons
- Has clear before/after states
- Can use metaphors (money as water, time as distance, etc.)
- Has data that can be visualized as infographics
- Involves processes that can be broken into animated steps

WHAT TO AVOID:
- Pure news events (no evergreen value)
- Topics requiring live footage
- Overly political/divisive without educational merit
- Topics already saturated on YouTube
- Anything that can't be explained visually

YOUR TASK:
You receive live trending signals from Reddit, Hacker News, and Google Trends.
Transform these raw signals into 8 brilliant edutainment video concepts.
Don't just restate the headline — find the EDUCATIONAL ANGLE that makes it timeless and viral.

TRANSFORMATION EXAMPLES:
❌ "Fed raises interest rates again"
✅ "Why Raising Interest Rates Actually Makes Inflation Worse Before It Gets Better"

❌ "Scientists discover new deep sea creature"
✅ "The Deep Ocean Has More Undiscovered Species Than All Other Environments Combined — Here's Why"

❌ "Tesla stock crashes"
✅ "The Psychology of Why Smart People Keep Losing Money in the Stock Market"

❌ "New AI model released"
✅ "Why Every AI Breakthrough Is 10x Less Impressive Than It Sounds (And Still Changes Everything)"

Return ONLY valid JSON. No markdown, no preamble, no explanation. Just the JSON array.`,
      },
      {
        role: "user",
        content: `Here is today's LIVE internet signal feed (${allSignals.length} signals from Reddit, Hacker News, Google Trends):

${signalText}

NOW: Analyze this data like an expert. For each of the 8 topics you choose:

1. Find the EDUCATIONAL ANGLE — not just what happened, but WHY it matters, what's counterintuitive about it, or what hidden mechanism it reveals
2. Write a TITLE that creates a curiosity gap — the viewer must click to resolve the tension
3. Write a HOOK that is the single most brain-breaking fact — the thing that makes someone say "wait, what?"
4. Score VIRALITY (trending potential + share-worthiness), EDUCATIONAL value (depth + accuracy), and VISUAL potential (can it be animated?)
5. Describe the THUMBNAIL ANGLE — the specific visual that would make someone stop scrolling

Return a JSON array of exactly 8 objects:
[
  {
    "title": "Title that creates an irresistible curiosity gap (max 70 chars)",
    "hook": "The single most shocking/counterintuitive fact — one punchy sentence that breaks the brain",
    "category": "Science|History|Psychology|Technology|Nature|Society|Space|Health",
    "viralityScore": 87,
    "educationalScore": 92,
    "visualScore": 85,
    "thumbnailAngle": "Specific visual description — what object/scene/character would stop a thumb mid-scroll"
  }
]

Make these genuinely excellent. These will become real videos watched by millions.`,
      },
    ]);

    let topics: Array<{
      title: string;
      hook: string;
      category: string;
      viralityScore: number;
      educationalScore: number;
      visualScore: number;
      thumbnailAngle: string;
    }> = [];

    try {
      const match = response.content.match(/\[[\s\S]*\]/);
      if (match) topics = JSON.parse(match[0]);
    } catch {
      return next(new Error("Failed to parse topic list from AI response"));
    }

    console.log(`[discover] Returning ${topics.length} topic ideas`);
    res.json({
      topics,
      signalCount: allSignals.length,
      costUsd: response.costUsd,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/discover/select — user picked a topic, create project ──────────

discoverRouter.post("/select", async (req, res, next) => {
  try {
    const { title, hook, category, viralityScore, educationalScore, visualScore, thumbnailAngle, discoverCostUsd, discoverInputTokens, discoverOutputTokens } =
      req.body as {
        title: string;
        hook: string;
        category: string;
        viralityScore: number;
        educationalScore: number;
        visualScore: number;
        thumbnailAngle: string;
        discoverCostUsd?: number;
        discoverInputTokens?: number;
        discoverOutputTokens?: number;
      };

    if (!title || !category) {
      return res.status(400).json({ message: "title and category are required" });
    }

    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          title,
          niche: category,
          targetRuntimeSec: 60,
          status: "topic_selected",
        },
      });

      const topic = await tx.topic.create({
        data: {
          projectId: proj.id,
          title,
          summary: hook,
          status: "approved",
          opportunityScore: (viralityScore + educationalScore + visualScore) / 3,
          visualStorytellingScore: visualScore ?? 0,
          trendScore: viralityScore ?? 0,
          factDensityScore: educationalScore ?? 0,
          thumbnailAngle: thumbnailAngle ?? null,
        },
      });

      return tx.project.update({
        where: { id: proj.id },
        data: { selectedTopicId: topic.id },
      });
    });

    // Track discovery LLM cost against the newly created project
    if (discoverCostUsd && discoverCostUsd > 0) {
      await trackLLMCost({
        projectId: project.id,
        stage: "topic_discovery",
        vendor: "openai",
        model: "gpt-4o",
        inputTokens: discoverInputTokens ?? 0,
        outputTokens: discoverOutputTokens ?? 0,
        totalCostUsd: discoverCostUsd,
        metadata: { source: "discover_endpoint" },
      });
    }

    res.status(201).json({ projectId: project.id });
  } catch (err) {
    next(err);
  }
});
