"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  MagnifyingGlassIcon,
  CaretDownIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import type { Project } from "@/types/api";
import {
  getProjectStep,
  getCompletedSteps,
  getProjectCardStatus,
} from "@/lib/pipeline";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { useProjects } from "@/hooks/use-projects";
import { EmptyStateHero } from "@/components/dashboard/EmptyStateHero";

export default function DashboardPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categoryOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      ) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [categoryOpen]);

  const totalCost = projects.reduce((acc, p) => acc + (p.totalCostUsd ?? 0), 0);
  const inProgressCount = projects.filter(
    (p) =>
      !["draft", "complete"].includes(p.status) && !p.status.includes("failed"),
  ).length;
  // Build daily bars
  const buildBars = (filterFn: (p: Project) => boolean, days: number) => {
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const dayStr = d.toDateString();
      const count = projects.filter((p) => {
        return filterFn(p) && new Date(p.createdAt).toDateString() === dayStr;
      }).length;
      const isToday = i === days - 1;
      const isYesterday = i === days - 2;
      return {
        label: isToday
          ? "Today"
          : isYesterday
            ? "Yesterday"
            : d.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
        value: count,
      };
    });
  };

  const totalBars = buildBars(() => true, 14);
  const inProgressBars = buildBars(
    (p) =>
      !["draft", "complete"].includes(p.status) && !p.status.includes("failed"),
    7,
  );

  // Build daily spend bars for the last 7 days
  const spendBars = (() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toDateString();
      const spend = projects
        .filter((p) => new Date(p.createdAt).toDateString() === dayStr)
        .reduce((acc, p) => acc + (p.totalCostUsd ?? 0), 0);
      const isToday = i === 6;
      const isYesterday = i === 5;
      return {
        label: isToday
          ? "Today"
          : isYesterday
            ? "Yesterday"
            : d.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
        value: Math.round(spend * 100) / 100,
      };
    });
  })();

  const todaySpend = spendBars[spendBars.length - 1]?.value ?? 0;

  const CATEGORIES = [
    "All Categories",
    "Technology",
    "Lifestyle",
    "Business",
    "Education",
    "Entertainment",
    "Health & Wellness",
    "Finance",
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "All Categories" || p.niche === category;
    return matchesSearch && matchesCategory;
  });

  /* ── Empty state: no projects at all ─ */
  if (!isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSpend={false} />
        <main className="mx-auto max-w-full px-6 py-8">
          <EmptyStateHero />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSpend={false} />

      <main className="mx-auto max-w-full px-6 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-xl text-foreground/70">
              Create engaging videos powered by AI in minutes
            </p>
          </div>
          <Link
            href="/projects/new"
            className="px-4 py-2.5 bg-brand-black rounded-full flex items-center gap-2 text-brand-off-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <SparkleIcon size={20} weight="regular" />
            <span>Create New Project</span>
          </Link>
        </div>
        /{/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Projects"
            value={projects.length}
            change="+18.5%"
            changeSuffix={`+${projects.length} this week`}
            bars={totalBars}
            accentColor="teal"
          />
          <StatCard
            label="Active Projects"
            value={inProgressCount}
            change="+2 new today"
            changeSuffix="3 currently rendering"
            bars={inProgressBars}
            chartType="area"
            gradientDirection="horizontal"
            accentColor="teal"
          />
          <StatCard
            label="Total Spend"
            value={`$${Math.round(totalCost)}`}
            change={`${todaySpend.toFixed(0)} today`}
            changeSuffix={`+$${Math.round(totalCost)} this week`}
            bars={spendBars}
            chartType="area"
            gradientDirection="vertical"
            accentColor="teal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-foreground">
            Recent Projects
          </h2>
          <p className="text-base text-foreground/70">
            Track progress, continue generation, or view completed videos from
            your latest projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2.5 bg-brand-surface rounded-full border border-brand-border-light flex items-center gap-2">
            <MagnifyingGlassIcon size={20} className="text-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setCategoryOpen((v) => !v)}
              className="px-4 py-2.5 bg-brand-surface rounded-full border border-brand-border-light flex items-center justify-between gap-2 min-w-44"
            >
              <span className="text-sm text-foreground">{category}</span>
              <CaretDownIcon size={20} className="text-foreground" />
            </button>
            {categoryOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#FAF9F5] rounded-xl shadow-lg border border-brand-border-light p-2 z-30 flex flex-col gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setCategoryOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 rounded-lg ${
                      category === cat
                        ? "bg-[#F0EEE7] font-medium text-foreground"
                        : "text-foreground hover:bg-[#F0EEE7]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isLoading && (
          <p className="text-muted-foreground py-16 text-center">
            Loading projects...
          </p>
        )}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-brand-beige py-16 text-center">
            <p className="mb-2 text-foreground/70">No projects yet.</p>
            <p className="text-sm text-foreground/50">
              Click <strong>Create New Project</strong> to get started.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              category={project.niche}
              status={getProjectCardStatus(project.status)}
              cost={project.totalCostUsd ?? 0}
              date={new Date(project.updatedAt).toLocaleDateString()}
              currentStep={getProjectStep(project.status)}
              completedSteps={getCompletedSteps(project.status)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
