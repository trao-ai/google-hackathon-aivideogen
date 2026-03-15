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
    value: "veo",
    label: "Veo 3.1 (Direct)",
    description: "2 frames \u00b7 8s clip \u00b7 $0.40/s",
  },
  {
    value: "kling",
    label: "Kling (fal.ai)",
    description: "2 frames \u00b7 5s clip \u00b7 $0.07/s",
  },
  {
    value: "seedance",
    label: "SeDance (fal.ai)",
    description: "1 frame \u00b7 5s clip \u00b7 $0.052/s",
  },
  {
    value: "replicate-veo",
    label: "Veo 3.1 (Replicate)",
    description: "1 frame \u00b7 8s clip \u00b7 ~$0.10/s",
  },
  {
    value: "replicate-kling",
    label: "Kling 2.1 (Replicate)",
    description: "2 frames \u00b7 5-10s clip \u00b7 ~$0.05/s",
  },
  {
    value: "replicate-seedance",
    label: "Seedance 1.5 Pro (Replicate)",
    description: "2 frames \u00b7 5-10s clip \u00b7 ~$0.25/s",
  },
  {
    value: "replicate-seedance-lite",
    label: "Seedance Lite (Replicate)",
    description: "1 frame \u00b7 5-10s clip \u00b7 ~$0.02/s",
  },
] as const;

interface Props {
  projectId: string;
  disabled?: boolean;
}

export function VideoModelSelector({ projectId, disabled }: Props) {
  const { videoProvider, setVideoProvider } = useProjectStore();
  const updateProject = useUpdateProject(projectId);

  const handleChange = (newValue: string) => {
    if (newValue === videoProvider) return;
    setVideoProvider(newValue);
    updateProject.mutate({ videoProvider: newValue });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Video Model:
      </span>
      <Select
        value={videoProvider}
        onValueChange={handleChange}
        disabled={disabled || updateProject.isPending}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIDEO_MODELS.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              <div className="flex flex-col">
                <span>{model.label}</span>
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
