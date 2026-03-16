"use client";

import { useUpdateProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VIDEO_MODELS = [
  {
    value: "replicate-veo",
    label: "Veo 3.1",
    frames: 1,
    duration: "8s",
    cost: "$0.065/s",
  },
  {
    value: "kling",
    label: "Kling 2.1",
    frames: 2,
    duration: "5s",
    cost: "$0.07/s",
  },
  {
    value: "replicate-kling",
    label: "Kling 2.1",
    frames: 2,
    duration: "5-10s",
    cost: "$0.06/s",
  },
  {
    value: "replicate-seedance",
    label: "Seedance Pro",
    frames: 1,
    duration: "5-10s",
    cost: "$0.05/s",
  },
  {
    value: "replicate-seedance-lite",
    label: "Seedance Lite",
    frames: 1,
    duration: "5-10s",
    cost: "$0.02/s",
  },
] as const;

interface Props {
  projectId: string;
  disabled?: boolean;
}

export function VideoModelSelector({ projectId, disabled }: Props) {
  const { videoProvider, setVideoProvider } = useProjectStore();
  const updateProject = useUpdateProject(projectId);

  // Set default to replicate-veo if not set
  const currentValue = videoProvider || "replicate-veo";

  const handleChange = (newValue: string) => {
    if (newValue === currentValue) return;
    setVideoProvider(newValue);
    updateProject.mutate({ videoProvider: newValue });
  };

  return (
    <Select
      value={currentValue}
      onValueChange={handleChange}
      disabled={disabled || updateProject.isPending}
    >
      <SelectTrigger className="w-[300px] px-4 py-2.5 bg-brand-surface rounded-md border border-brand-border-light text-sm text-foreground hover:bg-[#F0EEE7] transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
        <SelectValue placeholder="Select Video Model" />
      </SelectTrigger>
      <SelectContent className="bg-[#FAF9F5] rounded-xl shadow-lg border border-brand-border-light p-2 min-w-[380px] focus:outline-none focus-visible:outline-none">
        {VIDEO_MODELS.map((model, index) => (
          <SelectItem
            key={model.value}
            value={model.value}
            className={`px-4 py-2.5 rounded-lg text-sm text-foreground hover:bg-[#F0EEE7] data-[highlighted]:bg-[#F0EEE7] data-[highlighted]:text-foreground data-[state=checked]:bg-[#F0EEE7] data-[state=checked]:font-medium cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:outline-none ${index < VIDEO_MODELS.length - 1 ? "mb-1" : ""}`}
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="font-medium whitespace-nowrap">
                {model.label}
              </span>
              <span className="text-foreground/60 whitespace-nowrap">
                ({model.frames} frames • {model.duration} clip • {model.cost})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
