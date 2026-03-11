"use client";

import { useEffect, useState } from "react";
import { api, type CostSummary } from "@/lib/api";
import { formatCost } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  projectId: string;
}

export function CostsTab({ projectId }: Props) {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.costs
      .get(projectId)
      .then(setSummary)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <p className="text-sm text-gray-500">Loading costs…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cost Breakdown</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCost(summary.total)}</p>
          </CardContent>
        </Card>
        {summary.costPerFinishedMinute !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">
                Cost / Finished Minute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCost(summary.costPerFinishedMinute)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.breakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No cost events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2">Stage</th>
                  <th className="pb-2 text-right">Events</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.breakdown.map((row) => (
                  <tr key={row.stage} className="border-b last:border-0">
                    <td className="py-2 capitalize">
                      {row.stage.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 text-right text-gray-500">
                      {row.eventCount}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatCost(row.totalCostUsd)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="pt-3">Total</td>
                  <td />
                  <td className="pt-3 text-right">
                    {formatCost(summary.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
