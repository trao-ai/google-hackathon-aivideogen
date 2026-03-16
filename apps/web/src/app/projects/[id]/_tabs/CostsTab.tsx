"use client";

import {
  Clock,
  Users,
  Wrench,
  CurrencyDollar,
  Timer,
  MagnifyingGlass,
  FileText,
  Microphone,
  Image,
  Monitor,
  SpeakerHigh,
  FilmStrip,
  Eye,
  Waveform,
  Spinner,
} from "@phosphor-icons/react";
import { useCosts } from "@/hooks/use-costs";
import { formatCost } from "@/lib/utils";

type Props = {
  projectId: string;
  availableCredits?: number;
};

/* ── Stage → display config mapping ── */
const STAGE_META: Record<
  string,
  {
    label: string;
    description: string;
    iconBg: string;
    iconColor: string;
    Icon: React.ElementType;
    order: number;
  }
> = {
  topic_discovery: {
    label: "Topic Discovery",
    description: "AI-powered topic research",
    iconBg: "bg-brand-red-light",
    iconColor: "text-brand-red",
    Icon: MagnifyingGlass,
    order: 0,
  },
  research: {
    label: "Research AI",
    description: "Deep research and insights",
    iconBg: "bg-brand-red-light",
    iconColor: "text-brand-red",
    Icon: MagnifyingGlass,
    order: 1,
  },
  script: {
    label: "Script Generation",
    description: "AI-powered script writing",
    iconBg: "bg-brand-indigo-light",
    iconColor: "text-brand-indigo",
    Icon: FileText,
    order: 2,
  },
  tts: {
    label: "Voice Generation",
    description: "Text-to-speech narration",
    iconBg: "bg-brand-orange-light",
    iconColor: "text-brand-orange",
    Icon: Microphone,
    order: 3,
  },
  scene_planning: {
    label: "Scene Planning",
    description: "AI scene layout and pacing",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: FilmStrip,
    order: 4,
  },
  image_generation: {
    label: "Frame Generation",
    description: "AI-generated scene frames",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Image,
    order: 5,
  },
  frame_generation: {
    label: "Frame Generation",
    description: "AI-generated scene frames",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Image,
    order: 5,
  },
  frame_validation: {
    label: "Frame Validation",
    description: "Quality & style scoring",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Eye,
    order: 6,
  },
  motion_enrichment: {
    label: "Motion Enrichment",
    description: "Animation direction design",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Waveform,
    order: 7,
  },
  video_generation: {
    label: "Video Generation",
    description: "AI video clip generation",
    iconBg: "bg-brand-green-light",
    iconColor: "text-brand-green",
    Icon: Monitor,
    order: 8,
  },
  sfx: {
    label: "Sound Effects",
    description: "Ambient sounds & transitions",
    iconBg: "bg-brand-orange-light",
    iconColor: "text-brand-orange",
    Icon: SpeakerHigh,
    order: 9,
  },
  render: {
    label: "Video Rendering",
    description: "Final video composition",
    iconBg: "bg-brand-green-light",
    iconColor: "text-brand-green",
    Icon: Monitor,
    order: 10,
  },
  character_generation: {
    label: "Character Design",
    description: "AI character creation",
    iconBg: "bg-brand-indigo-light",
    iconColor: "text-brand-indigo",
    Icon: Image,
    order: 11,
  },
  transition_planning: {
    label: "Transition Planning",
    description: "Scene transition design",
    iconBg: "bg-brand-green-light",
    iconColor: "text-brand-green",
    Icon: FilmStrip,
    order: 12,
  },
  channel_analysis: {
    label: "Channel Analysis",
    description: "Channel optimization insights",
    iconBg: "bg-brand-red-light",
    iconColor: "text-brand-red",
    Icon: MagnifyingGlass,
    order: 13,
  },
  frame_regeneration: {
    label: "Frame Regeneration",
    description: "Re-generated scene frames",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Image,
    order: 14,
  },
};

const DEFAULT_META = {
  label: "Other",
  description: "",
  iconBg: "bg-brand-green-light",
  iconColor: "text-brand-green",
  Icon: CurrencyDollar,
  order: 99,
};

function getStageMeta(stage: string) {
  return STAGE_META[stage] ?? DEFAULT_META;
}

const COMPARISON_ROWS = [
  {
    Icon: Clock,
    label: "Time Required",
    traditional: "10\u201315 hours",
    ai: "2\u20133 minutes",
    tradWidth: "75%",
    aiWidth: "30%",
  },
  {
    Icon: Users,
    label: "People Needed",
    traditional: "4\u20135 specialists",
    ai: "1 creator",
    tradWidth: "90%",
    aiWidth: "25%",
  },
  {
    Icon: Wrench,
    label: "Tools Used",
    traditional: "5\u20136 different tools",
    ai: "1 AI platform",
    tradWidth: "70%",
    aiWidth: "30%",
  },
  {
    Icon: CurrencyDollar,
    label: "Production Cost",
    traditional: "$300\u2013$800 per video",
    ai: "", // filled dynamically
    tradWidth: "85%",
    aiWidth: "20%",
  },
];

