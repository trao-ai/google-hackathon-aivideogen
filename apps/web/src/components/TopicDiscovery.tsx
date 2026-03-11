"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Topic {
  title: string;
  hook: string;
  category: string;
  viralityScore: number;
  educationalScore: number;
  visualScore: number;
  thumbnailAngle: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Science: "bg-blue-100 text-blue-700",
  Technology: "bg-purple-100 text-purple-700",
  Psychology: "bg-pink-100 text-pink-700",
  Nature: "bg-green-100 text-green-700",
  History: "bg-amber-100 text-amber-700",
  Society: "bg-orange-100 text-orange-700",
  Space: "bg-indigo-100 text-indigo-700",
  Health: "bg-teal-100 text-teal-700",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-gray-500">{label}</span>
      <div className="flex-1 rounded-full bg-gray-100 h-1.5">
        <div
          className="h-1.5 rounded-full bg-indigo-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium text-gray-700">{value}</span>
    </div>
  );
}

function TopicCard({
  topic,
  onSelect,
  selecting,
}: {
  topic: Topic;
  onSelect: (t: Topic) => void;
  selecting: boolean;
}) {
  const colorClass =
    CATEGORY_COLORS[topic.category] ?? "bg-gray-100 text-gray-700";
  const avg = Math.round(
    (topic.viralityScore + topic.educationalScore + topic.visualScore) / 3,
  );

  return (
    <button
      onClick={() => onSelect(topic)}
      disabled={selecting}
      className="group relative w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Score badge */}
      <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
        {avg}
      </div>

      {/* Category pill */}
      <span
        className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
      >
        {topic.category}
      </span>

      {/* Title */}
      <h3 className="mb-2 pr-10 text-sm font-semibold leading-snug text-gray-900 group-hover:text-indigo-700">
        {topic.title}
      </h3>

      {/* Hook */}
      <p className="mb-4 text-xs leading-relaxed text-gray-500">{topic.hook}</p>

      {/* Scores */}
      <div className="space-y-1.5">
        <ScoreBar label="Viral" value={topic.viralityScore} />
        <ScoreBar label="Edu" value={topic.educationalScore} />
        <ScoreBar label="Visual" value={topic.visualScore} />
      </div>

      {/* Thumbnail angle */}
      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
        🖼 {topic.thumbnailAngle}
      </div>
    </button>
  );
}

type Phase = "idle" | "scanning" | "topics" | "creating";

const SCAN_MESSAGES = [
  "Scanning Reddit for viral stories…",
  "Reading Hacker News top posts…",
  "Pulling Google Trends signals…",
  "Analysing virality potential…",
  "Ranking by visual storytelling fit…",
  "Picking the best 8 for you…",
];

export function TopicDiscovery({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [signalCount, setSignalCount] = useState(0);
  const [scanMsg, setScanMsg] = useState(SCAN_MESSAGES[0]);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);

  const startDiscovery = async () => {
    setPhase("scanning");
    setError("");

    // Cycle through scan messages while waiting
    let idx = 0;
    const msgTimer = setInterval(() => {
      idx = (idx + 1) % SCAN_MESSAGES.length;
      setScanMsg(SCAN_MESSAGES[idx]);
    }, 1800);

    try {
      const res = await fetch(`${API}/api/discover`, { method: "POST" });
      clearInterval(msgTimer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message ?? "Discovery failed");
      }
      const data = await res.json();
      setTopics(data.topics ?? []);
      setSignalCount(data.signalCount ?? 0);
      setPhase("topics");
    } catch (err) {
      clearInterval(msgTimer);
      setError((err as Error).message);
      setPhase("idle");
    }
  };

  const selectTopic = async (topic: Topic) => {
    setSelecting(true);
    setPhase("creating");
    try {
      const res = await fetch(`${API}/api/discover/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topic),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message ?? "Failed to create project");
      }
      const { projectId } = await res.json();
      onDone?.();
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError((err as Error).message);
      setSelecting(false);
      setPhase("topics");
    }
  };

  // ── IDLE ──
  if (phase === "idle") {
    return (
      <div className="text-center">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={startDiscovery}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
        >
          <span className="text-lg">✦</span> New Project
        </button>
      </div>
    );
  }

  // ── SCANNING ──
  if (phase === "scanning") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center gap-6">
          {/* Animated pulse rings */}
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 animate-ping rounded-full bg-indigo-200 opacity-60" />
            <div className="absolute h-16 w-16 animate-ping rounded-full bg-indigo-300 opacity-60 [animation-delay:0.3s]" />
            <div className="relative h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl">
              🌐
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">Finding viral topics</p>
            <p className="mt-2 text-sm text-gray-500 transition-all">{scanMsg}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── CREATING PROJECT ──
  if (phase === "creating") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mb-4" />
        <p className="text-lg font-semibold text-gray-800">Creating your project…</p>
      </div>
    );
  }

  // ── TOPICS ──
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Today&apos;s Viral Topics
            </h2>
            <p className="text-sm text-gray-500">
              Discovered from {signalCount} live signals · Reddit, HN, Google Trends · Pick one to start
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={startDiscovery}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => setPhase("idle")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Topic grid */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic, i) => (
            <TopicCard
              key={i}
              topic={topic}
              onSelect={selectTopic}
              selecting={selecting}
            />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          Click any topic to create your project and move to the next step
        </p>
      </div>
    </div>
  );
}
