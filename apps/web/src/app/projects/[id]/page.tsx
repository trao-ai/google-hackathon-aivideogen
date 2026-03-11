"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type ProjectDetail } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCost } from "@/lib/utils";
import { TopicsTab } from "./_tabs/TopicsTab";
import { ResearchTab } from "./_tabs/ResearchTab";
import { ScriptsTab } from "./_tabs/ScriptsTab";
import { VoiceTab } from "./_tabs/VoiceTab";
import { ScenesTab } from "./_tabs/ScenesTab";
import { CostsTab } from "./_tabs/CostsTab";

const TABS = [
  "Topics",
  "Research",
  "Scripts",
  "Voice",
  "Scenes",
  "Costs",
] as const;
type Tab = (typeof TABS)[number];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Topics");
  const [autoNavigated, setAutoNavigated] = useState(false);
  const [error, setError] = useState("");

  const loadProject = useCallback(async () => {
    try {
      const data = await api.projects.get(id);
      setProject(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Auto-navigate to the right tab based on project status
  useEffect(() => {
    if (!project || autoNavigated) return;
    const status = project.status;
    if (["research_done", "scripting", "script_selected"].includes(status)) {
      setActiveTab("Scripts");
    } else if (["researching", "topic_selected"].includes(status)) {
      setActiveTab("Research");
    } else if (["voicing", "voice_done", "tts_failed"].includes(status)) {
      setActiveTab("Voice");
    } else if (["scene_planning", "scene_planned", "rendering"].includes(status)) {
      setActiveTab("Scenes");
    }
    setAutoNavigated(true);
  }, [project, autoNavigated]);

  useEffect(() => {
    void loadProject();
    const interval = setInterval(() => void loadProject(), 8_000);
    return () => clearInterval(interval);
  }, [loadProject]);

  const handleDelete = async () => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await api.projects.delete(id);
    router.push("/");
  };

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-800">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-800">{project.title}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.title}
              </h1>
              <p className="text-sm text-gray-500">{project.niche}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={project.status} />
              <span className="text-sm text-gray-500">
                {formatCost(project.totalCostUsd ?? 0)}
              </span>
              <button
                onClick={handleDelete}
                className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-white px-6">
        <div className="mx-auto max-w-7xl">
          <nav className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === "Topics" && (
          <TopicsTab project={project} onRefresh={loadProject} />
        )}
        {activeTab === "Research" && (
          <ResearchTab project={project} onRefresh={loadProject} />
        )}
        {activeTab === "Scripts" && (
          <ScriptsTab project={project} onRefresh={loadProject} />
        )}
        {activeTab === "Voice" && (
          <VoiceTab project={project} onRefresh={loadProject} />
        )}
        {activeTab === "Scenes" && (
          <ScenesTab project={project} onRefresh={loadProject} />
        )}
        {activeTab === "Costs" && <CostsTab projectId={id} />}
      </main>
    </div>
  );
}