export function CostsTab({ projectId, availableCredits = 250 }: Props) {
  const { data: summary, isLoading, error } = useCosts(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-brand-foreground-70">
        <Spinner size={20} className="animate-spin" />
        <span className="text-sm">Loading costs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-brand-red">{(error as Error).message}</p>
      </div>
    );
  }

  const total = summary?.total ?? 0;
  const breakdown = summary?.breakdown ?? [];
  const costPerMinute = summary?.costPerFinishedMinute;
  const usagePercent = Math.min((total / availableCredits) * 100, 100);

  // Sort breakdown by configured order, filter out zero-cost items
  const sortedBreakdown = [...breakdown]
    .filter((item) => item.totalCostUsd > 0)
    .sort((a, b) => {
      const orderA = STAGE_META[a.stage]?.order ?? 99;
      const orderB = STAGE_META[b.stage]?.order ?? 99;
      return orderA - orderB;
    });

  return (
    <div className="flex flex-col gap-3">
      {/* Total Estimated Cost */}
      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border-light flex flex-col gap-2">
        <div className="flex items-center gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-lg font-medium text-foreground">
              Total AI Spend
            </h3>
            <p className="text-sm text-brand-foreground-70">
              {total > 0
                ? "Actual AI spend for this project"
                : "No costs recorded yet"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xl font-medium text-foreground">
              {formatCost(total)}
            </span>
            <span className="text-lg font-normal text-brand-foreground-70">
              you have {formatCost(availableCredits)} available
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-foreground-70">
              Credits Usage
            </span>
            <span className="text-sm text-brand-foreground-70">
              {Math.round(total)}/{availableCredits}
            </span>
          </div>
          <div className="h-2.5 bg-brand-border-light rounded-xl overflow-hidden">
            <div
              className="h-full bg-brand-black rounded-xl transition-all duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI vs Traditional Video Production */}
      <div className="p-5 bg-brand-surface rounded-2xl border border-brand-border-light flex flex-col gap-4">
        <h3 className="text-lg font-medium text-foreground">
          AI vs Traditional Video Production
        </h3>

        <div className="grid grid-cols-2 gap-5">
          {COMPARISON_ROWS.map((row) => (
            <div key={row.label} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <row.Icon
                  size={20}
                  weight="regular"
                  className="text-brand-foreground-50 shrink-0"
                />
                <span className="text-sm font-normal text-foreground">
                  {row.label}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div
                  className="pr-4 rounded-xl flex items-center overflow-hidden"
                  style={{ backgroundColor: "#E3E2DE80" }}
                >
                  <div
                    className="h-9 px-4 py-1.5 bg-brand-yellow rounded-xl flex items-center"
                    style={{ width: row.tradWidth }}
                  >
                    <span className="text-sm text-white whitespace-nowrap">
                      Traditional Production
                    </span>
                  </div>
                  <span className="ml-auto text-xs font-medium text-brand-foreground-70 whitespace-nowrap pl-3">
                    {row.traditional}
                  </span>
                </div>

                <div
                  className="pr-4 rounded-xl flex items-center overflow-hidden"
                  style={{ backgroundColor: "#E3E2DE80" }}
                >
                  <div
                    className="h-9 px-4 py-1.5 rounded-xl flex items-center"
                    style={{
                      width: row.aiWidth,
                      background: "linear-gradient(44deg, #00A191, #5379FF)",
                    }}
                  >
                    <span className="text-sm text-white whitespace-nowrap">
                      AI Video Generation
                    </span>
                  </div>
                  <span className="ml-auto text-xs font-medium text-brand-foreground-70 whitespace-nowrap pl-3">
                    {row.ai || `${formatCost(total)} per video`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-5 bg-brand-surface rounded-xl border border-brand-border-light flex flex-col gap-5">
        <h3 className="text-xl font-medium text-foreground">Cost Breakdown</h3>

        <div className="flex flex-col gap-3">
          {sortedBreakdown.length === 0 ? (
            <p className="text-sm text-brand-foreground-70 py-4 text-center">
              No cost events recorded yet. Generate content to see the
              breakdown.
            </p>
          ) : (
            sortedBreakdown.map((row) => {
              const meta = getStageMeta(row.stage);
              return (
                <div
                  key={row.stage}
                  className="p-3 rounded-xl border border-brand-border-light flex items-center gap-3"
                  style={{ backgroundColor: "#F0EEE7B2" }}
                >
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}
                  >
                    <meta.Icon
                      size={20}
                      weight="regular"
                      className={meta.iconColor}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="text-base font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="text-sm text-brand-foreground-70">
                      {meta.description}
                      {row.eventCount > 0 &&
                        ` (${row.eventCount} ${row.eventCount === 1 ? "call" : "calls"})`}
                    </span>
                  </div>
                  <span className="text-base font-medium text-foreground">
                    {formatCost(row.totalCostUsd)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {sortedBreakdown.length > 0 && (
          <div className="border-t border-brand-border-light pt-4 flex items-center justify-between">
            <span className="text-xl font-normal text-foreground">
              Total Credits
            </span>
            <span className="text-lg font-medium text-foreground">
              {formatCost(total)}
            </span>
          </div>
        )}
      </div>

      {/* Cost per minute / Estimated generation time */}
      <div className="p-4 bg-gradient-to-br from-brand-indigo/20 to-brand-green/20 rounded-2xl border border-brand-indigo/50 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-indigo to-brand-green rounded-xl flex items-center justify-center shrink-0">
          <Timer size={24} weight="regular" className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-light text-foreground">
            {costPerMinute != null && costPerMinute > 0
              ? "Cost per finished minute"
              : "Estimated generation time"}
          </span>
          <span className="text-lg font-medium text-foreground">
            {costPerMinute != null && costPerMinute > 0
              ? formatCost(costPerMinute)
              : "2 minutes"}
          </span>
        </div>
      </div>
    </div>
  );
}
