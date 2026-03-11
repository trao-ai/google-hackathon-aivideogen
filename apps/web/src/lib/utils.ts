import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function statusColor(status: string): string {
  if (status.includes("failed")) return "text-red-600 bg-red-50";
  if (
    [
      "complete",
      "approved",
      "frames_done",
      "voice_done",
      "research_done",
    ].includes(status)
  )
    return "text-green-700 bg-green-50";
  if (["draft", "pending"].includes(status)) return "text-gray-600 bg-gray-100";
  return "text-blue-700 bg-blue-50";
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
