import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import type { Scene } from "@/lib/api";
import type { SceneFlowNode } from "../types";

const IMAGE_NODE_WIDTH = 240;
const ANIMATION_NODE_WIDTH = 180;
const GAP_X = 0; // Gap within a scene (around animation node)
const SCENE_GAP_X = 40; // Gap between different scenes
const Y_CENTER = 40;
const IMAGE_NODE_HEIGHT_LANDSCAPE = 135; // 240 * (9/16) for 16:9 aspect ratio
const IMAGE_NODE_HEIGHT_PORTRAIT = 427; // 240 * (16/9) for 9:16 aspect ratio

export function useSceneFlowLayout(
  scenes: Scene[],
  projectId: string,
  videoProvider: string = "kling",
  platform?: string,
): { nodes: SceneFlowNode[]; edges: Edge[] } {
  return useMemo(() => {
    const nodes: SceneFlowNode[] = [];
    const edges: Edge[] = [];
    let xCursor = 0;
    const isSeDance = videoProvider === "seedance";

    // Adjust gap based on platform aspect ratio
    const isPortrait = platform === "instagram" || platform === "tiktok";
    const startEndGap = isPortrait ? 100 : 120;
    const imageNodeHeight = isPortrait ? IMAGE_NODE_HEIGHT_PORTRAIT : IMAGE_NODE_HEIGHT_LANDSCAPE;
    const verticalGap = isPortrait ? 140 : 120; // Gap between image nodes and animation node

    scenes.forEach((scene, i) => {
      const startFrame =
        (scene.frames ?? []).find((f) => f.frameType === "start") ?? null;
      const endFrame =
        (scene.frames ?? []).find((f) => f.frameType === "end") ?? null;

      const startNodeX = xCursor;

      // Start image node
      const startNodeId = `scene-${scene.id}-start`;
      nodes.push({
        id: startNodeId,
        type: "imageFrame",
        position: { x: startNodeX, y: Y_CENTER },
        data: {
          scene,
          frame: startFrame,
          frameType: "start" as const,
          projectId,
          platform,
        },
        draggable: false,
      });

      // End image node position (close to start)
      const endNodeX = startNodeX + IMAGE_NODE_WIDTH + startEndGap;

      // Animation node centered between start and end, positioned below
      const animNodeId = `scene-${scene.id}-anim`;
      const animCenterX = startNodeX + (endNodeX - startNodeX + IMAGE_NODE_WIDTH) / 2 - ANIMATION_NODE_WIDTH / 2;
      nodes.push({
        id: animNodeId,
        type: "animation",
        position: {
          x: animCenterX,
          y: Y_CENTER + imageNodeHeight + verticalGap,
        },
        data: {
          scene,
          clip: scene.clip ?? null,
          motionNotes: scene.motionNotes ?? scene.animationNotes ?? "",
          projectId,
          platform,
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

      // The last node for this scene — determines what connects to the next scene
      let lastNodeId: string;

      if (isSeDance) {
        // SeDance: no end frame node, animation connects directly to next scene
        lastNodeId = animNodeId;
        xCursor = endNodeX; // Move cursor to where end would have been
      } else {
        // Veo / Kling: end image node
        const endNodeId = `scene-${scene.id}-end`;
        nodes.push({
          id: endNodeId,
          type: "imageFrame",
          position: { x: endNodeX, y: Y_CENTER },
          data: {
            scene,
            frame: endFrame,
            frameType: "end" as const,
            projectId,
            platform,
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
        xCursor = endNodeX + IMAGE_NODE_WIDTH;
        lastNodeId = endNodeId;
      }

      // Edge to next scene's start node
      if (i < scenes.length - 1) {
        const nextScene = scenes[i + 1];
        const nextStartId = `scene-${nextScene.id}-start`;
        edges.push({
          id: `e-${lastNodeId}-${nextStartId}`,
          source: lastNodeId,
          target: nextStartId,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 1.5 },
        });
        xCursor += SCENE_GAP_X;
      }
    });

    return { nodes, edges };
  }, [scenes, projectId, videoProvider, platform]);
}
