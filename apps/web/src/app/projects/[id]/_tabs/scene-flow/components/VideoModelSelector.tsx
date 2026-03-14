"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VIDEO_MODELS = [
  // Direct providers (Google API / fal.ai)
  {
    value: "veo",
    label: "Veo (Direct)",
    description: "2 frames \u00b7 8s clip \u00b7 $0.35/s",
  },
  {
    value: "kling",
    label: "Kling (fal.ai)",
    description: "2 frames \u00b7 5s clip \u00b7 $0.07/s",
  },
  {
    value: "seedance",
    label: "SeDance (fal.ai)",
    description: "1 frame \u00b7 5s clip \u00b7 $0.07/s",
  },
  // Replicate providers
  {
    value: "replicate-veo",
    label: "Veo 2 (Replicate)",
    description: "1 frame \u00b7 8s clip \u00b7 ~$0.065/s",
  },
  {
    value: "replicate-kling",
    label: "Kling 2.1 (Replicate)",
    description: "2 frames \u00b7 5-10s clip \u00b7 ~$0.06/s",
  },
  {
    value: "replicate-seedance",
    label: "Seedance Pro (Replicate)",
    description: "1 frame \u00b7 5-10s clip \u00b7 ~$0.05/s",
  },
  {
    value: "replicate-seedance-lite",
    label: "Seedance Lite (Replicate)",
    description: "1 frame \u00b7 5-10s clip \u00b7 ~$0.02/s",
  },
] as const;

interface Props {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VideoModelSelector({
  projectId,
  value,
  onChange,
  disabled,
}: Props) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (newValue: string) => {
    if (newValue === value) return;
    setSaving(true);
    try {
      await api.projects.update(projectId, { videoProvider: newValue });
      onChange(newValue);
    } catch (err) {
      console.error("Failed to update video provider:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Video Model:
      </span>
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || saving}
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
