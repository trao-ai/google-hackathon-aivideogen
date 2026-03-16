export const TOPIC_SCOUT_SYSTEM_PROMPT = `You are a viral edutainment topic scout for animated explainer video content.

Your job is to identify topics that have strong potential for animated educational videos across various platforms and formats.

Score each topic on:
- SearchMomentum (0-100): How trending is this topic right now?
- EdutainmentFit (0-100): How well does this topic fit a curious, broad audience?
- VisualStorytellingFit (0-100): Can this topic be visually compelling across many scenes?
- CuriosityGap (0-100): Does this topic have a surprising or counterintuitive angle?
- EvergreenPotential (0-100): Will people search for this 1-2 years from now?
- FactDensity (0-100): Is there enough substantive factual material?
- ProductionFeasibility (0-100): Can this be illustrated without specialized/restricted imagery?

TopicOpportunityScore = 0.25*SearchMomentum + 0.20*EdutainmentFit + 0.15*VisualStorytellingFit + 0.15*CuriosityGap + 0.10*EvergreenPotential + 0.10*FactDensity + 0.05*ProductionFeasibility

For each topic return JSON matching this structure:
{
  "title": "...",
  "summary": "...",
  "opportunityScore": 0,
  "scores": {
    "searchMomentum": 0,
    "edutainmentFit": 0,
    "visualStorytellingFit": 0,
    "curiosityGap": 0,
    "evergreenPotential": 0,
    "factDensity": 0,
    "productionFeasibility": 0
  },
  "thumbnailAngle": "...",
  "likelyAudienceAppeal": "...",
  "whyItMayWork": "..."
}`;

export type TopicScoutOptions = {
  niche: string;
  count?: number;
  platform?: string | null;
  videoType?: string | null;
  videoStyle?: string | null;
  toneKeywords?: string[];
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube (landscape 16:9)",
  instagram: "Instagram Reels (vertical 9:16, short-form)",
  tiktok: "TikTok (vertical 9:16, short-form)",
  linkedin: "LinkedIn (vertical 9:16, professional audience)",
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  short: "short-form (30-60 seconds)",
  medium: "medium-form (3-5 minutes)",
  long: "long-form (8-12 minutes)",
};

export function buildTopicScoutPrompt(nicheOrOptions: string | TopicScoutOptions, count = 10): string {
  const opts: TopicScoutOptions = typeof nicheOrOptions === "string"
    ? { niche: nicheOrOptions, count }
    : nicheOrOptions;

  const topicCount = opts.count ?? count;
  const platformLabel = opts.platform ? PLATFORM_LABELS[opts.platform] ?? opts.platform : null;
  const videoTypeLabel = opts.videoType ? VIDEO_TYPE_LABELS[opts.videoType] ?? opts.videoType : null;

  const contextLines: string[] = [`Niche/content lane: "${opts.niche}"`];

  if (platformLabel) {
    contextLines.push(`Target platform: ${platformLabel}`);
  }
  if (videoTypeLabel) {
    contextLines.push(`Video length: ${videoTypeLabel}`);
  }
  if (opts.videoStyle) {
    contextLines.push(`Video style: ${opts.videoStyle}`);
  }
  if (opts.toneKeywords?.length) {
    contextLines.push(`Tone: ${opts.toneKeywords.join(", ")}`);
  }

  const durationGuidance = opts.videoType === "short"
    ? "Support 30-60 seconds of punchy, fast-paced narration"
    : opts.videoType === "medium"
      ? "Support 3-5 minutes of scripted narration"
      : "Support 8-12 minutes of scripted narration";

  const platformGuidance = opts.platform === "instagram" || opts.platform === "tiktok"
    ? "Be optimized for vertical short-form content — punchy hooks, immediate value, scroll-stopping angles"
    : opts.platform === "linkedin"
      ? "Be optimized for a professional audience — industry insights, data-driven, thought-leadership angles"
      : "Have strong visual storytelling potential for animated explainer content";

  return `${contextLines.join("\n")}

Generate ${topicCount} topic candidates.

Each topic must:
- ${durationGuidance}
- ${platformGuidance}
- Appeal to a curious, broad audience
- Have a surprising, counterintuitive, or dramatic angle

Return a JSON array of topic objects.`;
}
