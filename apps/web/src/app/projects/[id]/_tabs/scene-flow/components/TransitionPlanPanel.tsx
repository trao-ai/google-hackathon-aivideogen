"use client";

import { useState } from "react";
import { api, type Scene } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

interface Props {
  projectId: string;
  scenes: Scene[];
  onRefresh: () => Promise<void>;
}

export function TransitionPlanPanel({ projectId, scenes, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlanTransitions = async () => {
    setError("");
    setLoading(true);
    try {
      await api.scenes.planTransitions(projectId);
      // Poll for completion
      setTimeout(async () => {
        await onRefresh();
        setLoading(false);
      }, 5000);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  // Build scene pairs (scene[i] -> scene[i+1])
  const pairs = scenes.slice(0, -1).map((scene, i) => ({
    from: scene,
    to: scenes[i + 1],
    plan: scene.transitionPlan,
  }));

  const hasAnyPlan = pairs.some((p) => p.plan);

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Transition Plans
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlanTransitions}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Planning...
            </>
          ) : hasAnyPlan ? (
            "Re-plan Transitions"
          ) : (
            "Plan Transitions"
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {pairs.map(({ from, to, plan }) => (
          <div
            key={`${from.id}-${to.id}`}
            className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-gray-700 min-w-[60px]">
              Scene {(from.orderIndex ?? from.order ?? 0) + 1}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-700 min-w-[60px]">
              Scene {(to.orderIndex ?? to.order ?? 0) + 1}
            </span>

            {plan ? (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-700 font-medium">
                  {plan.ffmpegTransition}
                </span>
                <span className="text-gray-500">{plan.durationSec}s</span>
                {plan.direction && (
                  <span className="text-gray-400">{plan.direction}</span>
                )}
              </div>
            ) : (
              <span className="ml-auto text-xs text-gray-400 italic">
                Not planned
              </span>
            )}
          </div>
        ))}
      </div>

      {pairs.length === 0 && (
        <p className="text-xs text-gray-400">
          Need at least 2 scenes to plan transitions.
        </p>
      )}
    </div>
  );
}
