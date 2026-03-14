"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MonitorPlayIcon,
  GitBranchIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  CaretDownIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { api, type Project } from "@/lib/api";
import { formatCost } from "@/lib/utils";
import {
  getProjectStep,
  getCompletedSteps,
  getProjectCardStatus,
} from "@/lib/pipeline";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-1",
    title: "AI Replacing Jobs in 2026",
    niche: "Technology & Future",
    status: "researching",
    totalCostUsd: 0,
    createdAt: "2026-03-11T00:00:00Z",
    updatedAt: "2026-03-11T00:00:00Z",
  },
  {
    id: "mock-2",
    title: "AI Replacing Jobs in 2026",
    niche: "Motivation & Lifestyle",
    status: "complete",
    totalCostUsd: 3.42,
    createdAt: "2026-03-11T00:00:00Z",
    updatedAt: "2026-03-11T00:00:00Z",
  },
  {
    id: "mock-3",
    title: "AI Replacing Jobs in 2026",
    niche: "Motivation & Lifestyle",
    status: "complete",
    totalCostUsd: 3.42,
    createdAt: "2026-03-11T00:00:00Z",
    updatedAt: "2026-03-11T00:00:00Z",
  },
  {
    id: "mock-4",
    title: "AI Replacing Jobs in 2026",
    niche: "Technology",
    status: "complete",
    totalCostUsd: 4.12,
    createdAt: "2026-03-11T00:00:00Z",
    updatedAt: "2026-03-11T00:00:00Z",
  },
];

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data.length > 0 ? data : MOCK_PROJECTS);
    } catch {
      // API unavailable — use mock data for development
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    const interval = setInterval(() => void loadProjects(), 10_000);
    return () => clearInterval(interval);
  }, [loadProjects]);

  const totalCost = projects.reduce((acc, p) => acc + (p.totalCostUsd ?? 0), 0);
  const inProgressCount = projects.filter(
    (p) =>
      !["draft", "complete"].includes(p.status) && !p.status.includes("failed"),
  ).length;

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Header totalSpend={totalCost} />

      <main className="mx-auto max-w-full px-6 py-8 flex flex-col gap-5">
        {/* Welcome + Create */}
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

        {/* Stats Row */}
        <div className="flex">
          <StatCard
            label="Total Projects"
            value={projects.length}
            icon={
              <MonitorPlayIcon
                size={42}
                weight="regular"
                className="text-foreground"
              />
            }
            position="first"
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            icon={
              <GitBranchIcon
                size={42}
                weight="regular"
                className="text-foreground"
              />
            }
            position="middle"
          />
          <StatCard
            label="Total Spend"
            value={formatCost(totalCost)}
            icon={
              <CurrencyDollarIcon
                size={42}
                weight="regular"
                className="text-foreground"
              />
            }
            position="last"
          />
        </div>

        {/* Recent Projects Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-foreground">
            Recent Projects
          </h2>
          <p className="text-base text-foreground/70">
            Track progress, continue generation, or view completed videos from
            your latest projects.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2.5 bg-brand-off-white/50 rounded-full border border-brand-beige flex items-center gap-2">
            <MagnifyingGlassIcon size={20} className="text-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <button className="px-4 py-2.5 bg-brand-off-white/50 rounded-full border border-brand-beige flex items-center justify-between gap-2 min-w-44">
            <span className="text-sm text-foreground">All Categories</span>
            <CaretDownIcon size={20} className="text-foreground" />
          </button>
        </div>

        {/* Project Grid */}
        {loading && (
          <p className="text-muted-foreground py-16 text-center">
            Loading projects...
          </p>
        )}
        {!loading && filteredProjects.length === 0 && (
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
