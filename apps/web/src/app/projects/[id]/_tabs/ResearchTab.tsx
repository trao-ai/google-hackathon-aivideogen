import {
  BookOpenIcon,
  ChartBarIcon,
  LightbulbIcon,
  ListBulletsIcon,
  ClockIcon,
  WarningCircleIcon,
  InfoIcon,
  LinkIcon,
  TagIcon,
  UsersIcon,
  TrendUpIcon,
  EyeIcon,
  BookmarkIcon,
} from "@phosphor-icons/react";
import type { ProjectDetail } from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

/* ── Mock Data ── */
const MOCK_RESEARCH = {
  overview:
    "Churros, once a humble Spanish street treat, have evolved into a global cultural phenomenon that is outpacing even corporate entertainment giants like Disney+ in profitability metrics. This research explores the cultural, economic, and social factors behind this unlikely comparison, offering content angles that blend food history with modern business analysis.",
  audience: {
    primary: [
      "Business and entrepreneurship enthusiasts",
      "Entertainment industry followers",
      "Marketing and economics learners",
    ],
    secondary: ["Disney fans", "Streaming industry observers"],
  },
  statistics: {
    facts: [
      "Disney parks sell millions of churros each year",
      "Disney+ has over 150 million subscribers globally",
    ],
    scores: [
      {
        label: "Trend Score",
        value: "84/100",
        subtitle: "High viral potential",
      },
      {
        label: "Confidence Level",
        value: "86%",
        subtitle: "Based on verified sources",
      },
    ],
  },
  keyInsights: [
    "Churro profit margins average 72%, making them one of the highest-margin street foods globally.",
    "Disney+ has struggled to achieve profitability, posting $512M in operating losses in their streaming division last quarter.",
    "The cultural crossover of churros spans 15+ countries with distinct regional adaptations.",
    "Social media virality of churro content has driven a 340% increase in food tourism to traditional churro districts.",
  ],
  contentOutline: [
    {
      section: "Hook",
      color: "indigo" as const,
      text: "Open with the shocking profit comparison — a $2 churro vs a $13.99/mo subscription",
    },
    {
      section: "Introduction",
      color: "dark-green" as const,
      text: "Brief history of churros and the rise of Disney+ streaming wars",
    },
    {
      section: "Problem",
      color: "red" as const,
      text: "Why does Disney+ lose money while churro vendors thrive? Explore unit economics",
    },
    {
      section: "Insight",
      color: "yellow" as const,
      text: "The simplicity advantage — low overhead, high margins, cultural authenticity vs corporate content",
    },
    {
      section: "Takeaway",
      color: "green" as const,
      text: "Lessons from churros for anyone building a business: simplicity, margins, and cultural resonance",
    },
  ],
  storyAngles: [
    {
      title: "Production Cost",
      description:
        "A simple snack like a churro can generate surprisingly high profits because of its low production cost and massive demand in Disney theme parks.",
      aiHighlight: false,
    },
    {
      title: "High-Margin vs Digital",
      description:
        "This story highlights how small, high-margin products in physical entertainment spaces can sometimes outperform complex digital platforms that require massive investment.",
      aiHighlight: false,
    },
    {
      title: "AI Framing",
      description:
        "AI will frame the video around the surprising comparison between churro profits in Disney theme parks and the high costs of running a global streaming platform like Disney+, highlighting the power of simple, high-margin products.",
      aiHighlight: true,
    },
  ],
  trendingHooks: [
    "You won't believe how Disney makes more from churros than Disney+\"",
    "Why Disney's $5 churro is more profitable than its streaming empire",
    "The shocking truth about Disney's most profitable product",
  ],
  visualOpportunities: [
    "Side-by-side animation: churro cart revenue vs Disney+ subscriber revenue",
    "Map visualization: global churro variations and their markets",
    "Infographic: unit economics breakdown of churro vs streaming subscription",
    "Time-lapse: churro making process intercut with Disney+ content creation pipeline",
  ],
  historicalContext:
    "Churros originated in Spain and Portugal in the 16th century, likely inspired by a Chinese pastry brought by Portuguese traders. Originally a shepherd's food, they evolved into a beloved street food across Latin America and eventually the world. The modern churro boom began in the 2010s with gourmet adaptations — stuffed churros, churro ice cream sandwiches, and artisanal chocolate pairings.",
  latestDevelopments:
    "In 2024, several churro franchises have secured Series A funding, with Churro Union raising $12M for expansion across Southeast Asia. Meanwhile, Disney+ announced another price increase while cutting content budgets. Food tourism platforms report churro-centric walking tours are now the #3 most booked food experience globally.",
  controversies:
    "Some food historians argue the churro's origins are contested — with claims from China, Spain, and Portugal. Additionally, gentrification of traditional churro districts has displaced original vendors in cities like Madrid, Mexico City, and Los Angeles. Corporate churro chains have been criticized for cultural appropriation.",
  whyItMatters:
    "This comparison isn't just about food vs entertainment — it highlights a fundamental economic lesson about simplicity, margins, and cultural authenticity. As consumers increasingly value experiences over subscriptions, the churro economy offers a blueprint for sustainable, community-driven business models.",
  sources: [
    {
      title:
        "Lifestyle, Oxidative Stress, and Antioxidants: Back and Forth in the Pathophysiology of Chronic Diseases",
      description:
        "This research discusses the biochemical effects of exercise at the cellular level, including oxidative stress and its regulation.",
      year: 2020,
    },
    {
      title:
        "Lifestyle, Oxidative Stress, and Antioxidants: Back and Forth in the Pathophysiology of Chronic Diseases",
      description:
        "This research discusses the biochemical effects of exercise at the cellular level, including oxidative stress and its regulation.",
      year: 2020,
    },
    {
      title:
        "Lifestyle, Oxidative Stress, and Antioxidants: Back and Forth in the Pathophysiology of Chronic Diseases",
      description:
        "This research discusses the biochemical effects of exercise at the cellular level, including oxidative stress and its regulation.",
      year: 2020,
    },
  ],
  tags: [
    { label: "Business", color: "green" as const },
    { label: "Streaming Industry", color: "green" as const },
    { label: "Disney", color: "red" as const },
    { label: "Theme Parks", color: "orange" as const },
    { label: "Entertainment Economics", color: "indigo" as const },
    { label: "Viral Content", color: "indigo" as const },
  ],
  confidenceScore: 87,
  trendScore: 92,
  sourceCount: 5,
};

