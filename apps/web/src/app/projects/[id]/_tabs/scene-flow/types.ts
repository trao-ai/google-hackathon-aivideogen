import type { Node } from "@xyflow/react";
import type { Scene, SceneFrame, SceneClip } from "@/lib/api";

export interface ImageFrameNodeData {
  scene: Scene;
  frame: SceneFrame | null;
  frameType: "start" | "end";
  projectId: string;
  [key: string]: unknown;
}

export interface AnimationNodeData {
  scene: Scene;
  clip: SceneClip | null;
  motionNotes: string;
  projectId: string;
  [key: string]: unknown;
}

// Use generic Node type to avoid strict constraint issues
export type SceneFlowNode = Node;

/** Convert legacy local:/// URLs to API-served URLs */
export function resolveMediaUrl(url: string): string {
  if (url.startsWith("local:///")) {
    const filePath = url.replace("local:///", "");
    const fileName = filePath.split("/").pop() ?? filePath;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    return `${apiBase}/api/storage/${fileName}`;
  }
  return url;
}
