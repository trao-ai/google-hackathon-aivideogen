"use client";

import { useState } from "react";
import { api, type ProjectDetail, type Script, type ScriptSection } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  project: ProjectDetail;
  onRefresh: () => Promise<void>;
}

function formatDurationSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function ScriptsTab({ project, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [rewritingSection, setRewritingSection] = useState<string | null>(null);
  const [rewriteInstructions, setRewriteInstructions] = useState("");
  const [duration, setDuration] = useState<"short" | "long">("short");

  const scripts: Script[] = project.scripts ?? [];
  const isScripting = project.status === "scripting";
  const hasResearch = (project.researchBriefs ?? []).length > 0;

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      await api.scripts.generate(project.id, { duration });
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (scriptId: string) => {
    setLoading(true);
    try {
      await api.scripts.approve(project.id, scriptId);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scriptId: string) => {
    if (!confirm("Delete this script? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api.scripts.delete(project.id, scriptId);
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async (scriptId: string, sectionId: string) => {
    if (!rewriteInstructions.trim()) return;
    setLoading(true);
    try {
      await api.scripts.rewriteSection(project.id, scriptId, {
        sectionId,
        instructions: rewriteInstructions,
      });
      setRewritingSection(null);
      setRewriteInstructions("");
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Script</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 transition-colors ${duration === "short" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setDuration("short")}
              disabled={loading || isScripting}
            >
              Short (~1 min)
            </button>
            <button
              className={`px-3 py-1.5 transition-colors ${duration === "long" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setDuration("long")}
              disabled={loading || isScripting}
            >
              Long (4-5 min)
            </button>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || isScripting || !hasResearch}
            title={!hasResearch ? "Complete research first" : undefined}
          >
            {isScripting ? "Generating…" : loading ? "Working…" : scripts.length > 0 ? "Re-Generate" : "Generate Script"}
          </Button>
        </div>
      </div>

      {!hasResearch && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Complete research before generating a script.
        </p>
      )}

      {isScripting && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          <p className="text-sm text-indigo-700">Writing {duration === "short" ? "~1 minute short-form" : "4-5 minute"} script…</p>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {scripts.length === 0 && !isScripting && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500 text-sm">No script yet.</p>
          <p className="text-gray-400 text-xs mt-1">Select duration and click &quot;Generate Script&quot; to create a voiceover script.</p>
        </div>
      )}

      <div className="space-y-4">
        {scripts.map((script) => {
          const wordCount = script.fullText ? script.fullText.split(/\s+/).length : 0;
          const title = script.titleCandidates?.[0] ?? "Untitled Script";
          const isSelected = script.id === project.selectedScriptId;
          return (
            <Card key={script.id} className={isSelected ? "ring-2 ring-indigo-500" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-snug">{title}</CardTitle>
                    <p className="mt-1 text-xs text-gray-500">
                      {wordCount.toLocaleString()} words · {formatDurationSec(script.estimatedDurationSec)} estimated
                      {isSelected && <span className="ml-2 text-indigo-600 font-medium">Selected</span>}
                    </p>
                    {script.outline && (
                      <p className="mt-1 text-[11px] text-gray-400 font-mono truncate">{script.outline}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={script.status} />
                    {script.status === "draft" && (
                      <Button size="sm" onClick={() => handleApprove(script.id)} disabled={loading}>
                        Approve
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(script.id)}
                      disabled={loading}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <button
                  className="mt-2 text-left text-xs text-indigo-600 hover:underline"
                  onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                >
                  {expandedScript === script.id ? "Hide sections" : `Show ${script.sections?.length ?? 0} sections`}
                </button>
              </CardHeader>

              {expandedScript === script.id && script.sections && (
                <CardContent className="space-y-3 pt-0">
                  {script.sections.map((section: ScriptSection) => (
                    <div key={section.id} className="rounded-lg border bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {section.sectionType.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ~{Math.round(section.estimatedDurationSec)}s
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{section.text}</p>
                      {isSelected && (
                        <div className="mt-2">
                          {rewritingSection === section.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={rewriteInstructions}
                                onChange={(e) => setRewriteInstructions(e.target.value)}
                                placeholder="Rewrite instructions, e.g. 'Make it more conversational'"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleRewrite(script.id, section.id)} disabled={loading}>
                                  Apply
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setRewritingSection(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-indigo-600 hover:underline"
                              onClick={() => { setRewritingSection(section.id); setRewriteInstructions(""); }}
                            >
                              Rewrite section
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
