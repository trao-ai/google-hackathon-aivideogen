import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import type { Scene } from "@/lib/api";
import type { SceneFlowNode } from "../types";

const IMAGE_NODE_WIDTH = 240;
const ANIMATION_NODE_WIDTH = 160;
const GAP_X = 40;
const Y_CENTER = 60;
const IMAGE_NODE_HEIGHT = 200;
const ANIMATION_NODE_HEIGHT = 120;

export function useSceneFlowLayout(
  scenes: Scene[],
  projectId: string,
): { nodes: SceneFlowNode[]; edges: Edge[] } {
  return useMemo(() => {
    const nodes: SceneFlowNode[] = [];
    const edges: Edge[] = [];
    let xCursor = 0;

    scenes.forEach((scene, i) => {
      const startFrame =
        (scene.frames ?? []).find((f) => f.frameType === "start") ?? null;
      const endFrame =
        (scene.frames ?? []).find((f) => f.frameType === "end") ?? null;

      // Start image node
      const startNodeId = `scene-${scene.id}-start`;
      nodes.push({
        id: startNodeId,
        type: "imageFrame",
        position: { x: xCursor, y: Y_CENTER },
        data: {
          scene,
          frame: startFrame,
          frameType: "start" as const,
          projectId,
        },
        draggable: false,
      });
      xCursor += IMAGE_NODE_WIDTH + GAP_X;

      // Animation node
      const animNodeId = `scene-${scene.id}-anim`;
      nodes.push({
        id: animNodeId,
        type: "animation",
        position: {
          x: xCursor,
          y: Y_CENTER + (IMAGE_NODE_HEIGHT - ANIMATION_NODE_HEIGHT) / 2,
        },
        data: {
          scene,
          clip: scene.clip ?? null,
          motionNotes: scene.motionNotes ?? scene.animationNotes ?? "",
          projectId,
        },
        draggable: false,
      });
      edges.push({
        id: `e-${startNodeId}-${animNodeId}`,
        source: startNodeId,
        target: animNodeId,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      });
      xCursor += ANIMATION_NODE_WIDTH + GAP_X;

      // End image node
      const endNodeId = `scene-${scene.id}-end`;
      nodes.push({
        id: endNodeId,
        type: "imageFrame",
        position: { x: xCursor, y: Y_CENTER },
        data: {
          scene,
          frame: endFrame,
          frameType: "end" as const,
          projectId,
        },
        draggable: false,
      });
      edges.push({
        id: `e-${animNodeId}-${endNodeId}`,
        source: animNodeId,
        target: endNodeId,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      });
      xCursor += IMAGE_NODE_WIDTH;

      // Edge to next scene's start node
      if (i < scenes.length - 1) {
        const nextScene = scenes[i + 1];
        const nextStartId = `scene-${nextScene.id}-start`;
        edges.push({
          id: `e-${endNodeId}-${nextStartId}`,
          source: endNodeId,
          target: nextStartId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 1.5 },
        });
        xCursor += GAP_X * 2;
      }
    });

    return { nodes, edges };
  }, [scenes, projectId]);
}