const OUTLINE_BORDER_COLORS: Record<string, string> = {
  indigo: "border-l-brand-indigo",
  "dark-green": "border-l-brand-dark-green",
  red: "border-l-brand-red",
  yellow: "border-l-brand-yellow",
  green: "border-l-brand-green",
};

const TAG_COLORS: Record<string, string> = {
  green: "bg-brand-green-light text-brand-green",
  indigo: "bg-brand-indigo-light text-brand-indigo",
  orange: "bg-brand-orange-light text-brand-orange",
  "dark-green": "bg-brand-dark-green-light text-brand-dark-green",
  yellow: "bg-brand-yellow-light text-brand-yellow",
  red: "bg-brand-red-light text-brand-red",
};

export function ResearchTab({ project, onRefresh }: Props) {
  const data = MOCK_RESEARCH;

  return (
    <div className="flex flex-col gap-5">
      {/* Overview */}
      <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpenIcon
            size={20}
            weight="duotone"
            className="text-brand-green"
          />
          <h3 className="text-base font-medium text-foreground">Overview</h3>
        </div>
        <p className="text-sm font-extralight text-brand-foreground-70">
          {data.overview}
        </p>
      </section>

      {/* Audience + Statistics */}
      <div className="grid grid-cols-2 gap-5">
        {/* Audience */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UsersIcon
              size={20}
              weight="duotone"
              className="text-brand-indigo"
            />
            <h3 className="text-base font-medium text-foreground">Audience</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                Primary Audience:
              </span>
              <div className="flex flex-wrap gap-2">
                {data.audience.primary.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 bg-brand-indigo-light rounded-full text-xs font-normal text-brand-indigo"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                Secondary Audience:
              </span>
              <div className="flex flex-wrap gap-2">
                {data.audience.secondary.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 bg-brand-orange-light rounded-full text-xs font-normal text-brand-red"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ChartBarIcon
              size={20}
              weight="duotone"
              className="text-brand-orange"
            />
            <h3 className="text-base font-medium text-foreground">
              Statistics
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.statistics.facts.map((fact) => (
              <div
                key={fact}
                className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3"
              >
                <p className="text-sm font-normal text-foreground">{fact}</p>
              </div>
            ))}
            {data.statistics.scores.map((score) => (
              <div
                key={score.label}
                className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3 flex flex-col gap-0.5"
              >
                <p className="text-sm font-normal text-foreground">
                  {score.label}:{" "}
                  <span className="font-medium">{score.value}</span>
                </p>
                <p className="text-xs font-normal text-brand-green">
                  {score.subtitle}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Key Insights + Content Outline */}
      <div className="grid grid-cols-2 gap-5">
        {/* Key Insights */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LightbulbIcon
              size={20}
              weight="duotone"
              className="text-brand-yellow"
            />
            <h3 className="text-base font-medium text-foreground">
              Key Insights
            </h3>
          </div>
          <ul className="flex flex-col gap-3">
            {data.keyInsights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm font-normal text-brand-foreground-70"
              >
                <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-foreground-50" />
                {insight}
              </li>
            ))}
          </ul>
        </section>

        {/* Content Outline */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ListBulletsIcon
              size={20}
              weight="duotone"
              className="text-brand-dark-green"
            />
            <h3 className="text-base font-medium text-foreground">
              Content Outline
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {data.contentOutline.map((item) => (
              <div
                key={item.section}
                className={`border-l-2 ${OUTLINE_BORDER_COLORS[item.color]} pl-3 flex flex-col gap-0.5`}
              >
                <span className="text-sm font-medium text-foreground">
                  {item.section}:
                </span>
                <p className="text-sm font-normal text-brand-foreground-70">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Story Angles */}
      <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon
            size={20}
            weight="duotone"
            className="text-brand-indigo"
          />
          <h3 className="text-base font-medium text-foreground">
            Story Angles
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {data.storyAngles
            .filter((a) => !a.aiHighlight)
            .map((angle) => (
              <p
                key={angle.title}
                className="text-sm font-normal text-brand-foreground-70"
              >
                {angle.description}
              </p>
            ))}
          {data.storyAngles
            .filter((a) => a.aiHighlight)
            .map((angle) => (
              <div
                key={angle.title}
                className="rounded-xl bg-gradient-to-r from-brand-indigo-light to-brand-green-light border border-brand-indigo-border p-4"
              >
                <p className="text-sm font-normal text-foreground">
                  {angle.description}
                </p>
              </div>
            ))}
        </div>
      </section>

      {/* Trending Hooks + Visual Opportunities */}
      <div className="grid grid-cols-2 gap-5">
        {/* Trending Hooks */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendUpIcon
              size={20}
              weight="duotone"
              className="text-brand-orange"
            />
            <h3 className="text-base font-medium text-foreground">
              Trending Hooks
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {data.trendingHooks.map((hook, i) => (
              <div
                key={i}
                className="bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light p-3"
              >
                <p className="text-sm font-normal text-brand-foreground-70">
                  &ldquo;{hook}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Visual Opportunities */}
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <EyeIcon size={20} weight="duotone" className="text-brand-green" />
            <h3 className="text-base font-medium text-foreground">
              Visual Opportunities
            </h3>
          </div>
          <ol className="flex flex-col gap-2 pl-1">
            {data.visualOpportunities.map((opp, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm font-normal text-brand-foreground-70"
              >
                <span className="shrink-0 text-brand-foreground-50">
                  {i + 1}.
                </span>
                {opp}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Historical Context + Latest Developments */}
      <div className="grid grid-cols-2 gap-5">
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ClockIcon
              size={20}
              weight="duotone"
              className="text-brand-orange"
            />
            <h3 className="text-base font-medium text-foreground">
              Historical Context
            </h3>
          </div>
          <p className="text-sm font-extralight text-brand-foreground-70">
            {data.historicalContext}
          </p>
        </section>

        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendUpIcon
              size={20}
              weight="duotone"
              className="text-brand-green"
            />
            <h3 className="text-base font-medium text-foreground">
              Latest Developments
            </h3>
          </div>
          <p className="text-sm font-extralight text-brand-foreground-70">
            {data.latestDevelopments}
          </p>
        </section>
      </div>

      {/* Controversies + Why It Matters */}
      <div className="grid grid-cols-2 gap-5">
        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <WarningCircleIcon
              size={20}
              weight="duotone"
              className="text-brand-red"
            />
            <h3 className="text-base font-medium text-foreground">
              Controversies
            </h3>
          </div>
          <p className="text-sm font-extralight text-brand-foreground-70">
            {data.controversies}
          </p>
        </section>

        <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <InfoIcon
              size={20}
              weight="duotone"
              className="text-brand-indigo"
            />
            <h3 className="text-base font-medium text-foreground">
              Why It Matters
            </h3>
          </div>
          <p className="text-sm font-extralight text-brand-foreground-70">
            {data.whyItMatters}
          </p>
        </section>
      </div>

      {/* Sources */}
      <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <LinkIcon size={20} weight="duotone" className="text-brand-green" />
          <h3 className="text-base font-medium text-foreground">Sources</h3>
        </div>
        <div className="flex flex-col divide-y divide-brand-border-light">
          {data.sources.map((src, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-normal text-brand-green">
                  {src.title}
                </span>
                <span className="text-xs font-normal text-brand-foreground-50">
                  {src.description}
                </span>
              </div>
              <span className="shrink-0 text-sm font-normal text-brand-foreground-50">
                {src.year}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Tags */}
      <section className="bg-[#FAF9F5] rounded-2xl border border-brand-border-light p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TagIcon
            size={20}
            weight="duotone"
            className="text-brand-foreground-70"
          />
          <h3 className="text-base font-medium text-foreground">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag.label}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${TAG_COLORS[tag.color]}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
