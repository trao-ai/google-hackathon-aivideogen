import {
  SparkleIcon,
  FileTextIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ProjectDetail } from "@/lib/api";

type Props = {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
};

/* ── Mock Data ── */
const SCRIPT_FLOW =
  "Hook → Setup → Question → Insights → Consequence → Reflection → CTA";

const INTRO_SECTIONS = [
  {
    title: "Hook",
    duration: "8s",
    text: "Start with a surprising comparison that grabs attention. A simple street snack is somehow beating a billion-dollar streaming platform in the profit race.",
    actions: ["Rewrite Tone", "Make Shorter"],
  },
  {
    title: "Setup",
    duration: "8s",
    text: "Introduce the two sides of the story: a global streaming giant and a small food business. At first glance, it seems impossible that they could even be compared.",
    actions: ["Rewrite Tone", "Make Shorter"],
  },
  {
    title: "The Big Question",
    duration: "8s",
    text: "This raises an interesting question. How can a tiny churro stand compete with a company backed by massive investments and global reach?",
    actions: ["More Engaging", "Add Urgency"],
  },
];

const MAIN_SECTIONS = [
  {
    title: "Cost Structure",
    duration: "8s",
    text: "Disney+ invests billions in content, technology, and marketing. Churro vendors operate with minimal costs, simple equipment, and small teams.",
  },
  {
    title: "Profit Margins",
    duration: "8s",
    text: "Streaming platforms spend heavily before making profit. Meanwhile, churro vendors often enjoy immediate cash flow and strong margins on every sale.",
  },
  {
    title: "Business Simplicity",
    duration: "8s",
    text: "A churro business focuses on one product with consistent demand. Fewer moving parts make the business easier to manage and more financially stable.",
  },
];

const CLOSING_SECTIONS = [
  {
    title: "Consequence",
    duration: "8s",
    text: "This comparison reveals that scale & technology don't guarantee profitability. Sometimes simple business outperform complex platforms.",
    actions: ["Rewrite Tone", "Make Shorter"],
  },
  {
    title: "Closing Reflection",
    duration: "8s",
    text: "The story highlights an important lesson for entrepreneurs and startups. Efficiency and demand often matter more than size and hype.",
    actions: ["Rewrite Tone", "Make Shorter"],
  },
  {
    title: "Final Hook / CTA",
    duration: "8s",
    text: "So, next time you see a churro stand, remember— simple ideas with smart margins can sometimes beat billion-dollar companies.",
    actions: ["More Engaging", "Add Urgency"],
  },
];

const SCRIPT_TOOLS = {
  wordCount: 156,
  estDuration: "52 sec",
  aiSuggestion:
    "Your hook is strong! Consider adding a question at the end to boost engagement.",
};

export function ScriptsTab({
  project: _project,
  onRefresh: _onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Script Flow */}
      <p className="text-base font-normal text-brand-foreground-70">
        {SCRIPT_FLOW}
      </p>

      {/* Main Layout: Content + Sidebar */}
      <div className="flex items-start gap-5">
        {/* Left: Script Sections */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Intro Row (3 cards) */}
          <div className="flex items-stretch gap-5">
            {INTRO_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="flex-1 p-5 bg-[#FBFBF7] rounded-2xl border border-brand-border-light flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="flex-1 text-lg font-semibold text-foreground">
                      {section.title}
                    </h4>
                    <span className="text-sm font-normal text-brand-foreground-70">
                      {section.duration}
                    </span>
                  </div>
                  <p className="text-sm font-normal text-brand-foreground-70">
                    {section.text}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {section.actions.map((action, i) => (
                    <button
                      key={action}
                      type="button"
                      className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80 ${
                        i === 0
                          ? "bg-brand-surface border border-brand-border-light text-foreground"
                          : "bg-brand-black text-brand-off-white"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Main Context */}
          <div className="p-5 bg-[#FBFBF7] rounded-2xl flex flex-col gap-5">
            <h3 className="text-2xl font-semibold text-foreground">
              Main Context
            </h3>
            {MAIN_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="p-3 bg-[#F0EEE7]/50 rounded-xl border border-brand-border-light flex flex-col gap-5"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="text-lg font-semibold text-foreground">
                      {section.title}
                    </h4>
                    <p className="text-sm font-normal text-brand-foreground-70">
                      {section.text}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-normal text-brand-foreground-70">
                    {section.duration}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-5">
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-border-light text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-brand-black rounded-full text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
                  >
                    Shorten
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Closing Row (3 cards) */}
          <div className="flex items-stretch gap-5">
            {CLOSING_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="flex-1 p-5 bg-[#FBFBF7] rounded-2xl border border-brand-border-light flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="flex-1 text-lg font-semibold text-foreground">
                      {section.title}
                    </h4>
                    <span className="text-sm font-normal text-brand-foreground-70">
                      {section.duration}
                    </span>
                  </div>
                  <p className="text-sm font-normal text-brand-foreground-70">
                    {section.text}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {section.actions.map((action, i) => (
                    <button
                      key={action}
                      type="button"
                      className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80 ${
                        i === 0
                          ? "bg-brand-surface border border-brand-border-light text-foreground"
                          : "bg-brand-black text-brand-off-white"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Script Tools Sidebar */}
        <div className="w-[352px] shrink-0 p-5 bg-[#FBFBF7] rounded-2xl border border-brand-border-light flex flex-col gap-5">
          {/* Stats */}
          <div className="flex flex-col gap-2">
            <h4 className="text-base font-semibold text-foreground">
              Script Tools
            </h4>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  word count:
                </span>
                <span className="text-base font-semibold text-foreground">
                  {SCRIPT_TOOLS.wordCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-normal text-brand-foreground-70">
                  Est. Duration:
                </span>
                <span className="text-base font-semibold text-foreground">
                  {SCRIPT_TOOLS.estDuration}
                </span>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="p-4 bg-gradient-to-br from-brand-indigo-light to-brand-green-light rounded-xl border border-brand-indigo-border flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SparkleIcon
                size={20}
                weight="fill"
                className="text-brand-indigo"
              />
              <span className="text-base font-semibold text-foreground">
                AI Suggestion
              </span>
            </div>
            <p className="text-sm font-normal text-brand-foreground-70">
              {SCRIPT_TOOLS.aiSuggestion}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-5">
            <button
              type="button"
              className="w-full px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-border-light flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              <FileTextIcon size={20} weight="regular" />
              Draft
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 bg-brand-black rounded-full flex items-center justify-center gap-2 text-sm font-medium text-brand-off-white hover:opacity-90 transition-opacity"
            >
              <CheckCircleIcon size={20} weight="regular" />
              Approve
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 bg-[#FBFBF7] rounded-full border border-brand-red flex items-center justify-center gap-2 text-sm font-medium text-brand-red hover:opacity-80 transition-opacity"
            >
              <TrashIcon size={20} weight="regular" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
