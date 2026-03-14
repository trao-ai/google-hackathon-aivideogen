"use client";

import { createContext, useContext } from "react";

export interface SceneFlowContextValue {
  onRegenerateFrame: (sceneId: string, frameId: string) => Promise<void>;
  onEditFrame: (
    sceneId: string,
    frameId: string,
    currentPrompt: string,
  ) => void;
  onEditAnimation: (sceneId: string) => void;
  onGenerateVideo: (sceneId: string) => Promise<void>;
  onGenerateSceneFrames: (sceneId: string) => Promise<void>;
  regeneratingIds: Set<string>;
  videoProvider: string;
}

export const SceneFlowContext = createContext<SceneFlowContextValue>({
  onRegenerateFrame: async () => {},
  onEditFrame: () => {},
  onEditAnimation: () => {},
  onGenerateVideo: async () => {},
  onGenerateSceneFrames: async () => {},
  regeneratingIds: new Set(),
  videoProvider: "kling",
});

export function useSceneFlow() {
  return useContext(SceneFlowContext);
}
