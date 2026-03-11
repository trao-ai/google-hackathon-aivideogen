"use client";

import { useState } from "react";
import { api, type ProjectDetail, type ResearchBrief } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-green-700 bg-green-50 border-green-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  low: "text-orange-700 bg-orange-50 border-orange-200",
};

export function ResearchTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartResearch = async () => {
    setError("");
    setLoading(true);
    try {
      await api.research.start(project.id);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrief = async (briefId: string) => {
    if (!confirm("Delete this research brief? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api.research.delete(project.id, briefId);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const briefs: ResearchBrief[] = project.researchBriefs ?? [];
  const brief = briefs[0];
  const isResearching = project.status === "researching";
  const hasApprovedTopic = !!project.selectedTopicId;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Deep Research</h2>
          {brief && (
            <p className="text-xs text-gray-500 mt-0.5">
              {brief.sources?.length ?? 0} sources · confidence {Math.round((brief.confidenceScore ?? 0) * 100)}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {brief && (
            <button
              onClick={() => handleDeleteBrief(brief.id)}
              disabled={loading}
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              Delete
            </button>
          )}
          <Button
            onClick={handleStartResearch}
            disabled={loading || isResearching || !hasApprovedTopic}
            title={!hasApprovedTopic ? "Approve a topic first" : undefined}
          >
            {isResearching ? "Researching…" : loading ? "Working…" : brief ? "Re-Research" : "Start Research"}
          </Button>
        </div>
      </div>

      {!hasApprovedTopic && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Approve a topic on the Topics tab before starting research.
        </p>
      )}

      {isResearching && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          <p className="text-sm text-indigo-700">Searching OpenAlex, Semantic Scholar, Wikipedia, CrossRef…</p>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {!brief && !isResearching && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500 text-sm">No research yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click &quot;Start Research&quot; to deep-dive into scholarly sources.</p>
        </div>
      )}

      {brief && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{brief.summary}</p>
            </CardContent>
          </Card>

          {/* Background + Current Developments */}
          {(brief.background || brief.currentDevelopments) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {brief.background && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900">Historical Context</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-gray-700">{brief.background}</p>
                  </CardContent>
                </Card>
              )}
              {brief.currentDevelopments && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900">Latest Developments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-gray-700">{brief.currentDevelopments}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Key Facts */}
          {brief.claims?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Key Facts ({brief.claims.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brief.claims.map((claim, i) => {
                    const text = claim.fact ?? claim.text ?? "";
                    const confidence = claim.confidence ?? "medium";
                    return (
                      <li key={i} className={`rounded-lg border px-3 py-2 text-xs ${CONFIDENCE_COLOR[confidence] ?? CONFIDENCE_COLOR.medium}`}>
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 font-bold uppercase text-[10px] tracking-wide opacity-70">
                            {confidence}
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </div>
                        {claim.source && (
                          <p className="mt-1 opacity-60 text-[10px]">— {claim.source}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Story Angles */}
          {brief.storyAngles?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Story Angles ({brief.storyAngles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brief.storyAngles.map((angle, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="shrink-0 text-indigo-400 font-bold">{i + 1}.</span>
                      <span className="leading-relaxed">{angle}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Controversies + Stakes */}
          {(brief.controversies || brief.stakes) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {brief.controversies && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-orange-700">Controversies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-orange-800">{brief.controversies}</p>
                  </CardContent>
                </Card>
              )}
              {brief.stakes && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-blue-700">Why It Matters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-blue-800">{brief.stakes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Sources */}
          {brief.sources?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Sources ({brief.sources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {brief.sources.map((src, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        src.type === "paper"
                          ? "bg-blue-100 text-blue-700"
                          : src.type === "wiki"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {src.type}
                      </span>
                      <div className="min-w-0">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-indigo-600 hover:underline line-clamp-1"
                        >
                          {src.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          {src.year && <span className="text-[10px] text-gray-400">{src.year}</span>}
                          {src.credibility && (
                            <span className={`text-[10px] font-medium ${
                              src.credibility === "high" ? "text-green-600" : src.credibility === "medium" ? "text-yellow-600" : "text-orange-600"
                            }`}>
                              {src.credibility} credibility
                            </span>
                          )}
                        </div>
                        {src.keyContribution && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{src.keyContribution}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
