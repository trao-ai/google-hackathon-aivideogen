"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Scene } from "@/lib/api";
import { useRegenerateFrame, useGenerateVideo, useGenerateSceneFrames } from "@/hooks/use-scenes";
import { ImageFrameNode } from "./nodes/ImageFrameNode";
import { AnimationNode } from "./nodes/AnimationNode";
import { FrameEditPanel } from "./panels/FrameEditPanel";
import { AnimationEditPanel } from "./panels/AnimationEditPanel";
import { SceneFlowContext } from "./SceneFlowContext";
import { useSceneFlowLayout } from "./hooks/useSceneFlowLayout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  imageFrame: ImageFrameNode,
  animation: AnimationNode,
};

interface Props {
  projectId: string;
  scenes: Scene[];
  videoProvider?: string;
}

export function SceneFlowEditor({ projectId, scenes, videoProvider = "kling" }: Props) {
  const { nodes, edges } = useSceneFlowLayout(scenes, projectId, videoProvider);
  const regenerateFrame = useRegenerateFrame(projectId);
  const generateVideo = useGenerateVideo(projectId);
  const generateSceneFrames = useGenerateSceneFrames(projectId);

  const [editingFrame, setEditingFrame] = useState<{
    sceneId: string;
    frameId: string;
    prompt: string;
    imageUrl?: string;
  } | null>(null);
  const [editingAnimation, setEditingAnimation] = useState<string | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(
    new Set(),
  );

  const addRegenerating = useCallback((id: string) => {
    setRegeneratingIds((prev) => new Set([...prev, id]));
  }, []);

  const removeRegenerating = useCallback((id: string) => {
    setRegeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const onRegenerateFrame = useCallback(
    async (sceneId: string, frameId: string) => {
      addRegenerating(frameId);
      try {
        await regenerateFrame.mutateAsync({ sceneId, frameId });
        setTimeout(() => removeRegenerating(frameId), 3000);
      } catch {
        removeRegenerating(frameId);
      }
    },
    [regenerateFrame, addRegenerating, removeRegenerating],
  );

  const onEditFrame = useCallback(
    (sceneId: string, frameId: string, currentPrompt: string) => {
      const scene = scenes.find((s) => s.id === sceneId);
      const frame = scene?.frames?.find((f) => f.id === frameId);
      setEditingFrame({
        sceneId,
        frameId,
        prompt: currentPrompt,
        imageUrl: frame?.imageUrl,
      });
    },
    [scenes],
  );

  const onEditAnimation = useCallback((sceneId: string) => {
    setEditingAnimation(sceneId);
  }, []);

  const onGenerateVideo = useCallback(
    async (sceneId: string) => {
      addRegenerating(`video-${sceneId}`);
      try {
        await generateVideo.mutateAsync(sceneId);
        setTimeout(() => removeRegenerating(`video-${sceneId}`), 5000);
      } catch {
        removeRegenerating(`video-${sceneId}`);
      }
    },
    [generateVideo, addRegenerating, removeRegenerating],
  );

  const onGenerateSceneFrames = useCallback(
    async (sceneId: string) => {
      addRegenerating(`frames-${sceneId}`);
      try {
        await generateSceneFrames.mutateAsync(sceneId);
        setTimeout(() => removeRegenerating(`frames-${sceneId}`), 3000);
      } catch {
        removeRegenerating(`frames-${sceneId}`);
      }
    },
    [generateSceneFrames, addRegenerating, removeRegenerating],
  );

  const contextValue = useMemo(
    () => ({
      onRegenerateFrame,
      onEditFrame,
      onEditAnimation,
      onGenerateVideo,
      onGenerateSceneFrames,
      regeneratingIds,
      videoProvider,
    }),
    [
      onRegenerateFrame,
      onEditFrame,
      onEditAnimation,
      onGenerateVideo,
      onGenerateSceneFrames,
      regeneratingIds,
      videoProvider,
    ],
  );

  const editingScene = editingAnimation
    ? scenes.find((s) => s.id === editingAnimation)
    : null;

  return (
    <SceneFlowContext.Provider value={contextValue}>
      <div className="h-[500px] w-full rounded-lg border bg-gray-50 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          panOnScroll
          zoomOnScroll={false}
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) =>
              node.type === "animation" ? "#e0e7ff" : "#f1f5f9"
            }
          />
        </ReactFlow>
      </div>

      {editingFrame && (
        <FrameEditPanel
          projectId={projectId}
          sceneId={editingFrame.sceneId}
          frameId={editingFrame.frameId}
          currentPrompt={editingFrame.prompt}
          imageUrl={editingFrame.imageUrl}
          onClose={() => setEditingFrame(null)}
        />
      )}

      {editingScene && (
        <AnimationEditPanel
          projectId={projectId}
          scene={editingScene}
          onClose={() => setEditingAnimation(null)}
        />
      )}
    </SceneFlowContext.Provider>
  );
}
