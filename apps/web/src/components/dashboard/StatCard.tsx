"use client";

import { useState, useCallback, useRef } from "react";
import {
  TrendUpIcon,
  SparkleIcon,
  CurrencyDollarIcon,
} from "@phosphor-icons/react";
import type { StatCardProps } from "@/types/components";

const COLORS = {
  teal: "#08A393",
  coral: "#E8704F",
  gold: "#F5A623",
};

/* ═══════════════════════════════════════════════════════════════
   CARD 1: BAR CHART (Total Projects)
   ═══════════════════════════════════════════════════════════════ */

function BarChartCard({
  label,
  value,
  change,
  changeSuffix,
  bars,
  accentColor = "teal",
}: StatCardProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  const color = COLORS[accentColor];

  return (
    <div className="flex-1 p-5 bg-brand-surface rounded-2xl border border-brand-border-light flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-base text-foreground/70">{label}</span>
        <span className="text-4xl font-semibold text-foreground">{value}</span>
        {change && (
          <div className="flex items-center gap-2">
            <TrendUpIcon size={16} weight="bold" style={{ color }} />
            <span className="text-sm font-medium" style={{ color }}>
              {change}
            </span>
            {changeSuffix && (
              <span className="text-sm" style={{ color: "#14141380" }}>
                {changeSuffix}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end justify-end gap-[3px] h-[90px]">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center"
            onMouseEnter={() => setHoveredBar(i)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {hoveredBar === i && (
              <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 px-3 py-2 bg-white rounded-xl shadow-lg border border-brand-border-light whitespace-nowrap z-10">
                <p className="text-xs font-medium text-foreground">
                  {bar.label}
                </p>
                <p className="text-xs" style={{ color }}>
                  {label}: {bar.value}
                </p>
              </div>
            )}
            <div
              className="w-[6px] rounded-full transition-all duration-150 cursor-pointer hover:opacity-80"
              style={{
                height: `${Math.max((bar.value / maxBar) * 80, 3)}px`,
                backgroundColor: color,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARD 2: LINE CHART WITH HORIZONTAL GRADIENT (In Progress)
   ═══════════════════════════════════════════════════════════════ */

const W = 100;
const H = 100;

function pointsFromBars(bars: { value: number }[]) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return bars.map((b, i) => ({
    x: 30 + (i / (bars.length - 1)) * 90,
    y: H - 8 - (b.value / max) * 84,
  }));
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const d: string[] = [`M${pts[0].x},${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(" ");
}

function HorizontalGradientLineCard({
  label,
  value,
  change,
  changeSuffix,
  bars,
  accentColor = "teal",
}: StatCardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const pts = pointsFromBars(bars);
  const linePath = smoothPath(pts);
  const color = COLORS[accentColor];

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = chartRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const dist = Math.abs(pts[i].x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHovered(closest);
    },
    [pts],
  );

  const hp = hovered !== null ? pts[hovered] : null;

  return (
    <div
      className="flex-1 p-5 rounded-2xl border border-brand-border-light flex items-center justify-between gap-4"
      style={{
        background: `linear-gradient(270deg, ${color}0D 0%, var(--color-surface) 60%)`,
      }}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-base text-foreground/70">{label}</span>
        <span className="text-4xl font-semibold text-foreground">{value}</span>
        {change && (
          <div className="flex items-center gap-2">
            <SparkleIcon size={16} style={{ color: COLORS.coral }} />
            <span
              className="text-sm font-medium"
              style={{ color: COLORS.coral }}
            >
              {change}
            </span>
            {changeSuffix && (
              <span className="text-sm" style={{ color: "#14141380" }}>
                {changeSuffix}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 max-w-[50%] h-24 -mr-5">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHovered(null)}
          preserveAspectRatio="none"
        >
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hp && (
            <>
              <line
                x1={hp.x}
                y1={0}
                x2={hp.x}
                y2={H}
                stroke={color}
                strokeWidth="0.6"
                strokeDasharray="2,2"
                opacity="0.5"
              />
              <ellipse
                cx={hp.x}
                cy={hp.y}
                rx="1.2"
                ry="2.5"
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </>
          )}
        </svg>

        {hovered !== null && hp && (
          <div
            className="absolute top-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-brand-border-light whitespace-nowrap z-20 pointer-events-none"
            style={{
              left: hp.x > W * 0.7 ? "auto" : `${(hp.x / W) * 100}%`,
              right: hp.x > W * 0.7 ? `${((W - hp.x) / W) * 100}%` : "auto",
            }}
          >
            <p className="text-xs font-medium text-foreground">
              {bars[hovered].label}
            </p>
            <p className="text-xs" style={{ color }}>
              {label}: {bars[hovered].value}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARD 3: AREA CHART WITH VERTICAL GRADIENT (Total Spend)
   ═══════════════════════════════════════════════════════════════ */

function VerticalGradientAreaCard({
  label,
  value,
  change,
  changeSuffix,
  bars,
  accentColor = "teal",
}: StatCardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const pts = pointsFromBars(bars);
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const color = COLORS[accentColor];
  const strokeGradId = `stroke-grad-${label.replace(/\s+/g, "-")}`;
  const areaGradId = `area-grad-${label.replace(/\s+/g, "-")}`;

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = chartRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const dist = Math.abs(pts[i].x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHovered(closest);
    },
    [pts],
  );

  const hp = hovered !== null ? pts[hovered] : null;

  return (
    <div className="flex-1 p-5 bg-brand-surface rounded-2xl border border-brand-border-light flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-base text-foreground/70">{label}</span>
        <span className="text-4xl font-semibold text-foreground">{value}</span>
        {change && (
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon
              size={16}
              weight="bold"
              style={{ color: COLORS.gold }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: COLORS.gold }}
            >
              {change}
            </span>
            {changeSuffix && (
              <span className="text-sm" style={{ color: "#14141380" }}>
                {changeSuffix}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 max-w-[50%] h-24 -mr-5">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHovered(null)}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={strokeGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#${areaGradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${strokeGradId})`}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {hp && (
            <>
              <line
                x1={hp.x}
                y1={0}
                x2={hp.x}
                y2={H}
                stroke={color}
                strokeWidth="0.6"
                strokeDasharray="2,2"
                opacity="0.5"
              />
              <ellipse
                cx={hp.x}
                cy={hp.y}
                rx="1.2"
                ry="2.5"
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </>
          )}
        </svg>

        {hovered !== null && hp && (
          <div
            className="absolute top-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-brand-border-light whitespace-nowrap z-20 pointer-events-none"
            style={{
              left: hp.x > W * 0.7 ? "auto" : `${(hp.x / W) * 100}%`,
              right: hp.x > W * 0.7 ? `${((W - hp.x) / W) * 100}%` : "auto",
            }}
          >
            <p className="text-xs font-medium text-foreground">
              {bars[hovered].label}
            </p>
            <p className="text-xs" style={{ color }}>
              {label}: {bars[hovered].value}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT - Routes to correct card type
   ═══════════════════════════════════════════════════════════════ */

export function StatCard(props: StatCardProps) {
  if (props.chartType === "area" && props.gradientDirection === "horizontal") {
    return <HorizontalGradientLineCard {...props} />;
  }
  if (props.chartType === "area" && props.gradientDirection === "vertical") {
    return <VerticalGradientAreaCard {...props} />;
  }
  return <BarChartCard {...props} />;
}
