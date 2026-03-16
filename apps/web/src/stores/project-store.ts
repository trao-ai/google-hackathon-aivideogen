import { create } from "zustand";
import type { PipelineStep } from "@/types/components";

interface ProjectUIState {
  activeStep: PipelineStep;
  videoProvider: string;
  autoNavigated: boolean;
  setActiveStep: (step: PipelineStep) => void;
  setVideoProvider: (provider: string) => void;
  setAutoNavigated: (value: boolean) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectUIState>((set) => ({
  activeStep: "topic",
  videoProvider: "replicate-veo",
  autoNavigated: false,
  setActiveStep: (step) => set({ activeStep: step }),
  setVideoProvider: (provider) => set({ videoProvider: provider }),
  setAutoNavigated: (value) => set({ autoNavigated: value }),
  reset: () =>
    set({ activeStep: "topic", videoProvider: "replicate-veo", autoNavigated: false }),
}));
