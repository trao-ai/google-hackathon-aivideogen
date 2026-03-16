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
} from "@phosphor-icons/react";

const MOCK_BREAKDOWN = [
  {
    stage: "research",
    label: "Research AI",
    description: "Topic research and insights",
    iconBg: "bg-brand-red-light",
    iconColor: "text-brand-red",
    Icon: MagnifyingGlass,
    cost: 5,
  },
  {
    stage: "script",
    label: "Script Generation",
    description: "AI-powered script writing",
    iconBg: "bg-brand-indigo-light",
    iconColor: "text-brand-indigo",
    Icon: FileText,
    cost: 8,
  },
  {
    stage: "voice",
    label: "Voice Generation",
    description: "Text-to-speech narration",
    iconBg: "bg-brand-orange-light",
    iconColor: "text-brand-orange",
    Icon: Microphone,
    cost: 12,
  },
  {
    stage: "scene",
    label: "Scene Generation",
    description: "Visual content & overlays",
    iconBg: "bg-brand-yellow-light",
    iconColor: "text-brand-yellow",
    Icon: Image,
    cost: 20,
  },
  {
    stage: "render",
    label: "Video Rendering",
    description: "Final video compilation",
    iconBg: "bg-brand-green-light",
    iconColor: "text-brand-green",
    Icon: Monitor,
    cost: 15,
  },
];

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
    ai: "$60 per video",
    tradWidth: "85%",
    aiWidth: "20%",
  },
];

const TOTAL = 60;
const AVAILABLE = 250;

export function CostsTab() {
  const usagePercent = Math.min((TOTAL / AVAILABLE) * 100, 100);

  return (
    <div className="flex flex-col gap-3">
      {/* Total Estimated Cost */}
      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border-light flex flex-col gap-2">
        <div className="flex items-center gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-lg font-medium text-foreground">
              Total Estimated Cost
            </h3>
            <p className="text-sm text-brand-foreground-70">
              AI spend required to generate this video
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xl font-medium text-foreground">$60</span>
            <span className="text-lg font-normal text-brand-foreground-70">
              you have $250 available
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-foreground-70">
              Credits Usage
            </span>
            <span className="text-sm text-brand-foreground-70">
              {TOTAL}/{AVAILABLE}
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
              {/* Metric label */}
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

              {/* Bars */}
              <div className="flex flex-col gap-3">
                {/* Traditional bar */}
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

                {/* AI bar */}
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
                    {row.ai}
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
          {MOCK_BREAKDOWN.map((item) => (
            <div
              key={item.stage}
              className="p-3 rounded-xl border border-brand-border-light flex items-center gap-3"
              style={{ backgroundColor: "#F0EEE7B2" }}
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}
              >
                <item.Icon
                  size={20}
                  weight="regular"
                  className={item.iconColor}
                />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-base font-medium text-foreground">
                  {item.label}
                </span>
                <span className="text-sm text-brand-foreground-70">
                  {item.description}
                </span>
              </div>
              <span className="text-base font-medium text-foreground">
                $ {item.cost}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-brand-border-light pt-4 flex items-center justify-between">
          <span className="text-xl font-normal text-foreground">
            Total Credits
          </span>
          <span className="text-lg font-medium text-foreground">$ 60</span>
        </div>
      </div>

      {/* Estimated generation time */}
      <div className="p-4 bg-gradient-to-br from-brand-indigo/20 to-brand-green/20 rounded-2xl border border-brand-indigo/50 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-indigo to-brand-green rounded-xl flex items-center justify-center shrink-0">
          <Timer size={24} weight="regular" className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-light text-foreground">
            Estimated generation time
          </span>
          <span className="text-lg font-medium text-foreground">2 minutes</span>
        </div>
      </div>
    </div>
  );
}
