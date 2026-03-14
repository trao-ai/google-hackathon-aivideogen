"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/api";
import { formatCost } from "@/lib/utils";
import { TopicDiscovery } from "@/components/TopicDiscovery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/layout/Header";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      setError((err as Error).message);
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

  return (
    <div className="min-h-screen bg-background">
      <Header totalSpend={totalCost} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{projects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {
                  projects.filter(
                    (p) =>
                      !["draft", "complete"].includes(p.status) &&
                      !p.status.includes("failed"),
                  ).length
                }
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCost(totalCost)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Project list */}
        {loading && <p className="text-gray-500">Loading projects…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
            <p className="mb-4 text-gray-500">No projects yet.</p>
            <p className="text-sm text-gray-400">
              Click <strong>✦ New Project</strong> to discover today&apos;s viral topics.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {project.title}
                    </CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{project.niche}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatCost(project.totalCostUsd ?? 0)}</span>
                    <span>
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
